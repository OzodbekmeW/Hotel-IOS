"""
HTTP route handlers for the housekeeping service.

Endpoints:
    POST /clean/start/{room_number}    – Begin cleaning a room.
    POST /clean/complete/{room_number} – Mark a room as clean.
    GET  /queue                        – Return the current cleaning queue.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import redis.asyncio as aioredis
from fastapi import APIRouter, HTTPException

from shared.events import CHANNEL_ROOM_STATUS_CHANGED
from shared.redis_client import publish_event

from .data import cleaning_queue, room_statuses

logger = logging.getLogger(__name__)
router = APIRouter()

VALID_ROOM_NUMBERS: frozenset[str] = frozenset({
    "101", "102", "103", "104", "105",
    "201", "202", "203", "204", "205",
})


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_room(room_number: str) -> None:
    """Raise 404 if the room number is not part of the hotel inventory.

    Args:
        room_number: Three-digit identifier to validate.

    Raises:
        HTTPException 404: Room not found.
    """
    if room_number not in VALID_ROOM_NUMBERS:
        raise HTTPException(status_code=404, detail=f"Room '{room_number}' not found")


async def _publish_status(room_number: str, status: str) -> None:
    """Publish a CHANNEL_ROOM_STATUS_CHANGED event.

    Args:
        room_number: Room whose status changed.
        status:      New status string.

    Raises:
        HTTPException 503: Redis unavailable.
    """
    try:
        await publish_event(
            CHANNEL_ROOM_STATUS_CHANGED,
            {"room_number": room_number, "status": status},
        )
    except aioredis.RedisError as exc:
        logger.error("Redis publish error for room %s: %s", room_number, exc)
        raise HTTPException(status_code=503, detail="Message broker unavailable")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/clean/start/{room_number}", status_code=200)
async def start_cleaning(room_number: str) -> dict[str, Any]:
    """Mark a room as currently being cleaned.

    Args:
        room_number: Three-digit room identifier.

    Returns:
        Confirmation dict with room_number and new status.

    Raises:
        HTTPException 404: Room not found.
        HTTPException 503: Redis unavailable.
    """
    _validate_room(room_number)

    if room_number in room_statuses:
        room_statuses[room_number]["status"] = "CLEANING"

    logger.info("Cleaning started for room %s", room_number)
    await _publish_status(room_number, "CLEANING")

    return {"room_number": room_number, "status": "CLEANING", "message": "Cleaning started"}


@router.post("/clean/complete/{room_number}", status_code=200)
async def complete_cleaning(room_number: str) -> dict[str, Any]:
    """Mark a room as clean after housekeeping finishes.

    Updates the local status, records last_cleaned_at, removes the room
    from the cleaning queue, and publishes a status-changed event.

    Args:
        room_number: Three-digit room identifier.

    Returns:
        Confirmation dict with room_number, status, and cleaned timestamp.

    Raises:
        HTTPException 404: Room not found.
        HTTPException 503: Redis unavailable.
    """
    _validate_room(room_number)

    cleaned_at = datetime.utcnow()
    if room_number in room_statuses:
        room_statuses[room_number]["status"] = "CLEAN"
        room_statuses[room_number]["last_cleaned_at"] = cleaned_at.isoformat()

    if room_number in cleaning_queue:
        cleaning_queue.remove(room_number)
        logger.info("Room %s removed from cleaning queue (remaining: %d)", room_number, len(cleaning_queue))

    logger.info("Cleaning completed for room %s at %s", room_number, cleaned_at.isoformat())
    await _publish_status(room_number, "CLEAN")

    return {
        "room_number": room_number,
        "status": "CLEAN",
        "last_cleaned_at": cleaned_at.isoformat(),
        "message": "Room marked as clean",
    }


@router.get("/queue", status_code=200)
async def get_cleaning_queue() -> dict[str, Any]:
    """Return the current list of rooms awaiting or undergoing cleaning.

    Returns:
        Dict with queue list and current depth.
    """
    return {"cleaning_queue": list(cleaning_queue), "depth": len(cleaning_queue)}
