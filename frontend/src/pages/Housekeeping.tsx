import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Sparkles, Play, CheckCircle } from 'lucide-react'

import { getQueue, startCleaning, completeCleaning } from '@/api/housekeeping'
import { getRooms } from '@/api/reception'
import { Button }   from '@/components/ui/Button'
import { Card }     from '@/components/ui/Card'
import { RoomStatus } from '@/types'
import type { Room } from '@/types'

// ── Column card ───────────────────────────────────────────────────────────────

interface RoomCardProps {
  room: Room
  col:  'dirty' | 'cleaning' | 'clean'
}

function HouseRoomCard({ room, col }: RoomCardProps) {
  const qc = useQueryClient()

  const startMut = useMutation({
    mutationFn: () => startCleaning(room.room_number),
    onSuccess: () => {
      toast.success(`Started cleaning room ${room.room_number}`)
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['house-queue'] })
    },
    onError: (err: any) => toast.error(err.message ?? 'Error'),
  })

  const doneMut = useMutation({
    mutationFn: () => completeCleaning(room.room_number),
    onSuccess: () => {
      toast.success(`Room ${room.room_number} is now clean!`)
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['house-queue'] })
    },
    onError: (err: any) => toast.error(err.message ?? 'Error'),
  })

  return (
    <div className="rounded-xl border border-navy-400/40 bg-gradient-card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="font-sora font-bold text-lg text-white">{room.room_number}</span>
        <span className="text-xs text-slate-500 font-dm">Fl.{room.floor}</span>
      </div>
      <p className="text-xs text-slate-500 font-dm mb-4 capitalize">
        {room.room_type.toLowerCase()} · {room.proximity.replace(/_/g, ' ')}
      </p>

      {col === 'dirty' && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          loading={startMut.isPending}
          onClick={() => startMut.mutate()}
        >
          <Play size={13} />
          Start Cleaning
        </Button>
      )}
      {col === 'cleaning' && (
        <Button
          variant="success"
          size="sm"
          className="w-full"
          loading={doneMut.isPending}
          onClick={() => doneMut.mutate()}
        >
          <CheckCircle size={13} />
          Mark Clean
        </Button>
      )}
      {col === 'clean' && (
        <p className="text-xs text-status-clean font-dm flex items-center gap-1">
          <CheckCircle size={12} /> Ready
        </p>
      )}
    </div>
  )
}

// ── Kanban column ─────────────────────────────────────────────────────────────

interface ColumnProps {
  title:    string
  count:    number
  rooms:    Room[]
  col:      'dirty' | 'cleaning' | 'clean'
  accent:   string
}

function KanbanColumn({ title, count, rooms, col, accent }: ColumnProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center gap-2 pb-2 border-b ${accent.replace('text-', 'border-')}/30`}>
        <h3 className={`font-sora font-semibold text-sm ${accent}`}>{title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-dm font-semibold bg-navy-700 ${accent}`}>
          {count}
        </span>
      </div>
      <div className="space-y-3">
        {rooms.length === 0 && (
          <p className="text-xs text-slate-600 italic text-center py-8">No rooms</p>
        )}
        {rooms.map((r) => (
          <HouseRoomCard key={r.room_number} room={r} col={col} />
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Housekeeping() {
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
    refetchInterval: 15_000,
  })

  const dirty   = rooms.filter((r) => r.status === RoomStatus.DIRTY)
  const cleaning = rooms.filter((r) => r.status === RoomStatus.CLEANING)
  const clean   = rooms.filter((r) => r.status === RoomStatus.CLEAN)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        <h2 className="font-sora font-semibold text-white text-sm">
          Housekeeping Board
        </h2>
        <span className="text-xs text-slate-500 font-dm">· {dirty.length + cleaning.length} pending</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KanbanColumn
          title="Needs Cleaning"
          count={dirty.length}
          rooms={dirty}
          col="dirty"
          accent="text-status-dirty"
        />
        <KanbanColumn
          title="In Progress"
          count={cleaning.length}
          rooms={cleaning}
          col="cleaning"
          accent="text-status-cleaning"
        />
        <KanbanColumn
          title="Clean & Ready"
          count={clean.length}
          rooms={clean}
          col="clean"
          accent="text-status-clean"
        />
      </div>
    </div>
  )
}
