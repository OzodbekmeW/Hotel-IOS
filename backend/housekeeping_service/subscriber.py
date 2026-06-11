"""
Redis Pub/Sub subscriber for the housekeeping service.

Listens on CHANNEL_ROOM_VACATED.  When a room is vacated (guest checked
out) the room number is appended to the local cleaning queue so that
housekeeping staff know which rooms need attention.
"""

from __future__ import annotations

import asyncio
import json
import logging

import redis.asyncio as aioredis

from shared.events import CHANNEL_ROOM_STATUS_CHANGED, CHANNEL_ROOM_VACATED
from shared.redis_client import get_pubsub_redis

from .data import cleaning_queue, room_statuses

logger = logging.getLogger(__name__)


async def _handle_room_vacated(payload: dict) -> None:
    """Process a room-vacated event by queuing the room for cleaning.

    Args:
        payload: Event payload containing at least "room_number".
    """
    room_number: str = payload.get("room_number", "")
    if not room_number:
        logger.warning("Received room_vacated event with missing room_number")
        return

    if room_number not in cleaning_queue:
        cleaning_queue.append(room_number)
        if room_number in room_statuses:
            room_statuses[room_number]["status"] = "DIRTY"
        logger.info("Room %s added to cleaning queue (queue depth: %d)", room_number, len(cleaning_queue))
    else:
        logger.debug("Room %s already in cleaning queue, skipping duplicate", room_number)


async def _handle_status_changed(payload: dict) -> None:
    """Sync the local status projection when another service updates a room.

    Args:
        payload: Event payload containing "room_number" and "status".
    """
    room_number = payload.get("room_number", "")
    new_status = payload.get("status", "")
    if room_number in room_statuses and new_status:
        room_statuses[room_number]["status"] = new_status
        logger.debug("Local status for room %s updated to %s", room_number, new_status)


_HANDLERS = {
    CHANNEL_ROOM_VACATED:       _handle_room_vacated,
    CHANNEL_ROOM_STATUS_CHANGED: _handle_status_changed,
}


async def _dispatch(message: dict) -> None:
    """Route a received Pub/Sub message to the appropriate handler.

    Args:
        message: Raw message dict from redis-py pubsub.listen().
    """
    try:
        envelope = json.loads(message["data"])
        event_type: str = envelope.get("event_type", "")
        payload: dict = envelope.get("payload", {})
        handler = _HANDLERS.get(event_type)
        if handler:
            await handler(payload)
        else:
            logger.debug("No handler for event_type '%s'", event_type)
    except (json.JSONDecodeError, KeyError) as exc:
        logger.error("Failed to parse Pub/Sub message: %s | raw=%s", exc, message)


async def start_subscriber() -> None:
    """Subscribe to hotel channels and process messages indefinitely.

    Reconnects automatically after transient Redis failures.
    """
    while True:
        try:
            r: aioredis.Redis = await get_pubsub_redis()
            pubsub = r.pubsub()
            await pubsub.subscribe(CHANNEL_ROOM_VACATED, CHANNEL_ROOM_STATUS_CHANGED)
            logger.info("Housekeeping subscriber listening on channels: %s, %s",
                        CHANNEL_ROOM_VACATED, CHANNEL_ROOM_STATUS_CHANGED)

            async for message in pubsub.listen():
                if message["type"] == "message":
                    await _dispatch(message)

        except aioredis.RedisError as exc:
            logger.error("Subscriber Redis error: %s — reconnecting in 5 s", exc)
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            logger.info("Housekeeping subscriber cancelled, shutting down")
            break
        except Exception as exc:
            logger.exception("Unexpected subscriber error: %s — reconnecting in 5 s", exc)
            await asyncio.sleep(5)
