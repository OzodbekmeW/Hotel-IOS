"""
Local state store for the housekeeping service.

This service maintains its own projected copy of room statuses derived
from Redis Pub/Sub events.  It is intentionally decoupled from the
reception service's data store.
"""

from __future__ import annotations

from datetime import datetime

# room_number → {"status": str, "last_cleaned_at": datetime}
room_statuses: dict[str, dict] = {
    "101": {"status": "CLEAN", "last_cleaned_at": None},
    "102": {"status": "CLEAN", "last_cleaned_at": None},
    "103": {"status": "CLEAN", "last_cleaned_at": None},
    "104": {"status": "CLEAN", "last_cleaned_at": None},
    "105": {"status": "CLEAN", "last_cleaned_at": None},
    "201": {"status": "CLEAN", "last_cleaned_at": None},
    "202": {"status": "CLEAN", "last_cleaned_at": None},
    "203": {"status": "CLEAN", "last_cleaned_at": None},
    "204": {"status": "CLEAN", "last_cleaned_at": None},
    "205": {"status": "CLEAN", "last_cleaned_at": None},
}

# FIFO queue of room numbers pending cleaning (populated by Redis subscriber).
cleaning_queue: list[str] = []
