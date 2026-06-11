"""
HTTP route handlers for the maintenance service.

Endpoints:
    POST /reports                      – File a new maintenance request.
    POST /reports/{request_id}/resolve – Mark a request as resolved.
    GET  /queue                        – Return the sorted active queue.
    GET  /reports                      – Return all reports (active + resolved).
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from uuid import uuid4

import redis.asyncio as aioredis
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from shared.events import CHANNEL_MAINTENANCE_UPDATED
from shared.models import MaintenanceRequest, UrgencyLevel
from shared.redis_client import publish_event

from .data import VALID_ROOMS, all_requests, maintenance_queue, next_technician

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request schemas ───────────────────────────────────────────────────────────

class CreateReportRequest(BaseModel):
    """Body for POST /reports."""

    room_number: str = Field(..., pattern=r"^\d{3}$")
    description: str = Field(..., min_length=5, max_length=500)
    urgency: UrgencyLevel


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _publish_maintenance_event(
    request: MaintenanceRequest, action: str
) -> None:
    """Broadcast a CHANNEL_MAINTENANCE_UPDATED event.

    Args:
        request: The MaintenanceRequest that changed.
        action:  "created" or "resolved".

    Raises:
        HTTPException 503: Redis unavailable.
    """
    try:
        await publish_event(
            CHANNEL_MAINTENANCE_UPDATED,
            {
                "request_id":          request.request_id,
                "room_number":         request.room_number,
                "description":         request.description,
                "urgency":             request.urgency.value,
                "action":              action,
                "assigned_technician": request.assigned_technician,
                "resolved":            request.resolved,
            },
        )
    except aioredis.RedisError as exc:
        logger.error(
            "Redis publish error for request %s: %s", request.request_id, exc
        )
        raise HTTPException(status_code=503, detail="Message broker unavailable")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/reports", status_code=201)
async def create_report(body: CreateReportRequest) -> dict[str, Any]:
    """File a new maintenance request and add it to the priority queue.

    Args:
        body: Validated report creation request.

    Returns:
        Created MaintenanceRequest dict including assigned_technician.

    Raises:
        HTTPException 404: Room not in hotel inventory.
        HTTPException 503: Redis unavailable.
    """
    if body.room_number not in VALID_ROOMS:
        raise HTTPException(
            status_code=404,
            detail=f"Room '{body.room_number}' not found in hotel inventory",
        )

    technician = next_technician()
    request = MaintenanceRequest(
        request_id=str(uuid4()),
        room_number=body.room_number,
        description=body.description,
        urgency=body.urgency,
        created_at=datetime.utcnow(),
        assigned_technician=technician,
        resolved=False,
    )

    maintenance_queue.push(request)
    all_requests[request.request_id] = request

    logger.info(
        "Maintenance request %s created | room=%s | urgency=%s | tech=%s",
        request.request_id,
        request.room_number,
        request.urgency.value,
        technician,
    )
    await _publish_maintenance_event(request, "created")

    return request.model_dump(mode="json")


@router.post("/reports/{request_id}/resolve", status_code=200)
async def resolve_report(request_id: str) -> dict[str, Any]:
    """Mark a maintenance request as resolved and remove it from the queue.

    Args:
        request_id: UUID of the maintenance request to resolve.

    Returns:
        Updated MaintenanceRequest dict with resolved=True.

    Raises:
        HTTPException 404: Request not found.
        HTTPException 409: Request is already resolved.
        HTTPException 503: Redis unavailable.
    """
    request = all_requests.get(request_id)
    if request is None:
        raise HTTPException(
            status_code=404, detail=f"Request '{request_id}' not found"
        )
    if request.resolved:
        raise HTTPException(
            status_code=409,
            detail=f"Request '{request_id}' is already resolved",
        )

    resolved_request = request.model_copy(update={"resolved": True})
    all_requests[request_id] = resolved_request
    maintenance_queue.remove_by_id(request_id)

    logger.info("Maintenance request %s resolved", request_id)
    await _publish_maintenance_event(resolved_request, "resolved")

    return resolved_request.model_dump(mode="json")


@router.get("/queue", status_code=200)
async def get_queue() -> dict[str, Any]:
    """Return all active unresolved requests sorted by priority.

    Returns:
        Dict with queue depth and sorted list.
    """
    sorted_requests = maintenance_queue.get_all_sorted()
    return {
        "active_count": maintenance_queue.size(),
        "queue": [r.model_dump(mode="json") for r in sorted_requests],
    }


@router.get("/reports", status_code=200)
async def list_all_reports() -> list[dict[str, Any]]:
    """Return all maintenance reports regardless of resolved state.

    Returns:
        List of all MaintenanceRequest dicts.
    """
    return [r.model_dump(mode="json") for r in all_requests.values()]
