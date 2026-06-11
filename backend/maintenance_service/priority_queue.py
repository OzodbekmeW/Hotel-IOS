"""
Custom priority queue for maintenance requests built on Python heapq.

Heap tuple layout:
    (priority_int, created_at_isoformat, MaintenanceRequest)

  priority_int         – CRITICAL=0, HIGH=1, NORMAL=2, LOW=3
  created_at_isoformat – ISO-8601 string; breaks ties with FIFO ordering.
  MaintenanceRequest   – The domain object (not compared directly).
"""

from __future__ import annotations

import heapq
import logging
from typing import List, Optional

from shared.models import MaintenanceRequest, UrgencyLevel

logger = logging.getLogger(__name__)

URGENCY_PRIORITY: dict[UrgencyLevel, int] = {
    UrgencyLevel.CRITICAL: 0,
    UrgencyLevel.HIGH:     1,
    UrgencyLevel.NORMAL:   2,
    UrgencyLevel.LOW:      3,
}


class MaintenancePriorityQueue:
    """Min-heap priority queue for MaintenanceRequest objects.

    Higher-urgency requests always surface first.  Within the same urgency
    level, earlier created_at timestamps win (FIFO).
    """

    def __init__(self) -> None:
        """Initialise with an empty heap."""
        self._heap: list[tuple[int, str, MaintenanceRequest]] = []

    def push(self, request: MaintenanceRequest) -> None:
        """Push a maintenance request into the priority queue.

        Args:
            request: The MaintenanceRequest to enqueue.
        """
        priority = URGENCY_PRIORITY[request.urgency]
        heapq.heappush(
            self._heap,
            (priority, request.created_at.isoformat(), request),
        )
        logger.info(
            "Enqueued request %s (urgency=%s, priority=%d)",
            request.request_id,
            request.urgency.value,
            priority,
        )

    def pop(self) -> Optional[MaintenanceRequest]:
        """Remove and return the highest-priority maintenance request.

        Returns:
            The top MaintenanceRequest, or None if the queue is empty.
        """
        if not self._heap:
            return None
        _, _, request = heapq.heappop(self._heap)
        logger.info("Popped request %s from maintenance queue", request.request_id)
        return request

    def peek(self) -> Optional[MaintenanceRequest]:
        """Return the top request without removing it from the queue.

        Returns:
            The highest-priority MaintenanceRequest, or None if empty.
        """
        if not self._heap:
            return None
        return self._heap[0][2]

    def size(self) -> int:
        """Return the number of requests currently in the queue.

        Returns:
            Integer count of queued requests.
        """
        return len(self._heap)

    def remove_by_id(self, request_id: str) -> bool:
        """Remove a specific request from the queue by its ID.

        Uses linear search and rebuilds the heap — acceptable for the
        small queue sizes expected in this system.

        Args:
            request_id: The request_id of the entry to remove.

        Returns:
            True if the entry was found and removed, False otherwise.
        """
        original_len = len(self._heap)
        self._heap = [
            entry for entry in self._heap
            if entry[2].request_id != request_id
        ]
        if len(self._heap) < original_len:
            heapq.heapify(self._heap)
            logger.info("Request %s removed from maintenance queue", request_id)
            return True
        return False

    def get_all_sorted(self) -> List[MaintenanceRequest]:
        """Return all queued requests in priority order without modifying the heap.

        Returns:
            New list of MaintenanceRequest objects, highest priority first.
        """
        sorted_entries = sorted(self._heap, key=lambda e: (e[0], e[1]))
        return [entry[2] for entry in sorted_entries]
