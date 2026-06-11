"""
Redis Pub/Sub subscriber for the room-service service.

Listens for CHANNEL_GUEST_CHECKED_OUT so that we can log guest departures.
Order history is intentionally retained after checkout for auditing.
"""

from __future__ import annotations

import asyncio
import json
import logging

import redis.asyncio as aioredis

from shared.events import CHANNEL_GUEST_CHECKED_OUT
from shared.redis_client import get_pubsub_redis

logger = logging.getLogger(__name__)


async def _handle_guest_checked_out(payload: dict) -> None:
    """Log that a guest has checked out.

    Args:
        payload: Event payload containing guest_id and room_number.
    """
    guest_id = payload.get("guest_id", "unknown")
    room_number = payload.get("room_number", "unknown")
    logger.info(
        "Guest '%s' checked out of room %s — order history retained",
        guest_id,
        room_number,
    )


_HANDLERS = {
    CHANNEL_GUEST_CHECKED_OUT: _handle_guest_checked_out,
}


async def start_subscriber() -> None:
    """Subscribe to checkout events and handle them indefinitely.

    Reconnects automatically after transient Redis failures.
    """
    while True:
        try:
            r: aioredis.Redis = await get_pubsub_redis()
            pubsub = r.pubsub()
            await pubsub.subscribe(CHANNEL_GUEST_CHECKED_OUT)
            logger.info(
                "Room-service subscriber listening on: %s",
                CHANNEL_GUEST_CHECKED_OUT,
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
                "Room-service subscriber Redis error: %s — reconnecting in 5 s", exc
            )
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            logger.info("Room-service subscriber cancelled")
            break
        except Exception as exc:
            logger.exception("Unexpected subscriber error: %s", exc)
            await asyncio.sleep(5)
