"""
In-memory hotel data store for the reception service.

This module is the single source of truth for room and guest state within
the reception service process.  All other services maintain their own
projected copies, kept in sync via Redis Pub/Sub events.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta

from shared.models import Room, RoomStatus, RoomType

# ── Helper ───────────────────────────────────────────────────────────────────

def _ago(hours: int = 0, minutes: int = 0) -> datetime:
    """Return a UTC datetime offset into the past by the given amount.

    Args:
        hours:   Number of hours to subtract.
        minutes: Number of minutes to subtract.

    Returns:
        UTC datetime representing the past moment.
    """
    return datetime.utcnow() - timedelta(hours=hours, minutes=minutes)


# ── Room registry ─────────────────────────────────────────────────────────────
# 10 rooms across 2 floors.  last_cleaned_at offsets are staggered so that
# the assignment algorithm's "longest clean first" ordering is exercisable.

rooms: dict[str, Room] = {
    # ── Floor 1 ──────────────────────────────────────────────────────────────
    "101": Room(
        room_number="101",
        floor=1,
        room_type=RoomType.SINGLE,
        status=RoomStatus.CLEAN,
        last_cleaned_at=_ago(hours=5),
        proximity="near_elevator",
    ),
    "102": Room(
        room_number="102",
        floor=1,
        room_type=RoomType.SINGLE,
        status=RoomStatus.CLEAN,
        last_cleaned_at=_ago(hours=3),
        proximity="near_stairs",
    ),
    "103": Room(
        room_number="103",
        floor=1,
        room_type=RoomType.DOUBLE,
        status=RoomStatus.CLEAN,
        last_cleaned_at=_ago(hours=8),
        proximity="middle",
    ),
    "104": Room(
        room_number="104",
        floor=1,
        room_type=RoomType.DOUBLE,
        status=RoomStatus.CLEAN,
        last_cleaned_at=_ago(hours=1),
        proximity="near_elevator",
    ),
    "105": Room(
        room_number="105",
        floor=1,
        room_type=RoomType.SUITE,
        status=RoomStatus.CLEAN,
        last_cleaned_at=_ago(hours=12),
        proximity="near_stairs",
    ),
    # ── Floor 2 ──────────────────────────────────────────────────────────────
    "201": Room(
        room_number="201",
        floor=2,
        room_type=RoomType.SINGLE,
        status=RoomStatus.CLEAN,
        last_cleaned_at=_ago(hours=6),
        proximity="near_elevator",
    ),
    "202": Room(
        room_number="202",
        floor=2,
        room_type=RoomType.ACCESSIBLE,
        status=RoomStatus.CLEAN,
        last_cleaned_at=_ago(hours=2),
        proximity="near_stairs",
    ),
    "203": Room(
        room_number="203",
        floor=2,
        room_type=RoomType.DOUBLE,
        status=RoomStatus.CLEAN,
        last_cleaned_at=_ago(hours=10),
        proximity="middle",
    ),
    "204": Room(
        room_number="204",
        floor=2,
        room_type=RoomType.DOUBLE,
        status=RoomStatus.CLEAN,
        last_cleaned_at=_ago(hours=4),
        proximity="near_elevator",
    ),
    "205": Room(
        room_number="205",
        floor=2,
        room_type=RoomType.SUITE,
        status=RoomStatus.CLEAN,
        last_cleaned_at=_ago(hours=9),
        proximity="near_stairs",
    ),
}

# ── Guest registry ────────────────────────────────────────────────────────────
guests: dict[str, object] = {}  # guest_id → Guest (imported at runtime)

# ── Concurrency guard ────────────────────────────────────────────────────────
# Protects the assign_room + room-status mutation sequence from races when
# multiple simultaneous check-in requests arrive.
assignment_lock: asyncio.Lock = asyncio.Lock()
