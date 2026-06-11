"""
In-memory data store for the room-service service.
"""

from __future__ import annotations

from shared.models import RoomOrder

# order_id → RoomOrder (all orders, active and delivered)
orders: dict[str, RoomOrder] = {}

VALID_ROOMS: frozenset[str] = frozenset({
    "101", "102", "103", "104", "105",
    "201", "202", "203", "204", "205",
})
