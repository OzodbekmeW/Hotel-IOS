"""
Redis Pub/Sub subscriber for the dashboard service.

Subscribes to all hotel channels via psubscribe("hotel:*") and forwards
every received message directly to all connected WebSocket clients.
"""

from __future__ import annotations

import asyncio
import json
import logging

import redis.asyncio as aioredis

from shared.redis_client import get_pubsub_redis

from .ws_manager import manager

logger = logging.getLogger(__name__)

SUBSCRIBE_PATTERN: str = "hotel:*"


async def start_subscriber() -> None:
    """Subscribe to all hotel channels and broadcast to WebSocket clients.

    Uses Redis psubscribe (pattern subscribe) to catch every channel
    whose name starts with "hotel:".  Reconnects on Redis failures.
    """
    while True:
        try:
            r: aioredis.Redis = await get_pubsub_redis()
            pubsub = r.pubsub()
            await pubsub.psubscribe(SUBSCRIBE_PATTERN)
            logger.info(
                "Dashboard subscriber listening on pattern: %s",
                SUBSCRIBE_PATTERN,
            )

            async for message in pubsub.listen():
                if message["type"] not in ("pmessage", "message"):
                    continue

                try:
                    data = json.loads(message["data"])
                    await manager.broadcast(data)
                except (json.JSONDecodeError, TypeError) as exc:
                    logger.error(
                        "Failed to parse Pub/Sub message: %s | raw=%s",
                        exc,
                        message.get("data"),
                    )

        except aioredis.RedisError as exc:
            logger.error(
                "Dashboard subscriber Redis error: %s — reconnecting in 5 s", exc
            )
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            logger.info("Dashboard subscriber cancelled")
            break
        except Exception as exc:
            logger.exception("Unexpected dashboard subscriber error: %s", exc)
            await asyncio.sleep(5)
