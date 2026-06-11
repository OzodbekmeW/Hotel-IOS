"""
Redis Pub/Sub subscriber for the maintenance service.

Listens for CHANNEL_ROOM_STATUS_CHANGED and logs every room status
transition for operational awareness.
"""

from __future__ import annotations

import asyncio
import json
import logging

import redis.asyncio as aioredis

from shared.events import CHANNEL_ROOM_STATUS_CHANGED
from shared.redis_client import get_pubsub_redis

logger = logging.getLogger(__name__)


async def _handle_status_changed(payload: dict) -> None:
    """Log a room status change event.

    Args:
        payload: Event payload with room_number and status.
    """
    room_number = payload.get("room_number", "unknown")
    status = payload.get("status", "unknown")
    logger.info(
        "Room %s status changed to %s",
        room_number,
        status,
    )


_HANDLERS = {
    CHANNEL_ROOM_STATUS_CHANGED: _handle_status_changed,
}


async def start_subscriber() -> None:
    """Subscribe to room-status events and process them indefinitely.

    Reconnects automatically after transient Redis failures.
    """
    while True:
        try:
            r: aioredis.Redis = await get_pubsub_redis()
            pubsub = r.pubsub()
            await pubsub.subscribe(CHANNEL_ROOM_STATUS_CHANGED)
            logger.info(
                "Maintenance subscriber listening on: %s",
                CHANNEL_ROOM_STATUS_CHANGED,
            )

            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    envelope = json.loads(message["data"])
                    handler = _HANDLERS.get(envelope.get("event_type", ""))
                    if handler:
                        await handler(envelope.get("payload", {}))
                except (json.JSONDecodeError, KeyError) as exc:
                    logger.error("Failed to parse Pub/Sub message: %s", exc)

        except aioredis.RedisError as exc:
            logger.error(
                "Maintenance subscriber Redis error: %s — reconnecting in 5 s", exc
            )
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            logger.info("Maintenance subscriber cancelled")
            break
        except Exception as exc:
            logger.exception("Unexpected subscriber error: %s", exc)
            await asyncio.sleep(5)
