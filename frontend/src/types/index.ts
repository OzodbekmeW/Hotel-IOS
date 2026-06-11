// ── Enums ─────────────────────────────────────────────────────────────────────

export enum RoomType {
  SINGLE     = 'SINGLE',
  DOUBLE     = 'DOUBLE',
  SUITE      = 'SUITE',
  ACCESSIBLE = 'ACCESSIBLE',
}

export enum RoomStatus {
  CLEAN       = 'CLEAN',
  DIRTY       = 'DIRTY',
  CLEANING    = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE',
  OCCUPIED    = 'OCCUPIED',
}

export enum UrgencyLevel {
  CRITICAL = 'CRITICAL',
  HIGH     = 'HIGH',
  NORMAL   = 'NORMAL',
  LOW      = 'LOW',
}

export enum OrderStatus {
  RECEIVED   = 'RECEIVED',
  PREPARING  = 'PREPARING',
  DELIVERING = 'DELIVERING',
  DELIVERED  = 'DELIVERED',
}

// ── Domain models ─────────────────────────────────────────────────────────────

export interface Room {
  room_number:      string
  floor:            number
  room_type:        RoomType
  status:           RoomStatus
  last_cleaned_at:  string
  current_guest_id: string | null
  proximity:        string
}

export interface Guest {
  guest_id:             string
  name:                 string
  room_type_requested:  RoomType
  floor_preference:     number | null
  proximity_preference: string | null
  check_in_time:        string
  room_number:          string | null
  charges:              Array<{ description: string; amount: number }>
}

export interface OrderItem {
  name:     string
  price:    number
  quantity: number
}

export interface RoomOrder {
  order_id:   string
  room_number: string
  items:       OrderItem[]
  status:      OrderStatus
  created_at:  string
  total:       number
}

export interface MaintenanceRequest {
  request_id:          string
  room_number:         string
  description:         string
  urgency:             UrgencyLevel
  created_at:          string
  assigned_technician: string | null
  resolved:            boolean
}

// ── Form shapes ───────────────────────────────────────────────────────────────

export interface CheckinForm {
  name:                  string
  room_type:             RoomType
  floor_preference?:     number
  proximity_preference?: string
}

export interface CheckinResponse {
  guest_id:      string
  room_number:   string
  floor:         number
  room_type:     RoomType
  check_in_time: string
}

export interface BillResponse {
  guest_id:            string
  guest_name:          string
  room_number:         string
  room_type:           string
  nights:              number
  room_rate_per_night: number
  room_total:          number
  discount_applied:    number
  service_charges:     number
  grand_total:         number
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

export interface WSEvent {
  event_type: string
  timestamp:  string
  payload:    Record<string, unknown>
}

export interface EventLogEntry {
  id:         string
  event_type: string
  timestamp:  string
  summary:    string
}

// ── Housekeeping ──────────────────────────────────────────────────────────────

export interface CleaningQueueResponse {
  cleaning_queue: string[]
  depth:          number
}

// ── Maintenance ───────────────────────────────────────────────────────────────

export interface MaintenanceQueueResponse {
  active_count: number
  queue:        MaintenanceRequest[]
}

export interface CreateReportForm {
  room_number:  string
  description:  string
  urgency:      UrgencyLevel
}
