"""
Async Redis connection factory and event-publishing helpers.

All services import `get_redis` and `publish_event` from this module so
that the connection URL is defined in exactly one place.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")


async def get_redis() -> aioredis.Redis:
    """Create a short-lived Redis client for command execution (publish, get, set).

    Returns:
        An authenticated, decode_responses=True Redis client.

    Raises:
        redis.RedisError: If the connection cannot be established.
    """
    return await aioredis.from_url(
        REDIS_URL,
        decode_responses=True,
        socket_connect_timeout=5,
    )


async def get_pubsub_redis() -> aioredis.Redis:
    """Create a long-lived Redis client for Pub/Sub subscriptions.

    Pub/Sub connections must NOT have a socket_timeout because they
    stay open indefinitely waiting for messages.  A timeout would cause
    the listen() loop to raise RedisError every few seconds even when
    no messages arrive.

    Returns:
        A decode_responses=True Redis client with no socket timeout.
    """
    return await aioredis.from_url(
        REDIS_URL,
        decode_responses=True,
        socket_timeout=None,
        socket_connect_timeout=5,
        socket_keepalive=True,
    )


async def publish_event(channel: str, payload: dict) -> None:
    """Publish a structured event envelope to a Redis Pub/Sub channel.

    The envelope format is:
        {
            "event_type": channel,
            "timestamp":  "<UTC ISO-8601>",
            "payload":    payload
        }

    Args:
        channel: Redis channel name (use constants from shared.events).
        payload: Arbitrary serialisable dict of event data.

    Raises:
        redis.RedisError: Re-raised after logging if the publish fails.
    """
    r: aioredis.Redis = await get_redis()
    try:
        envelope: dict = {
            "event_type": channel,
            "timestamp": datetime.utcnow().isoformat(),
            "payload": payload,
        }
        message: str = json.dumps(envelope)
        await r.publish(channel, message)
        logger.info("Published event '%s' → %s", channel, payload)
    except aioredis.RedisError:
        logger.exception("Failed to publish event on channel '%s'", channel)
        raise
    finally:
        await r.aclose()
