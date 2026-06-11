import React from 'react'
import { BedDouble, ClipboardList, Wrench, Users } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatDistanceToNow, parseISO } from 'date-fns'

import { useDashboardStore } from '@/store/dashboardStore'
import { useRoomStats }      from '@/hooks/useRooms'
import { StatCard, Card }    from '@/components/ui/Card'
import { StatusBadge }       from '@/components/ui/Badge'
import { RoomStatus }        from '@/types'

// ── Status colours for the donut chart ───────────────────────────────────────

const STATUS_COLORS: Record<RoomStatus, string> = {
  [RoomStatus.CLEAN]:       '#22c55e',
  [RoomStatus.DIRTY]:       '#ef4444',
  [RoomStatus.CLEANING]:    '#eab308',
  [RoomStatus.OCCUPIED]:    '#3b82f6',
  [RoomStatus.MAINTENANCE]: '#f97316',
}

// ── Room card grid ────────────────────────────────────────────────────────────

const ROOM_BORDER: Record<RoomStatus, string> = {
  [RoomStatus.CLEAN]:       'border-green-500/50',
  [RoomStatus.DIRTY]:       'border-red-500/50',
  [RoomStatus.CLEANING]:    'border-yellow-500/50',
  [RoomStatus.OCCUPIED]:    'border-blue-500/50',
  [RoomStatus.MAINTENANCE]: 'border-orange-500/50',
}

function RoomCard({ room }: { room: import('@/types').Room }) {
  const changedRooms = useDashboardStore((s) => s.changedRooms)
  const guests       = useDashboardStore((s) => s.guests)
  const isGlowing    = !!changedRooms[room.room_number]
  const guestName    = room.current_guest_id ? (guests[room.current_guest_id]?.name ?? null) : null

  return (
    <div
      className={[
        'rounded-xl border bg-gradient-card p-4 transition-all duration-300',
        ROOM_BORDER[room.status],
        isGlowing ? 'ring-2 ring-accent/60 shadow-lg shadow-accent/20 animate-status-glow' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-sora font-bold text-xl text-white">{room.room_number}</span>
        <span className="text-xs text-slate-500 font-dm">Fl.{room.floor}</span>
      </div>
      <StatusBadge status={room.status} />
      <p className="text-xs text-slate-500 font-dm mt-2 capitalize">
        {room.room_type.toLowerCase()} · {room.proximity.replace(/_/g, ' ')}
      </p>
      {guestName && (
        <p className="text-xs text-accent font-dm mt-1 truncate">👤 {guestName}</p>
      )}
      <p className="text-xs text-slate-600 font-dm mt-1">
        {formatDistanceToNow(parseISO(room.last_cleaned_at), { addSuffix: true })}
      </p>
    </div>
  )
}

// ── Event log ─────────────────────────────────────────────────────────────────

function EventLog() {
  const eventLog = useDashboardStore((s) => s.eventLog)

  return (
    <Card className="p-5 flex flex-col h-full">
      <h3 className="font-sora font-semibold text-white text-sm mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
        Live Events
      </h3>
      <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
        {eventLog.length === 0 && (
          <p className="text-xs text-slate-500 italic">Waiting for events…</p>
        )}
        {eventLog.map((entry) => (
          <div
            key={entry.id}
            className="flex gap-2 animate-fade-in"
          >
            <span className="text-xs text-slate-600 font-dm shrink-0 mt-0.5">
              {new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <p className="text-xs text-slate-300 font-dm leading-snug">{entry.summary}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Donut chart ───────────────────────────────────────────────────────────────

function RoomDonut() {
  const stats = useRoomStats()

  const data = [
    { name: 'Clean',       value: stats.clean,       fill: STATUS_COLORS[RoomStatus.CLEAN] },
    { name: 'Dirty',       value: stats.dirty,       fill: STATUS_COLORS[RoomStatus.DIRTY] },
    { name: 'Cleaning',    value: stats.cleaning,    fill: STATUS_COLORS[RoomStatus.CLEANING] },
    { name: 'Occupied',    value: stats.occupied,    fill: STATUS_COLORS[RoomStatus.OCCUPIED] },
    { name: 'Maintenance', value: stats.maintenance, fill: STATUS_COLORS[RoomStatus.MAINTENANCE] },
  ].filter((d) => d.value > 0)

  return (
    <Card className="p-5">
      <h3 className="font-sora font-semibold text-white text-sm mb-4">Room Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#94a3b8', fontFamily: 'DM Sans' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const stats   = useRoomStats()
  const rooms   = useDashboardStore((s) => s.rooms)
  const orders  = useDashboardStore((s) => s.orders)
  const maint   = useDashboardStore((s) => s.maintenance)

  const activeOrders = Object.values(orders).filter((o) => o.status !== 'DELIVERED').length
  const openIssues   = Object.values(maint).filter((m) => !m.resolved).length
  const roomList     = Object.values(rooms).sort((a, b) => a.room_number.localeCompare(b.room_number))

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Rooms"
          value={stats.total}
          icon={<BedDouble size={20} />}
          accent="text-accent"
          sublabel={`${stats.clean} available`}
        />
        <StatCard
          label="Available"
          value={stats.clean}
          icon={<BedDouble size={20} />}
          accent="text-status-clean"
          sublabel="Clean & ready"
        />
        <StatCard
          label="Active Orders"
          value={activeOrders}
          icon={<ClipboardList size={20} />}
          accent="text-yellow-400"
          sublabel="Room service"
        />
        <StatCard
          label="Open Issues"
          value={openIssues}
          icon={<Wrench size={20} />}
          accent="text-orange-400"
          sublabel="Maintenance queue"
        />
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Room grid */}
        <div className="xl:col-span-2 space-y-4">
          <h2 className="font-sora font-semibold text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <BedDouble size={16} className="text-accent" />
            Room Status
          </h2>
          {roomList.length === 0 ? (
            <p className="text-slate-500 italic text-sm">Loading rooms…</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {roomList.map((room) => (
                <RoomCard key={room.room_number} room={room} />
              ))}
            </div>
          )}
        </div>

        {/* Right column: event log + chart */}
        <div className="space-y-4 flex flex-col">
          <div className="flex-1 min-h-64">
            <EventLog />
          </div>
          <RoomDonut />
        </div>
      </div>
    </div>
  )
}
