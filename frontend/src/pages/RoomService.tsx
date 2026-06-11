import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import toast from 'react-hot-toast'
import { UtensilsCrossed, Plus, Trash2, ArrowRight } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'

import { getOrders, createOrder, updateStatus } from '@/api/roomService'
import { Button }       from '@/components/ui/Button'
import { Input }        from '@/components/ui/Input'
import { Card }         from '@/components/ui/Card'
import { OrderBadge }   from '@/components/ui/Badge'
import { Table, THead, Th, TBody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { OrderStatus }  from '@/types'
import type { RoomOrder } from '@/types'

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.RECEIVED]:   OrderStatus.PREPARING,
  [OrderStatus.PREPARING]:  OrderStatus.DELIVERING,
  [OrderStatus.DELIVERING]: OrderStatus.DELIVERED,
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.RECEIVED]:   'Start Preparing',
  [OrderStatus.PREPARING]:  'Out for Delivery',
  [OrderStatus.DELIVERING]: 'Mark Delivered',
}

// ── New order form ────────────────────────────────────────────────────────────

interface OrderForm {
  room_number: string
  items: { name: string; quantity: number; price: number }[]
}

function NewOrderPanel() {
  const qc = useQueryClient()
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<OrderForm>({
    defaultValues: { items: [{ name: '', quantity: 1, price: 0 }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (data) => {
      toast.success(`Order #${data.order_id.slice(0, 8)} placed for room ${data.room_number}`)
      qc.invalidateQueries({ queryKey: ['orders'] })
      reset({ items: [{ name: '', quantity: 1, price: 0 }] })
    },
    onError: (err: any) => toast.error(err.message ?? 'Failed to place order'),
  })

  return (
    <Card className="p-6">
      <h2 className="font-sora font-semibold text-white text-sm mb-6 flex items-center gap-2">
        <UtensilsCrossed size={16} className="text-accent" />
        New Order
      </h2>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input
          label="Room Number"
          placeholder="101"
          {...register('room_number', { required: 'Room required' })}
          error={errors.room_number?.message}
        />

        <div className="space-y-2">
          <label className="block text-xs font-dm font-medium text-slate-400">Items</label>
          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-[1fr_56px_72px_32px] gap-2 items-start">
              <Input
                placeholder="Item name"
                {...register(`items.${idx}.name`, { required: 'Name required' })}
                error={errors.items?.[idx]?.name?.message}
              />
              <Input
                type="number"
                min={1}
                placeholder="Qty"
                {...register(`items.${idx}.quantity`, { valueAsNumber: true, min: 1 })}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="$"
                {...register(`items.${idx}.price`, { valueAsNumber: true, min: 0 })}
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                disabled={fields.length === 1}
                className="mt-1.5 p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => append({ name: '', quantity: 1, price: 0 })}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-dm transition-colors"
          >
            <Plus size={12} /> Add item
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={mutation.isPending}
        >
          Place Order
        </Button>
      </form>
    </Card>
  )
}

// ── Active orders table ───────────────────────────────────────────────────────

function ActiveOrdersPanel() {
  const qc = useQueryClient()

  const { data: orders = [], isLoading } = useQuery<RoomOrder[]>({
    queryKey: ['orders'],
    queryFn: getOrders,
    refetchInterval: 15_000,
  })

  const mutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      updateStatus(orderId, status),
    onSuccess: () => {
      toast.success('Order status updated')
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (err: any) => toast.error(err.message ?? 'Update failed'),
  })

  const active = orders.filter((o) => o.status !== OrderStatus.DELIVERED)
  const done   = orders.filter((o) => o.status === OrderStatus.DELIVERED).slice(0, 5)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <UtensilsCrossed size={16} className="text-accent" />
        <h2 className="font-sora font-semibold text-white text-sm">
          Active Orders ({active.length})
        </h2>
      </div>

      <Table>
        <THead>
          <Th>Order</Th>
          <Th>Room</Th>
          <Th>Items</Th>
          <Th>Total</Th>
          <Th>Status</Th>
          <Th>Time</Th>
          <Th />
        </THead>
        <TBody>
          {isLoading && <EmptyRow cols={7} message="Loading orders…" />}
          {!isLoading && active.length === 0 && (
            <EmptyRow cols={7} message="No active orders" />
          )}
          {active.map((o) => {
            const next = NEXT_STATUS[o.status]
            const label = NEXT_LABEL[o.status]
            return (
              <Tr key={o.order_id}>
                <Td>
                  <span className="font-mono text-xs text-slate-500">{o.order_id.slice(0, 8)}</span>
                </Td>
                <Td>
                  <span className="font-mono text-accent">{o.room_number}</span>
                </Td>
                <Td>
                  <div className="text-xs text-slate-300 max-w-[180px]">
                    {o.items.map((i: any, idx: number) => (
                      <span key={idx} className="block truncate">{i.quantity}× {i.name}</span>
                    ))}
                  </div>
                </Td>
                <Td>
                  <span className="font-dm font-semibold text-white">
                    ${o.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0).toFixed(2)}
                  </span>
                </Td>
                <Td><OrderBadge status={o.status} /></Td>
                <Td>
                  <span className="text-xs text-slate-500">
                    {formatDistanceToNow(parseISO(o.created_at), { addSuffix: true })}
                  </span>
                </Td>
                <Td>
                  {next && label && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={mutation.isPending}
                      onClick={() => mutation.mutate({ orderId: o.order_id, status: next })}
                    >
                      <ArrowRight size={13} />
                      {label}
                    </Button>
                  )}
                </Td>
              </Tr>
            )
          })}
        </TBody>
      </Table>

      {done.length > 0 && (
        <details className="text-xs text-slate-500 font-dm">
          <summary className="cursor-pointer select-none hover:text-slate-300 transition-colors">
            Recent completed ({done.length})
          </summary>
          <div className="mt-2 space-y-1 pl-2 border-l border-navy-400/30">
            {done.map((o) => (
              <div key={o.order_id} className="flex gap-4">
                <span className="font-mono">{o.order_id.slice(0, 8)}</span>
                <span>Room {o.room_number}</span>
                <OrderBadge status={o.status} />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RoomService() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 animate-fade-in">
      <div className="xl:col-span-2">
        <NewOrderPanel />
      </div>
      <div className="xl:col-span-3">
        <ActiveOrdersPanel />
      </div>
    </div>
  )
}
