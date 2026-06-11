"""
HTTP route handlers for the room-service service.

Endpoints:
    POST /orders                    – Place a new room-service order.
    POST /orders/{order_id}/status  – Advance an order through its lifecycle.
    GET  /orders                    – List all orders (active and delivered).
    GET  /orders/{order_id}         – Retrieve a single order.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from uuid import uuid4

import redis.asyncio as aioredis
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator

from shared.events import CHANNEL_ORDER_STATUS_CHANGED
from shared.models import OrderStatus, RoomOrder
from shared.redis_client import publish_event

from .data import VALID_ROOMS, orders

logger = logging.getLogger(__name__)
router = APIRouter()

# Valid status transitions — must follow this strict sequence.
_VALID_TRANSITIONS: dict[OrderStatus, OrderStatus] = {
    OrderStatus.RECEIVED:   OrderStatus.PREPARING,
    OrderStatus.PREPARING:  OrderStatus.DELIVERING,
    OrderStatus.DELIVERING: OrderStatus.DELIVERED,
}


# ── Request schemas ───────────────────────────────────────────────────────────

class OrderItemSchema(BaseModel):
    """A single line-item in a room-service order."""

    name: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., gt=0, description="Must be greater than zero")
    quantity: int = Field(..., gt=0, description="Must be greater than zero")


class CreateOrderRequest(BaseModel):
    """Body for POST /orders."""

    room_number: str = Field(..., pattern=r"^\d{3}$")
    items: list[OrderItemSchema] = Field(..., min_length=1)

    @field_validator("room_number")
    @classmethod
    def room_must_exist(cls, v: str) -> str:
        """Reject room numbers not in the hotel inventory.

        Args:
            v: room_number value to validate.

        Returns:
            The validated room number.

        Raises:
            ValueError: If the room is not found.
        """
        if v not in VALID_ROOMS:
            raise ValueError(f"Room '{v}' does not exist in hotel inventory")
        return v


class UpdateStatusRequest(BaseModel):
    """Body for POST /orders/{order_id}/status."""

    status: OrderStatus


# ── Helpers ───────────────────────────────────────────────────────────────────

def _calculate_total(items: list[OrderItemSchema]) -> float:
    """Compute the order total from all line items.

    Args:
        items: Validated list of OrderItemSchema objects.

    Returns:
        Sum of price * quantity for every item, rounded to 2 dp.
    """
    return round(sum(item.price * item.quantity for item in items), 2)


def _validate_transition(current: OrderStatus, requested: OrderStatus) -> None:
    """Enforce the strict status transition sequence.

    Valid chain: RECEIVED → PREPARING → DELIVERING → DELIVERED

    Args:
        current:   The order's current status.
        requested: The status the caller wants to move to.

    Raises:
        HTTPException 422: The requested transition is not allowed.
    """
    allowed = _VALID_TRANSITIONS.get(current)
    if allowed != requested:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Cannot transition from '{current.value}' to "
                f"'{requested.value}'. Expected '{allowed.value if allowed else 'none'}'"
            ),
        )


async def _publish_order_event(order: RoomOrder) -> None:
    """Broadcast an order-status-changed event.

    Args:
        order: The RoomOrder whose status changed.

    Raises:
        HTTPException 503: Redis unavailable.
    """
    try:
        await publish_event(
            CHANNEL_ORDER_STATUS_CHANGED,
            {
                "order_id":    order.order_id,
                "room_number": order.room_number,
                "status":      order.status.value,
                "total":       order.total,
                "items":       order.items,
            },
        )
    except aioredis.RedisError as exc:
        logger.error("Redis publish error for order %s: %s", order.order_id, exc)
        raise HTTPException(status_code=503, detail="Message broker unavailable")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/orders", status_code=201)
async def create_order(body: CreateOrderRequest) -> dict[str, Any]:
    """Place a new room-service order.

    Args:
        body: Validated order creation request.

    Returns:
        Created RoomOrder as a dict.

    Raises:
        HTTPException 422: Validation failed (empty items, bad room, bad price).
        HTTPException 503: Redis unavailable.
    """
    total = _calculate_total(body.items)
    order = RoomOrder(
        order_id=str(uuid4()),
        room_number=body.room_number,
        items=[item.model_dump() for item in body.items],
        status=OrderStatus.RECEIVED,
        created_at=datetime.utcnow(),
        total=total,
    )
    orders[order.order_id] = order

    logger.info(
        "Order %s created for room %s | items=%d | total=%.2f",
        order.order_id,
        order.room_number,
        len(body.items),
        total,
    )
    await _publish_order_event(order)

    return order.model_dump(mode="json")


@router.post("/orders/{order_id}/status", status_code=200)
async def update_order_status(
    order_id: str, body: UpdateStatusRequest
) -> dict[str, Any]:
    """Advance an order to the next status in the lifecycle.

    Enforces the strict sequence RECEIVED → PREPARING → DELIVERING → DELIVERED.

    Args:
        order_id: UUID of the order to update.
        body:     New status value.

    Returns:
        Updated RoomOrder dict.

    Raises:
        HTTPException 404: Order not found.
        HTTPException 422: Invalid status transition.
        HTTPException 503: Redis unavailable.
    """
    order = orders.get(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found")

    _validate_transition(order.status, body.status)

    updated = order.model_copy(update={"status": body.status})
    orders[order_id] = updated

    logger.info(
        "Order %s status: %s → %s",
        order_id,
        order.status.value,
        body.status.value,
    )
    await _publish_order_event(updated)

    return updated.model_dump(mode="json")


@router.get("/orders", status_code=200)
async def list_all_orders() -> list[dict[str, Any]]:
    """Return every order — both active and delivered.

    Returns:
        List of all RoomOrder dicts.
    """
    return [o.model_dump(mode="json") for o in orders.values()]


@router.get("/orders/{order_id}", status_code=200)
async def get_order(order_id: str) -> dict[str, Any]:
    """Retrieve a single order by ID.

    Args:
        order_id: UUID of the order.

    Returns:
        RoomOrder dict.

    Raises:
        HTTPException 404: Order not found.
    """
    order = orders.get(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found")
    return order.model_dump(mode="json")
