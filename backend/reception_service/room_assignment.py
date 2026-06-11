"""
Room assignment algorithm for the reception service.

This module exposes a single pure function `assign_room` that selects the
best available room for a guest based on room type, occupancy status,
floor preference, and proximity preference.  It has no side effects.
"""

from __future__ import annotations

import logging
from typing import Optional

from shared.models import Guest, Room, RoomStatus

logger = logging.getLogger(__name__)


def _filter_clean(rooms: dict[str, Room]) -> list[Room]:
    """Return rooms whose status is CLEAN.

    Args:
        rooms: Full hotel room registry keyed by room_number.

    Returns:
        List of Room objects with status == CLEAN.
    """
    return [r for r in rooms.values() if r.status == RoomStatus.CLEAN]


def _filter_by_type(rooms: list[Room], guest: Guest) -> list[Room]:
    """Narrow the list to rooms matching the guest's requested type.

    Args:
        rooms: Pre-filtered list of clean rooms.
        guest: The guest whose room_type_requested is used for filtering.

    Returns:
        Subset of rooms matching the requested RoomType.
    """
    return [r for r in rooms if r.room_type == guest.room_type_requested]


def _sort_by_last_cleaned(rooms: list[Room]) -> list[Room]:
    """Sort rooms so the longest-uncleaned room comes first.

    Oldest last_cleaned_at (smallest datetime value) means the room has
    been sitting clean for the longest time and should be preferred.

    Args:
        rooms: List of Room objects to sort.

    Returns:
        New list sorted by last_cleaned_at ascending.
    """
    return sorted(rooms, key=lambda r: r.last_cleaned_at)


def _apply_floor_preference(
    rooms: list[Room], floor_preference: Optional[int]
) -> list[Room]:
    """Filter by floor preference with fallback to the full list.

    Args:
        rooms: Sorted list of candidate rooms.
        floor_preference: Desired floor number, or None to skip.

    Returns:
        Floor-filtered list if matches exist, otherwise the original list.
    """
    if floor_preference is None:
        return rooms

    floor_matches = [r for r in rooms if r.floor == floor_preference]
    if floor_matches:
        logger.debug("Floor preference %d matched %d room(s)", floor_preference, len(floor_matches))
        return floor_matches

    logger.debug("No rooms on floor %d; falling back to all floors", floor_preference)
    return rooms


def _apply_proximity_preference(
    rooms: list[Room], proximity_preference: Optional[str]
) -> list[Room]:
    """Prefer rooms matching the guest's proximity preference.

    Args:
        rooms: Current candidate list.
        proximity_preference: Desired proximity string, or None to skip.

    Returns:
        Proximity-filtered list if matches exist, otherwise the original list.
    """
    if proximity_preference is None:
        return rooms

    proximity_matches = [r for r in rooms if r.proximity == proximity_preference]
    if proximity_matches:
        logger.debug("Proximity preference '%s' matched %d room(s)", proximity_preference, len(proximity_matches))
        return proximity_matches

    logger.debug("No rooms with proximity '%s'; ignoring preference", proximity_preference)
    return rooms


def assign_room(guest: Guest, rooms: dict[str, Room]) -> Optional[Room]:
    """Select the best available room for the given guest.

    Algorithm (applied in strict order):
    1. Filter rooms where status == CLEAN.
    2. Filter by room_type == guest.room_type_requested.
    3. If no candidates remain → return None.
    4. Sort by last_cleaned_at ascending (longest clean first).
    5. If floor_preference set → prefer that floor, fallback to all floors.
    6. If proximity_preference set → prefer matching rooms.
    7. Return the first room from the final list.

    Args:
        guest: The guest requesting a room.
        rooms: Full room registry dict (room_number → Room).

    Returns:
        The best matching Room, or None if no room is available.
    """
    clean_rooms = _filter_clean(rooms)
    type_matched = _filter_by_type(clean_rooms, guest)

    if not type_matched:
        logger.warning(
            "No clean rooms of type '%s' available for guest '%s'",
            guest.room_type_requested,
            guest.guest_id,
        )
        return None

    sorted_rooms = _sort_by_last_cleaned(type_matched)
    floor_filtered = _apply_floor_preference(sorted_rooms, guest.floor_preference)
    final_list = _apply_proximity_preference(floor_filtered, guest.proximity_preference)

    selected = final_list[0]
    logger.info(
        "Assigned room %s (type=%s, floor=%d, proximity=%s) to guest '%s'",
        selected.room_number,
        selected.room_type,
        selected.floor,
        selected.proximity,
        guest.guest_id,
    )
    return selected
