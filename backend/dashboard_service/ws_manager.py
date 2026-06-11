"""
WebSocket connection manager for the dashboard service.

Maintains all active browser connections and provides a broadcast helper
that gracefully removes stale sockets instead of raising.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts.

    Attributes:
        active_connections: List of currently open WebSocket clients.
    """

    def __init__(self) -> None:
        """Initialise with an empty connection list."""
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection.

        Args:
            websocket: Incoming WebSocket from FastAPI.
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            "Client connected. Total: %d", len(self.active_connections)
        )

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket from the active list.

        Args:
            websocket: The WebSocket that disconnected.
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(
            "Client disconnected. Total: %d", len(self.active_connections)
        )

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Send a JSON message to every connected client.

        Sockets that raise during send are collected and removed
        after the loop to avoid mutating the list mid-iteration.

        Args:
            message: Serialisable dict to broadcast.
        """
        dead_connections: list[WebSocket] = []

        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as exc:
                logger.warning("Broadcast failed for client: %s", exc)
                dead_connections.append(connection)

        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)


# Module-level singleton shared by main.py and subscriber.py.
manager: ConnectionManager = ConnectionManager()
