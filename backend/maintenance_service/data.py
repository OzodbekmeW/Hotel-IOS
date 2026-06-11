"""
In-memory data store for the maintenance service.
"""

from __future__ import annotations

from shared.models import MaintenanceRequest

from .priority_queue import MaintenancePriorityQueue

# Active priority queue (unresolved requests only).
maintenance_queue: MaintenancePriorityQueue = MaintenancePriorityQueue()

# All reports ever created (request_id → MaintenanceRequest).
all_requests: dict[str, MaintenanceRequest] = {}

TECHNICIANS: list[str] = ["Ali", "Bobur", "Sanjar"]
technician_index: int = 0

VALID_ROOMS: frozenset[str] = frozenset({
    "101", "102", "103", "104", "105",
    "201", "202", "203", "204", "205",
})


def next_technician() -> str:
    """Return the next technician using round-robin selection.

    Returns:
        Technician name string.
    """
    global technician_index
    name = TECHNICIANS[technician_index % len(TECHNICIANS)]
    technician_index += 1
    return name
