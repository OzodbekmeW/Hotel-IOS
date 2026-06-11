"""
Housekeeping service entry point.

Runs on port 8002.  Manages the room cleaning workflow and reacts to
room-vacated events published by the reception service via Redis.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .router import router
from .subscriber import start_subscriber

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Start the Redis subscriber as a background task on startup.

    Args:
        app: The FastAPI application instance.

    Yields:
        Control to the running application.
    """
    logger.info("Housekeeping service starting on port 8002")
    task = asyncio.create_task(start_subscriber())

    yield

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    logger.info("Housekeeping service shut down")


# ── Application ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="HotelOS – Housekeeping Service",
    description="Manages room cleaning queues and status via Redis events.",
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

app.include_router(router)


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
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ── Dev runner ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("housekeeping_service.main:app", host="0.0.0.0", port=8002, reload=True)
