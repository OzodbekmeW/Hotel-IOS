"""
Billing calculation for the reception service checkout flow.

The single public function `calculate_bill` produces a detailed bill dict
from a guest's stay data.  It is a pure function with no side effects.
"""

from __future__ import annotations

import logging
import math
from datetime import datetime
from typing import Any

from shared.models import Guest, Room, RoomType

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

ROOM_RATES: dict[RoomType, float] = {
    RoomType.SINGLE:     80.0,
    RoomType.DOUBLE:    120.0,
    RoomType.SUITE:     250.0,
    RoomType.ACCESSIBLE: 90.0,
}

MIN_NIGHTS: int = 1
SECONDS_PER_DAY: int = 86_400
DISCOUNT_THRESHOLD_NIGHTS: int = 7
DISCOUNT_RATE: float = 0.10


# ── Helpers ───────────────────────────────────────────────────────────────────

def _calculate_nights(check_in_time: datetime) -> int:
    """Compute the number of billable nights from check-in to now.

    Minimum is MIN_NIGHTS (1) to handle same-day early checkouts.

    Args:
        check_in_time: UTC datetime of guest check-in.

    Returns:
        Integer number of nights, at least MIN_NIGHTS.
    """
    stay_seconds = (datetime.utcnow() - check_in_time).total_seconds()
    raw_nights = math.ceil(stay_seconds / SECONDS_PER_DAY)
    return max(MIN_NIGHTS, raw_nights)


def _sum_service_charges(charges: list[dict]) -> float:
    """Total all accumulated service charges for a guest.

    Each entry in `charges` must have an "amount" key.  Missing or
    non-numeric values are skipped with a warning.

    Args:
        charges: List of charge dicts from Guest.charges.

    Returns:
        Sum of all valid charge amounts as a float.
    """
    total = 0.0
    for charge in charges:
        try:
            total += float(charge.get("amount", 0))
        except (TypeError, ValueError):
            logger.warning("Skipping invalid charge entry: %s", charge)
    return total


def _apply_room_discount(room_total: float, nights: int) -> tuple[float, float]:
    """Apply the long-stay discount to the room subtotal if eligible.

    A 10% discount on the room cost only is applied when the stay is
    at least DISCOUNT_THRESHOLD_NIGHTS nights.

    Args:
        room_total: Undiscounted room subtotal.
        nights: Number of billable nights.

    Returns:
        Tuple of (discounted_room_total, discount_amount).
    """
    if nights >= DISCOUNT_THRESHOLD_NIGHTS:
        discount_amount = round(room_total * DISCOUNT_RATE, 2)
        return round(room_total - discount_amount, 2), discount_amount
    return room_total, 0.0


# ── Public API ────────────────────────────────────────────────────────────────

def calculate_bill(guest: Guest, room: Room) -> dict[str, Any]:
    """Generate a complete itemised bill for a departing guest.

    Steps:
    1. Calculate billable nights (minimum 1).
    2. Compute room subtotal using ROOM_RATES.
    3. Apply 10 % long-stay discount on room cost if nights >= 7.
    4. Sum all accumulated service charges.
    5. Compute grand total.

    Args:
        guest: The Guest object at time of checkout.
        room:  The Room the guest occupied.

    Returns:
        Dict containing: guest_id, room_number, nights, room_rate_per_night,
        room_total, discount_applied, service_charges, grand_total.
    """
    rate_per_night = ROOM_RATES[room.room_type]
    nights = _calculate_nights(guest.check_in_time)

    raw_room_total = round(rate_per_night * nights, 2)
    room_total, discount_applied = _apply_room_discount(raw_room_total, nights)
    service_charges = round(_sum_service_charges(guest.charges), 2)
    grand_total = round(room_total + service_charges, 2)

    bill: dict[str, Any] = {
        "guest_id":           guest.guest_id,
        "guest_name":         guest.name,
        "room_number":        room.room_number,
        "room_type":          room.room_type.value,
        "nights":             nights,
        "room_rate_per_night": rate_per_night,
        "room_total":         room_total,
        "discount_applied":   discount_applied,
        "service_charges":    service_charges,
        "grand_total":        grand_total,
    }

    logger.info(
        "Bill calculated for guest '%s': nights=%d, room_total=%.2f, "
        "discount=%.2f, services=%.2f, grand_total=%.2f",
        guest.guest_id, nights, room_total, discount_applied,
        service_charges, grand_total,
    )
    return bill
