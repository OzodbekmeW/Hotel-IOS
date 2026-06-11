import { useEffect, useRef, useState } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'
import { WSEvent, RoomStatus, OrderStatus } from '@/types'

export type WsStatus = 'connecting' | 'connected' | 'disconnected'

const WS_URL  = import.meta.env.VITE_WS_URL  as string
const API_KEY = import.meta.env.VITE_API_KEY as string

// ── Human-readable event summaries ───────────────────────────────────────────

function summarise(event: WSEvent): string {
  const p = event.payload as Record<string, string>
  switch (event.event_type) {
    case 'hotel:guest:checked_in':
      return `✅ ${p.name ?? 'Guest'} checked in → Room ${p.room_number}`
    case 'hotel:guest:checked_out':
      return `🚪 ${p.name ?? 'Guest'} checked out from Room ${p.room_number}`
    case 'hotel:room:status_changed':
      return `🏠 Room ${p.room_number} → ${p.status}`
    case 'hotel:room:vacated':
      return `📋 Room ${p.room_number} vacated — queued for cleaning`
    case 'hotel:order:status_changed':
      return `🍽️ Order (${String(p.order_id ?? '').slice(0, 8)}…) → ${p.status}`
    case 'hotel:maintenance:updated':
      return `🔧 Room ${p.room_number} maintenance ${p.action ?? 'updated'}`
    default:
      return event.event_type
  }
}

// ── Dispatch WebSocket event to Zustand store ─────────────────────────────────

function dispatch(event: WSEvent) {
  const store = useDashboardStore.getState()
  const p = event.payload as Record<string, unknown>

  store.addEvent({ event_type: event.event_type, timestamp: event.timestamp, summary: summarise(event) })

  switch (event.event_type) {
    case 'hotel:room:status_changed': {
      const rn = p.room_number as string
      store.updateRoom(rn, { status: p.status as RoomStatus, floor: p.floor as number | undefined })
      store.markRoomChanged(rn)
      setTimeout(() => store.clearRoomChanged(rn), 2000)
      break
    }
    case 'hotel:guest:checked_in': {
      store.upsertGuest({
        guest_id:    p.guest_id   as string,
        name:        p.name       as string,
        room_number: p.room_number as string,
      })
      const rn = p.room_number as string
      store.updateRoom(rn, { status: RoomStatus.OCCUPIED, current_guest_id: p.guest_id as string })
      store.markRoomChanged(rn)
      setTimeout(() => store.clearRoomChanged(rn), 2000)
      break
    }
    case 'hotel:guest:checked_out': {
      store.removeGuest(p.guest_id as string)
      const rn = p.room_number as string
      store.updateRoom(rn, { status: RoomStatus.DIRTY, current_guest_id: null })
      store.markRoomChanged(rn)
      setTimeout(() => store.clearRoomChanged(rn), 2000)
      break
    }
    case 'hotel:room:vacated': {
      const rn = p.room_number as string
      store.updateRoom(rn, { status: RoomStatus.DIRTY })
      store.markRoomChanged(rn)
      setTimeout(() => store.clearRoomChanged(rn), 2000)
      break
    }
    case 'hotel:order:status_changed': {
      store.upsertOrder({
        order_id:    p.order_id    as string,
        room_number: p.room_number as string,
        status:      p.status      as OrderStatus,
        total:       p.total       as number,
        items:       (p.items      as unknown[]) as import('@/types').OrderItem[],
      })
      break
    }
    case 'hotel:maintenance:updated': {
      store.upsertMaintenance({
        request_id:          p.request_id          as string,
        room_number:         p.room_number          as string,
        description:         p.description          as string,
        urgency:             p.urgency              as import('@/types').UrgencyLevel,
        assigned_technician: p.assigned_technician  as string | null,
        resolved:            p.resolved             as boolean,
      })
      break
    }
    default:
      break
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWebSocket() {
  const [status, setStatus] = useState<WsStatus>('disconnected')
  const wsRef        = useRef<WebSocket | null>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout>>()
  const mountedRef   = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    function connect() {
      if (!mountedRef.current) return
      setStatus('connecting')

      const ws = new WebSocket(`${WS_URL}?token=${API_KEY}`)
      wsRef.current = ws

      ws.onopen = () => {
        if (mountedRef.current) setStatus('connected')
      }

      ws.onmessage = (ev: MessageEvent) => {
        try {
          const data: WSEvent = JSON.parse(ev.data as string)
          dispatch(data)
        } catch {
          // ignore parse errors
        }
      }

      ws.onclose = () => {
        if (!mountedRef.current) return
        setStatus('disconnected')
        timerRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [])

  return { status }
}
