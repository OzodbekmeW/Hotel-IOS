# HotelOS — Real-Time Hotel Management System

## Tech Stack
- Python 3.11+ / FastAPI
- Redis 7 (Pub/Sub + State)
- WebSocket (native FastAPI)
- Pydantic v2
- httpx (async inter-service calls)

## Architecture

```
Browser ──WS──► dashboard_service  :8000
                       │
              Redis Pub/Sub (hotel:*)
                  ┌────┴─────────────────┐
         reception:8001  housekeeping:8002
         room_service:8003  maintenance:8004
```

| Service               | Port | Responsibility                        |
|-----------------------|------|---------------------------------------|
| `dashboard_service`   | 8000 | Real-time WebSocket dashboard + UI    |
| `reception_service`   | 8001 | Check-in, checkout, room queries      |
| `housekeeping_service`| 8002 | Cleaning queue, room status tracking  |
| `room_service_service`| 8003 | In-room dining orders                 |
| `maintenance_service` | 8004 | Priority-queued maintenance requests  |

---

## Setup & Run

### 1. Start Redis

```bash
docker run -d -p 6379:6379 redis:7-alpine
# OR if Redis is installed locally:
redis-server
```

### 2. Create a virtual environment and install dependencies

```bash
cd HotelOS
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

pip install fastapi "uvicorn[standard]" "redis[asyncio]" pydantic python-dotenv httpx
```

### 3. Start all 5 services (5 separate terminals, each with the venv activated)

```bash
# Terminal 1 — Reception
uvicorn reception_service.main:app --port 8001 --reload

# Terminal 2 — Housekeeping
uvicorn housekeeping_service.main:app --port 8002 --reload

# Terminal 3 — Room Service
uvicorn room_service_service.main:app --port 8003 --reload

# Terminal 4 — Maintenance
uvicorn maintenance_service.main:app --port 8004 --reload

# Terminal 5 — Dashboard
DASHBOARD_API_KEY=hotelOS-secret-2024 uvicorn dashboard_service.main:app --port 8000 --reload
```

### 4. Open the dashboard

Navigate to **http://localhost:8000** in your browser.

---

## API Reference

### Reception (port 8001)

| Method | Path                    | Description                   |
|--------|-------------------------|-------------------------------|
| POST   | `/checkin`              | Register guest, assign room   |
| POST   | `/checkout/{guest_id}`  | Check out guest, return bill  |
| GET    | `/rooms`                | List all rooms                |
| GET    | `/rooms/{room_number}`  | Single room details           |

**Check-in body:**
```json
{
  "name": "Alice Smith",
  "room_type": "DOUBLE",
  "floor_preference": 2,
  "proximity_preference": "near_elevator"
}
```

**Checkout response (bill):**
```json
{
  "guest_id": "...",
  "nights": 3,
  "room_rate_per_night": 120.0,
  "room_total": 360.0,
  "discount_applied": 0.0,
  "service_charges": 45.50,
  "grand_total": 405.50
}
```

### Housekeeping (port 8002)

| Method | Path                            | Description            |
|--------|---------------------------------|------------------------|
| POST   | `/clean/start/{room_number}`    | Begin cleaning a room  |
| POST   | `/clean/complete/{room_number}` | Mark room clean        |
| GET    | `/queue`                        | View cleaning queue    |

### Room Service (port 8003)

| Method | Path                         | Description              |
|--------|------------------------------|--------------------------|
| POST   | `/orders`                    | Place order              |
| POST   | `/orders/{order_id}/status`  | Advance order status     |
| GET    | `/orders`                    | List all orders          |
| GET    | `/orders/{order_id}`         | Single order             |

**Order body:**
```json
{
  "room_number": "203",
  "items": [
    {"name": "Club Sandwich", "price": 12.50, "quantity": 2},
    {"name": "Orange Juice",  "price": 4.00,  "quantity": 1}
  ]
}
```

**Status transitions (must follow this exact sequence):**
```
RECEIVED → PREPARING → DELIVERING → DELIVERED
```

### Maintenance (port 8004)

| Method | Path                              | Description               |
|--------|-----------------------------------|---------------------------|
| POST   | `/reports`                        | File maintenance request  |
| POST   | `/reports/{request_id}/resolve`   | Mark as resolved          |
| GET    | `/queue`                          | Sorted active queue       |
| GET    | `/reports`                        | All reports               |

**Report body:**
```json
{
  "room_number": "105",
  "description": "Air conditioning not working",
  "urgency": "HIGH"
}
```

### Dashboard (port 8000)

| Path         | Protocol  | Auth                              | Description             |
|--------------|-----------|-----------------------------------|-------------------------|
| `/`          | HTTP GET  | None                              | Dashboard UI            |
| `/ws`        | WebSocket | `?token=hotelOS-secret-2024`      | Real-time event stream  |
| `/api/state` | HTTP GET  | Header `X-API-Key: hotelOS-secret-2024` | REST snapshot     |

---

## Key Algorithms

### Room Assignment (`reception_service/room_assignment.py`)

Pure function — no side effects.

1. Filter `status == CLEAN`
2. Filter `room_type == requested`
3. Sort by `last_cleaned_at` ascending (longest-waiting room first)
4. Prefer requested floor (fallback to all floors)
5. Prefer requested proximity (fallback to any proximity)
6. Return first element

### Billing (`reception_service/billing.py`)

| Room Type   | Rate / night |
|-------------|-------------|
| SINGLE      | $80         |
| DOUBLE      | $120        |
| SUITE       | $250        |
| ACCESSIBLE  | $90         |

- Minimum 1 night even for same-day checkout
- 10% discount on room cost only for stays ≥ 7 nights
- Service charges summed from guest's accumulated order charges

### Maintenance Priority Queue (`maintenance_service/priority_queue.py`)

Built on Python `heapq`.

- Heap tuple: `(priority_int, created_at_iso, MaintenanceRequest)`
- Priority mapping: CRITICAL=0, HIGH=1, NORMAL=2, LOW=3
- FIFO within same priority via ISO timestamp comparison
- Technician assignment: round-robin across Ali → Bobur → Sanjar

---

## Redis Event Channels

| Channel                       | Published by        | Consumed by                    |
|-------------------------------|---------------------|--------------------------------|
| `hotel:guest:checked_in`      | reception           | dashboard                      |
| `hotel:guest:checked_out`     | reception           | dashboard, room_service        |
| `hotel:room:vacated`          | reception           | housekeeping, dashboard        |
| `hotel:room:status_changed`   | reception, housekg  | maintenance, dashboard         |
| `hotel:order:status_changed`  | room_service        | dashboard                      |
| `hotel:maintenance:updated`   | maintenance         | dashboard                      |

---

## Security

| Concern | Implementation |
|---------|---------------|
| Input validation | Pydantic v2 field constraints on all request bodies |
| REST auth | `X-API-Key` header via `APIKeyHeader` dependency |
| WebSocket auth | `?token=` query param, closes with code 1008 on failure |
| Data safety | Broadcasts contain only `{guest_id, name, room_number}` — no billing data |
| Error handling | Global `@app.exception_handler(Exception)` on every service |

---

## Environment Variables

| Variable             | Default                | Service   |
|----------------------|------------------------|-----------|
| `REDIS_URL`          | `redis://localhost:6379` | All     |
| `DASHBOARD_API_KEY`  | `hotelOS-secret-2024`  | Dashboard |

---

## Project Structure

```
HotelOS/
├── .venv/                       ← virtual environment (git-ignored)
├── shared/                      ← Pydantic models, events, Redis client
├── reception_service/           ← Port 8001 — check-in/out, room queries
├── housekeeping_service/        ← Port 8002 — cleaning queue
├── room_service_service/        ← Port 8003 — in-room orders
├── maintenance_service/         ← Port 8004 — priority-queued maintenance
└── dashboard_service/           ← Port 8000 — WebSocket + HTML dashboard
    └── static/index.html        ← Single-page real-time UI
```
