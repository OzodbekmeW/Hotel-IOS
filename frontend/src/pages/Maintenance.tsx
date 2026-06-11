import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Wrench, Plus, CheckCircle } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'

import { getAllReports, createReport, resolveReport } from '@/api/maintenance'
import { Button }       from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card }         from '@/components/ui/Card'
import { UrgencyBadge } from '@/components/ui/Badge'
import { Table, THead, Th, TBody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { UrgencyLevel } from '@/types'
import type { CreateReportForm, MaintenanceRequest } from '@/types'

const URGENCY_ORDER: Record<UrgencyLevel, number> = {
  [UrgencyLevel.CRITICAL]: 0,
  [UrgencyLevel.HIGH]:     1,
  [UrgencyLevel.NORMAL]:   2,
  [UrgencyLevel.LOW]:      3,
}

// ── New report form ───────────────────────────────────────────────────────────

function NewReportPanel() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateReportForm>({
    defaultValues: { urgency: UrgencyLevel.NORMAL },
  })

  const mutation = useMutation({
    mutationFn: createReport,
    onSuccess: (data) => {
      toast.success(`Report #${data.request_id.slice(0, 8)} submitted — assigned to ${data.assigned_technician ?? 'queue'}`)
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      reset()
      setOpen(false)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Submit failed'),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-accent" />
          <h2 className="font-sora font-semibold text-white text-sm">Maintenance Queue</h2>
        </div>
        <Button variant="primary" size="sm" onClick={() => setOpen((o) => !o)}>
          <Plus size={14} />
          {open ? 'Cancel' : 'New Report'}
        </Button>
      </div>

      {open && (
        <Card className="p-5 mb-6 animate-fade-in">
          <h3 className="font-sora font-semibold text-white text-xs mb-4 uppercase tracking-wider">
            Submit Maintenance Request
          </h3>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Room Number"
                placeholder="101"
                {...register('room_number', { required: 'Room required', pattern: { value: /^\d{3}$/, message: '3-digit room number' } })}
                error={errors.room_number?.message}
              />
              <Select
                label="Urgency"
                {...register('urgency')}
              >
                {Object.values(UrgencyLevel).map((u) => (
                  <option key={u} value={u}>
                    {u.charAt(0) + u.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-dm font-medium text-slate-400">
                Issue Description <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Describe the issue (e.g. Broken AC unit, water leak under sink)…"
                className="w-full rounded-lg bg-navy-700 border border-navy-400 text-slate-200 placeholder-slate-600 text-sm font-dm px-3 py-2 focus:outline-none focus:border-accent/70 focus:ring-1 focus:ring-accent/30 resize-none transition-colors"
                {...register('description', { required: 'Description required', minLength: { value: 5, message: 'Min 5 characters' } })}
              />
              {errors.description && (
                <p className="text-xs text-red-400 font-dm">{errors.description.message}</p>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={mutation.isPending}
            >
              Submit Request
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}

// ── Priority queue table ──────────────────────────────────────────────────────

function QueueTable() {
  const qc = useQueryClient()

  const { data: reports = [], isLoading } = useQuery<MaintenanceRequest[]>({
    queryKey: ['maintenance'],
    queryFn: getAllReports,
    refetchInterval: 20_000,
  })

  const mutation = useMutation({
    mutationFn: resolveReport,
    onSuccess: () => {
      toast.success('Issue resolved!')
      qc.invalidateQueries({ queryKey: ['maintenance'] })
    },
    onError: (err: Error) => toast.error(err.message ?? 'Resolve failed'),
  })

  const open = [...reports]
    .filter((r) => !r.resolved)
    .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency])

  const resolved = reports.filter((r) => r.resolved).slice(0, 10)

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 font-dm">
        {open.length} open · sorted by priority
      </p>

      <Table>
        <THead>
          <Th>ID</Th>
          <Th>Room</Th>
          <Th>Description</Th>
          <Th>Urgency</Th>
          <Th>Assigned</Th>
          <Th>Reported</Th>
          <Th />
        </THead>
        <TBody>
          {isLoading && <EmptyRow cols={7} message="Loading queue…" />}
          {!isLoading && open.length === 0 && (
            <EmptyRow cols={7} message="Queue is clear — no open issues" />
          )}
          {open.map((r) => (
            <Tr key={r.request_id} highlight={r.urgency === UrgencyLevel.CRITICAL}>
              <Td>
                <span className="font-mono text-xs text-slate-500">{r.request_id.slice(0, 8)}</span>
              </Td>
              <Td>
                <span className="font-mono text-accent">{r.room_number}</span>
              </Td>
              <Td>
                <p className="text-sm text-slate-200 max-w-[260px] truncate">{r.description}</p>
              </Td>
              <Td>
                <UrgencyBadge urgency={r.urgency} />
              </Td>
              <Td>
                <span className="text-xs text-slate-400">{r.assigned_technician ?? '—'}</span>
              </Td>
              <Td>
                <span className="text-xs text-slate-500">
                  {formatDistanceToNow(parseISO(r.created_at), { addSuffix: true })}
                </span>
              </Td>
              <Td>
                <Button
                  variant="success"
                  size="sm"
                  loading={mutation.isPending}
                  onClick={() => mutation.mutate(r.request_id)}
                >
                  <CheckCircle size={13} />
                  Resolve
                </Button>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>

      {resolved.length > 0 && (
        <details className="text-xs text-slate-500 font-dm">
          <summary className="cursor-pointer select-none hover:text-slate-300 transition-colors">
            Recently resolved ({resolved.length})
          </summary>
          <div className="mt-2 space-y-1 pl-2 border-l border-navy-400/30">
            {resolved.map((r) => (
              <div key={r.request_id} className="flex items-center gap-4">
                <span className="font-mono">{r.request_id.slice(0, 8)}</span>
                <span>Room {r.room_number}</span>
                <span className="text-slate-400 truncate max-w-[200px]">{r.description}</span>
                <UrgencyBadge urgency={r.urgency} />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Maintenance() {
  return (
    <div className="animate-fade-in space-y-0">
      <NewReportPanel />
      <QueueTable />
    </div>
  )
}
