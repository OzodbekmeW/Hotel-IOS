import { create } from 'zustand'
import { Room, Guest, RoomOrder, MaintenanceRequest, EventLogEntry } from '@/types'

interface DashboardState {
  // ── Data ────────────────────────────────────────────────────────────────
  rooms:       Record<string, Room>
  guests:      Record<string, Guest>
  orders:      Record<string, RoomOrder>
  maintenance: Record<string, MaintenanceRequest>
  eventLog:    EventLogEntry[]
  changedRooms: Record<string, boolean>   // room_number → glow animation flag

  // ── Bulk setters (initial load) ─────────────────────────────────────────
  setRooms:       (rooms: Room[]) => void
  setGuests:      (guests: Guest[]) => void
  setOrders:      (orders: RoomOrder[]) => void
  setMaintenance: (requests: MaintenanceRequest[]) => void

  // ── Granular updaters (WebSocket events) ────────────────────────────────
  updateRoom:       (room_number: string, update: Partial<Room>) => void
  upsertGuest:      (guest: Partial<Guest> & { guest_id: string }) => void
  removeGuest:      (guest_id: string) => void
  upsertOrder:      (order: Partial<RoomOrder> & { order_id: string }) => void
  upsertMaintenance:(request: Partial<MaintenanceRequest> & { request_id: string }) => void

  // ── Event log ───────────────────────────────────────────────────────────
  addEvent: (entry: Omit<EventLogEntry, 'id'>) => void

  // ── Glow animation ──────────────────────────────────────────────────────
  markRoomChanged:  (room_number: string) => void
  clearRoomChanged: (room_number: string) => void
}

let _eventCounter = 0

export const useDashboardStore = create<DashboardState>((set) => ({
  rooms:        {},
  guests:       {},
  orders:       {},
  maintenance:  {},
  eventLog:     [],
  changedRooms: {},

  // ── Bulk setters ─────────────────────────────────────────────────────────
  setRooms: (rooms) =>
    set({ rooms: Object.fromEntries(rooms.map((r) => [r.room_number, r])) }),

  setGuests: (guests) =>
    set({ guests: Object.fromEntries(guests.map((g) => [g.guest_id, g])) }),

  setOrders: (orders) =>
    set({ orders: Object.fromEntries(orders.map((o) => [o.order_id, o])) }),

  setMaintenance: (requests) =>
    set({
      maintenance: Object.fromEntries(requests.map((r) => [r.request_id, r])),
    }),

  // ── Granular updaters ─────────────────────────────────────────────────────
  updateRoom: (room_number, update) =>
    set((state) => ({
      rooms: {
        ...state.rooms,
        [room_number]: { ...state.rooms[room_number], ...update },
      },
    })),

  upsertGuest: (guest) =>
    set((state) => ({
      guests: {
        ...state.guests,
        [guest.guest_id]: { ...state.guests[guest.guest_id], ...guest } as Guest,
      },
    })),

  removeGuest: (guest_id) =>
    set((state) => {
      const { [guest_id]: _, ...rest } = state.guests
      return { guests: rest }
    }),

  upsertOrder: (order) =>
    set((state) => ({
      orders: {
        ...state.orders,
        [order.order_id]: {
          ...state.orders[order.order_id],
          ...order,
        } as RoomOrder,
      },
    })),

  upsertMaintenance: (request) =>
    set((state) => ({
      maintenance: {
        ...state.maintenance,
        [request.request_id]: {
          ...state.maintenance[request.request_id],
          ...request,
        } as MaintenanceRequest,
      },
    })),

  // ── Event log ─────────────────────────────────────────────────────────────
  addEvent: (entry) =>
    set((state) => ({
      eventLog: [
        { ...entry, id: String(++_eventCounter) },
        ...state.eventLog,
      ].slice(0, 10),
    })),

  // ── Glow animation ────────────────────────────────────────────────────────
  markRoomChanged: (room_number) =>
    set((state) => ({
      changedRooms: { ...state.changedRooms, [room_number]: true },
    })),

  clearRoomChanged: (room_number) =>
    set((state) => {
      const { [room_number]: _, ...rest } = state.changedRooms
      return { changedRooms: rest }
    }),
}))
