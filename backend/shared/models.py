"""
Shared Pydantic v2 data models used across all HotelOS microservices.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class RoomType(str, Enum):
    """Enumeration of available room categories."""

    SINGLE = "SINGLE"
    DOUBLE = "DOUBLE"
    SUITE = "SUITE"
    ACCESSIBLE = "ACCESSIBLE"


class RoomStatus(str, Enum):
    """Lifecycle states a hotel room can be in."""

    CLEAN = "CLEAN"
    DIRTY = "DIRTY"
    CLEANING = "CLEANING"
    MAINTENANCE = "MAINTENANCE"
    OCCUPIED = "OCCUPIED"


class UrgencyLevel(str, Enum):
    """Priority levels for maintenance requests."""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"


class OrderStatus(str, Enum):
    """Lifecycle states for room-service orders."""

    RECEIVED = "RECEIVED"
    PREPARING = "PREPARING"
    DELIVERING = "DELIVERING"
    DELIVERED = "DELIVERED"


class Room(BaseModel):
    """Represents a physical hotel room and its current state.

    Attributes:
        room_number: Three-digit identifier, e.g. "101".
        floor: Floor number the room is on.
        room_type: Category of the room.
        status: Current operational status.
        last_cleaned_at: UTC timestamp of the last completed cleaning.
        current_guest_id: ID of the guest currently occupying the room.
        proximity: Positional hint relative to building features.
    """

    room_number: str = Field(..., pattern=r"^\d{3}$")
    floor: int = Field(..., ge=1)
    room_type: RoomType
    status: RoomStatus
    last_cleaned_at: datetime
    current_guest_id: Optional[str] = None
    proximity: str  # "near_elevator" | "near_stairs" | "middle"


class Guest(BaseModel):
    """Represents a hotel guest from check-in to checkout.

    Attributes:
        guest_id: UUID4 string generated at check-in.
        name: Full name of the guest.
        room_type_requested: Room category the guest booked.
        floor_preference: Preferred floor number (optional).
        proximity_preference: Preferred proximity setting (optional).
        check_in_time: UTC timestamp of check-in.
        room_number: Assigned room (set after check-in).
        charges: Accumulated service charges during the stay.
    """

    guest_id: str
    name: str = Field(..., min_length=2, max_length=100)
    room_type_requested: RoomType
    floor_preference: Optional[int] = None
    proximity_preference: Optional[str] = None
    check_in_time: datetime
    room_number: Optional[str] = None
    charges: List[dict] = Field(default_factory=list)


class MaintenanceRequest(BaseModel):
    """Represents a maintenance issue reported in the hotel.

    Attributes:
        request_id: UUID4 string generated at creation.
        room_number: Room where the issue was reported.
        description: Human-readable description of the problem.
        urgency: Priority level that governs queue ordering.
        created_at: UTC timestamp of report creation.
        assigned_technician: Name of the technician assigned.
        resolved: Whether the issue has been resolved.
    """

    request_id: str
    room_number: str = Field(..., pattern=r"^\d{3}$")
    description: str = Field(..., min_length=5)
    urgency: UrgencyLevel
    created_at: datetime
    assigned_technician: Optional[str] = None
    resolved: bool = False


class RoomOrder(BaseModel):
    """Represents a room-service order placed by a guest.

    Attributes:
        order_id: UUID4 string generated at creation.
        room_number: Room that placed the order.
        items: List of ordered items with name, price, and quantity.
        status: Current fulfillment status.
        created_at: UTC timestamp when the order was placed.
        total: Pre-calculated order total in USD.
    """

    order_id: str
    room_number: str = Field(..., pattern=r"^\d{3}$")
    items: List[dict]  # [{name: str, price: float, quantity: int}]
    status: OrderStatus
    created_at: datetime
    total: float = Field(..., ge=0.0)
