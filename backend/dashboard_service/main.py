"""
Dashboard service entry point.

Runs on port 8000.  Exposes:
  - WebSocket /ws           → live event stream (token auth)
  - GET /                   → serves static/index.html
  - GET /api/state          → aggregated snapshot from all services (API-key auth)
"""

from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncGenerator


import httpx
import uvicorn

from fastapi import Depends, FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import APIKeyHeader



from .subscriber import start_subscriber
from .ws_manager import manager

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

DASHBOARD_API_KEY: str = os.getenv("DASHBOARD_API_KEY", "hotelOS-secret-2024")
STATIC_DIR: Path = Path(__file__).parent / "static"

# Internal service URLs — override via env vars when running in Docker.
RECEPTION_URL:    str = os.getenv("RECEPTION_URL",    "http://localhost:8001")
ROOM_SERVICE_URL: str = os.getenv("ROOM_SERVICE_URL", "http://localhost:8003")
MAINTENANCE_URL:  str = os.getenv("MAINTENANCE_URL",  "http://localhost:8004")

# ── Auth ──────────────────────────────────────────────────────────────────────

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(
    api_key: str | None = Depends(api_key_header),
) -> str:
    """Validate the X-API-Key header on REST endpoints.

    Args:
        api_key: Value extracted by the APIKeyHeader security scheme.

    Returns:
        The validated API key string.

    Raises:
        HTTPException 401: Key is missing or incorrect.
    """
    if api_key != DASHBOARD_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Start the Redis subscriber background task on startup.

    Args:
        app: FastAPI application instance.

    Yields:
        Control to the running application.
    """
    logger.info("Dashboard service starting on port 8000")
    task = asyncio.create_task(start_subscriber())

    yield

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    logger.info("Dashboard service shut down")


# ── Application ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="HotelOS – Dashboard",
    description="Real-time hotel operations dashboard.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(default=""),
) -> None:
    """Real-time event stream endpoint for the dashboard UI.

    Validates the token query parameter, accepts the connection, then
    keeps it open until the client disconnects.

    Args:
        websocket: Incoming WebSocket connection.
        token:     Authentication token passed as ?token=<value>.
    """
    if token != DASHBOARD_API_KEY:
        await websocket.close(code=1008, reason="Unauthorized")
        logger.warning("WebSocket rejected: invalid token")
        return

    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected normally")
    except Exception as exc:
        logger.warning("WebSocket error: %s", exc)
    finally:
        await manager.disconnect(websocket)


# ── REST endpoints ────────────────────────────────────────────────────────────

async def _fetch_json(client: httpx.AsyncClient, url: str) -> Any:
    """Fetch JSON from a service URL, returning an empty list on failure.

    Args:
        client: Shared httpx AsyncClient.
        url:    Full URL to GET.

    Returns:
        Parsed JSON (list or dict), or [] on any error.
    """
    try:
        response = await client.get(url, timeout=3.0)
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        logger.warning("Failed to fetch %s: %s", url, exc)
        return []


@app.get("/api/state", dependencies=[Depends(verify_api_key)])
async def get_state() -> dict[str, Any]:
    """Return an aggregated state snapshot from all running services.

    Calls each service synchronously via httpx.  If a service is down,
    its section returns an empty list rather than failing the request.

    Returns:
        Dict with rooms, orders, maintenance, and guests lists.
    """
    async with httpx.AsyncClient() as client:
        rooms, orders, maintenance, guests = await asyncio.gather(
            _fetch_json(client, f"{RECEPTION_URL}/rooms"),
            _fetch_json(client, f"{ROOM_SERVICE_URL}/orders"),
            _fetch_json(client, f"{MAINTENANCE_URL}/reports"),
            _fetch_json(client, f"{RECEPTION_URL}/guests"),
            return_exceptions=False,
        )

    return {
        "rooms":       rooms       if isinstance(rooms, list)       else [],
        "orders":      orders      if isinstance(orders, list)      else [],
        "maintenance": maintenance if isinstance(maintenance, list) else [],
        "guests":      guests      if isinstance(guests, list)      else [],
    }


@app.get("/", include_in_schema=False)
async def serve_dashboard() -> FileResponse:
    """Serve the single-page dashboard HTML.

    Returns:
        FileResponse wrapping static/index.html.
    """
    index_path = STATIC_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Dashboard UI not found")
    return FileResponse(str(index_path))


# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Prevent raw tracebacks from reaching HTTP clients.

    Args:
        request: Incoming HTTP request.
        exc:     Unhandled exception.

    Returns:
        Generic 500 JSON response.
    """
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url,
        exc,
        exc_info=True,
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ── Dev runner ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "dashboard_service.main:app", host="0.0.0.0", port=8000, reload=True
    )
