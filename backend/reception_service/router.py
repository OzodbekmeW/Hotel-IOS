"""
HTTP route handlers for the reception service.

Endpoints:
    POST /checkin              – Register a new guest and assign a room.
    POST /checkout/{guest_id}  – Check out a guest and return itemised bill.
    GET  /rooms                – List all rooms with current status.
    GET  /rooms/{room_number}  – Retrieve a single room's details.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from uuid import uuid4

import redis.asyncio as aioredis
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from shared.events import (
    CHANNEL_GUEST_CHECKED_IN,
    CHANNEL_GUEST_CHECKED_OUT,
    CHANNEL_ROOM_STATUS_CHANGED,
    CHANNEL_ROOM_VACATED,
)
from shared.models import Guest, Room, RoomStatus, RoomType
from shared.redis_client import publish_event

from .billing import calculate_bill
from .data import assignment_lock, guests, rooms
from .room_assignment import assign_room

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request / Response schemas ────────────────────────────────────────────────

class CheckinRequest(BaseModel):
    """Body for POST /checkin."""

    name: str = Field(..., min_length=2, max_length=100)
    room_type: RoomType
    floor_preference: int | None = None
    proximity_preference: str | None = None


class CheckinResponse(BaseModel):
    """Successful check-in response."""

    guest_id: str
    room_number: str
    floor: int
    room_type: RoomType
    check_in_time: datetime


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_guest(body: CheckinRequest) -> Guest:
    """Construct a new Guest from a checkin request.

    Args:
        body: Validated checkin request body.

    Returns:
        Fully populated Guest with a fresh UUID.
    """
    return Guest(
        guest_id=str(uuid4()),
        name=body.name.strip(),
        room_type_requested=body.room_type,
        floor_preference=body.floor_preference,
        proximity_preference=body.proximity_preference,
        check_in_time=datetime.utcnow(),
    )


async def _publish_checkin_events(guest: Guest, room: Room) -> None:
    """Fire the two Pub/Sub events that follow a successful check-in.

    Args:
        guest: The newly checked-in guest.
        room:  The room that was assigned.
    """
    try:
        await publish_event(
            CHANNEL_GUEST_CHECKED_IN,
            {
                "guest_id": guest.guest_id,
                "name": guest.name,
                "room_number": room.room_number,
                "room_type": room.room_type.value,
            },
        )
        await publish_event(
            CHANNEL_ROOM_STATUS_CHANGED,
            {
                "room_number": room.room_number,
                "status": RoomStatus.OCCUPIED.value,
                "floor": room.floor,
            },
        )
    except aioredis.RedisError as exc:
        logger.error("Redis publish failed during checkin: %s", exc)
        raise HTTPException(status_code=503, detail="Message broker unavailable")


async def _publish_checkout_events(guest: Guest, room: Room) -> None:
    """Fire the two Pub/Sub events that follow a successful checkout.

    Args:
        guest: The guest who just checked out.
        room:  The room that was vacated.
    """
    try:
        await publish_event(
            CHANNEL_GUEST_CHECKED_OUT,
            {
                "guest_id": guest.guest_id,
                "name": guest.name,
                "room_number": room.room_number,
            },
        )
        await publish_event(
            CHANNEL_ROOM_VACATED,
            {
                "room_number": room.room_number,
                "floor": room.floor,
            },
        )
    except aioredis.RedisError as exc:
        logger.error("Redis publish failed during checkout: %s", exc)
        raise HTTPException(status_code=503, detail="Message broker unavailable")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/checkin", response_model=CheckinResponse, status_code=201)
async def checkin(body: CheckinRequest) -> CheckinResponse:
    """Register a new guest and assign the best available room.

    Args:
        body: Validated check-in request.

    Returns:
        CheckinResponse with assigned room details.

    Raises:
        HTTPException 409: No clean room of the requested type is available.
        HTTPException 503: Redis publish failed.
    """
    guest = _build_guest(body)

    async with assignment_lock:
        room = assign_room(guest, rooms)
        if room is None:
            raise HTTPException(
                status_code=409,
                detail=f"No rooms available for requested type '{body.room_type.value}'",
            )

        # Mutate state inside the lock to prevent double-assignment.
        rooms[room.room_number].status = RoomStatus.OCCUPIED
        rooms[room.room_number].current_guest_id = guest.guest_id
        guest.room_number = room.room_number
        guests[guest.guest_id] = guest

    logger.info("Guest '%s' checked in to room %s", guest.guest_id, room.room_number)
    await _publish_checkin_events(guest, rooms[room.room_number])

    return CheckinResponse(
        guest_id=guest.guest_id,
        room_number=room.room_number,
        floor=room.floor,
        room_type=room.room_type,
        check_in_time=guest.check_in_time,
    )


@router.post("/checkout/{guest_id}", status_code=200)
async def checkout(guest_id: str) -> dict[str, Any]:
    """Check out a guest and return their itemised bill.

    Args:
        guest_id: UUID of the guest to check out.

    Returns:
        Complete bill dict from calculate_bill().

    Raises:
        HTTPException 404: Guest not found.
        HTTPException 500: Guest has no associated room.
        HTTPException 503: Redis publish failed.
    """
    guest: Guest | None = guests.get(guest_id)
    if guest is None:
        raise HTTPException(status_code=404, detail=f"Guest '{guest_id}' not found")

    if guest.room_number is None or guest.room_number not in rooms:
        logger.error("Guest '%s' has no valid room association", guest_id)
        raise HTTPException(status_code=500, detail="Internal server error")

    room: Room = rooms[guest.room_number]
    bill = calculate_bill(guest, room)

    rooms[room.room_number].status = RoomStatus.DIRTY
    rooms[room.room_number].current_guest_id = None
    del guests[guest_id]

    logger.info("Guest '%s' checked out from room %s", guest_id, room.room_number)
    await _publish_checkout_events(guest, room)

    return bill


@router.get("/rooms", response_model=list[Room])
async def list_rooms() -> list[Room]:
    """Return the current status of every room in the hotel.

    Returns:
        List of all Room objects.
    """
    return list(rooms.values())


@router.get("/rooms/{room_number}", response_model=Room)
async def get_room(room_number: str) -> Room:
    """Return details for a single room.

    Args:
        room_number: Three-digit room identifier.

    Returns:
        Room object.

    Raises:
        HTTPException 404: Room not found.
    """
    room = rooms.get(room_number)
    if room is None:
        raise HTTPException(status_code=404, detail=f"Room '{room_number}' not found")
    return room


@router.get("/guests", response_model=list[Guest])
async def list_guests() -> list[Guest]:
    """Return all currently checked-in guests.

    Returns:
        List of active Guest objects.
    """
    return list(guests.values())
