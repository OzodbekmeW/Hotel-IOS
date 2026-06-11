import React from 'react'
import { RoomStatus, UrgencyLevel, OrderStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

// ── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<RoomStatus, string> = {
  [RoomStatus.CLEAN]:       'bg-green-500/15  text-green-400   border border-green-500/30',
  [RoomStatus.DIRTY]:       'bg-red-500/15    text-red-400     border border-red-500/30',
  [RoomStatus.CLEANING]:    'bg-yellow-500/15 text-yellow-400  border border-yellow-500/30',
  [RoomStatus.OCCUPIED]:    'bg-blue-500/15   text-blue-400    border border-blue-500/30',
  [RoomStatus.MAINTENANCE]: 'bg-orange-500/15 text-orange-400  border border-orange-500/30',
}

export function StatusBadge({ status }: { status: RoomStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-dm font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}

// ── Urgency Badge ─────────────────────────────────────────────────────────────

const URGENCY_STYLES: Record<UrgencyLevel, string> = {
  [UrgencyLevel.CRITICAL]: 'bg-red-500/20    text-urgency-critical border border-red-500/30',
  [UrgencyLevel.HIGH]:     'bg-orange-500/20 text-urgency-high     border border-orange-500/30',
  [UrgencyLevel.NORMAL]:   'bg-yellow-500/20 text-urgency-normal   border border-yellow-500/30',
  [UrgencyLevel.LOW]:      'bg-green-500/20  text-urgency-low      border border-green-500/30',
}

export function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-dm font-semibold uppercase tracking-wide ${URGENCY_STYLES[urgency]}`}>
      {urgency}
    </span>
  )
}

// ── Order Status Badge ────────────────────────────────────────────────────────

const ORDER_STYLES: Record<OrderStatus, string> = {
  [OrderStatus.RECEIVED]:   'bg-slate-500/20  text-slate-300   border border-slate-500/30',
  [OrderStatus.PREPARING]:  'bg-yellow-500/20 text-yellow-400  border border-yellow-500/30',
  [OrderStatus.DELIVERING]: 'bg-blue-500/20   text-blue-400    border border-blue-500/30',
  [OrderStatus.DELIVERED]:  'bg-green-500/20  text-green-400   border border-green-500/30',
}

export function OrderBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-dm font-semibold uppercase tracking-wide ${ORDER_STYLES[status]}`}>
      {status}
    </span>
  )
}

// ── Generic Badge ─────────────────────────────────────────────────────────────

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-dm font-semibold ${className}`}>
      {children}
    </span>
  )
}
