"""
Redis Pub/Sub channel name constants shared across all HotelOS services.

Every published message must conform to the envelope schema:
{
    "event_type": "<CHANNEL_CONSTANT>",
    "timestamp":  "<ISO-8601 UTC datetime>",
    "payload":    { ...event-specific fields... }
}
"""

# ── Room lifecycle ───────────────────────────────────────────────────────────
CHANNEL_ROOM_VACATED = "hotel:room:vacated"
"""Fired by reception when a guest checks out; triggers housekeeping."""

CHANNEL_ROOM_STATUS_CHANGED = "hotel:room:status_changed"
"""Fired by any service that mutates a room's operational status."""

# ── Guest lifecycle ──────────────────────────────────────────────────────────
CHANNEL_GUEST_CHECKED_IN = "hotel:guest:checked_in"
"""Fired by reception after a new guest is successfully assigned a room."""

CHANNEL_GUEST_CHECKED_OUT = "hotel:guest:checked_out"
"""Fired by reception after checkout billing is complete."""

# ── Room service orders ──────────────────────────────────────────────────────
CHANNEL_ORDER_STATUS_CHANGED = "hotel:order:status_changed"
"""Fired by room_service_service on every order status transition."""

# ── Maintenance ──────────────────────────────────────────────────────────────
CHANNEL_MAINTENANCE_UPDATED = "hotel:maintenance:updated"
"""Fired by maintenance_service on new reports and resolutions."""

# ── Dashboard aggregation ────────────────────────────────────────────────────
CHANNEL_DASHBOARD_UPDATE = "hotel:dashboard:all"
"""Internal channel the dashboard subscriber re-broadcasts on."""

# Convenience tuple used by the dashboard subscriber for pattern matching.
ALL_CHANNELS: tuple[str, ...] = (
    CHANNEL_ROOM_VACATED,
    CHANNEL_ROOM_STATUS_CHANGED,
    CHANNEL_GUEST_CHECKED_IN,
    CHANNEL_GUEST_CHECKED_OUT,
    CHANNEL_ORDER_STATUS_CHANGED,
    CHANNEL_MAINTENANCE_UPDATED,
)
