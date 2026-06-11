import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { UserPlus, LogOut, BedDouble } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'

import { getGuests, checkin, checkout } from '@/api/reception'
import { Button }      from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Card }        from '@/components/ui/Card'
import { Modal }       from '@/components/ui/Modal'
import { Table, THead, Th, TBody, Tr, Td, EmptyRow } from '@/components/ui/Table'
import { RoomType } from '@/types'
import type { CheckinForm, Guest, BillResponse } from '@/types'

// ── Check-in form ─────────────────────────────────────────────────────────────

function CheckinPanel() {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CheckinForm>({
    defaultValues: { room_type: RoomType.SINGLE },
  })

  const mutation = useMutation({
    mutationFn: checkin,
    onSuccess: (data, variables) => {
      toast.success(`${variables.name} checked in to room ${data.room_number}`)
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['guests'] })
      reset()
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Check-in failed')
    },
  })

  return (
    <Card className="p-6">
      <h2 className="font-sora font-semibold text-white text-sm mb-6 flex items-center gap-2">
        <UserPlus size={16} className="text-accent" />
        New Check-In
      </h2>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input
          label="Guest Name"
          placeholder="John Smith"
          {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 characters' } })}
          error={errors.name?.message}
        />

        <Select
          label="Room Type"
          {...register('room_type')}
        >
          {Object.values(RoomType).map((t) => (
            <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
          ))}
        </Select>

        <Input
          label="Floor Preference (optional)"
          type="number"
          min={1}
          max={2}
          placeholder="1 or 2"
          {...register('floor_preference', { valueAsNumber: true })}
        />

        <Select
          label="Location Preference (optional)"
          {...register('proximity_preference')}
        >
          <option value="">No preference</option>
          <option value="near_elevator">Near Elevator</option>
          <option value="near_stairs">Near Stairs</option>
          <option value="middle">Middle</option>
        </Select>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={mutation.isPending}
        >
          Check In Guest
        </Button>
      </form>
    </Card>
  )
}

// ── Active guests table ───────────────────────────────────────────────────────

function GuestsPanel() {
  const qc = useQueryClient()
  const [checkoutGuest, setCheckoutGuest] = useState<Guest | null>(null)
  const [bill, setBill]                   = useState<BillResponse | null>(null)

  const { data: guests = [], isLoading } = useQuery<Guest[]>({
    queryKey: ['guests'],
    queryFn: getGuests,
    refetchInterval: 30_000,
  })

  const mutation = useMutation({
    mutationFn: (guestId: string) => checkout(guestId),
    onSuccess: (data) => {
      setBill(data)
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['guests'] })
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Checkout failed')
      setCheckoutGuest(null)
    },
  })

  const handleCheckout = () => {
    if (!checkoutGuest) return
    mutation.mutate(checkoutGuest.guest_id)
  }

  const closeModal = () => {
    setCheckoutGuest(null)
    setBill(null)
  }

  // Backend removes guests on checkout, so all returned guests are active
  const activeGuests = guests.filter((g) => g.room_number !== null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BedDouble size={16} className="text-accent" />
        <h2 className="font-sora font-semibold text-white text-sm">
          Active Guests ({activeGuests.length})
        </h2>
      </div>

      <Table>
        <THead>
          <Th>Guest</Th>
          <Th>Room</Th>
          <Th>Type</Th>
          <Th>Checked In</Th>
          <Th>Duration</Th>
          <Th />
        </THead>
        <TBody>
          {isLoading && <EmptyRow cols={6} message="Loading guests…" />}
          {!isLoading && activeGuests.length === 0 && (
            <EmptyRow cols={6} message="No active guests" />
          )}
          {activeGuests.map((g) => (
            <Tr key={g.guest_id}>
              <Td>
                <p className="text-white font-medium text-sm">{g.name}</p>
                <p className="text-xs text-slate-500 capitalize">
                  {g.proximity_preference?.replace(/_/g, ' ') ?? '—'}
                </p>
              </Td>
              <Td>
                <span className="font-mono text-accent">{g.room_number ?? '—'}</span>
              </Td>
              <Td>
                <span className="text-xs capitalize text-slate-400">
                  {g.room_type_requested.toLowerCase()}
                </span>
              </Td>
              <Td>
                <span className="text-xs">
                  {new Date(g.check_in_time).toLocaleString('en-GB', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </Td>
              <Td>
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(parseISO(g.check_in_time), { addSuffix: false })}
                </span>
              </Td>
              <Td>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setCheckoutGuest(g)}
                >
                  <LogOut size={13} />
                  Check Out
                </Button>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>

      {/* Checkout confirmation / bill modal */}
      <Modal
        open={!!checkoutGuest}
        onClose={closeModal}
        title={bill ? 'Checkout Complete' : `Check Out — ${checkoutGuest?.name}`}
      >
        {!bill ? (
          <>
            <div className="space-y-2 text-sm font-dm text-slate-300">
              <p>Are you sure you want to check out <strong className="text-white">{checkoutGuest?.name}</strong>?</p>
              <p className="text-slate-500">Room <span className="text-accent font-mono">{checkoutGuest?.room_number}</span> will be marked dirty for housekeeping.</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button variant="danger" loading={mutation.isPending} onClick={handleCheckout}>
                Confirm Checkout
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-navy-700 rounded-lg p-4 space-y-2 text-sm font-dm">
              <div className="flex justify-between text-slate-400">
                <span>Room</span>
                <span className="text-white font-mono">{bill.room_number}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Nights</span>
                <span className="text-white">{bill.nights}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Rate / night</span>
                <span className="text-white">${bill.room_rate_per_night.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Room total</span>
                <span className="text-white">${bill.room_total.toFixed(2)}</span>
              </div>
              {bill.discount_applied > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Long-stay discount</span>
                  <span>−${bill.discount_applied.toFixed(2)}</span>
                </div>
              )}
              {bill.service_charges > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Service charges</span>
                  <span className="text-white">${bill.service_charges.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-navy-400 pt-2 flex justify-between font-semibold text-white">
                <span>Grand Total</span>
                <span className="text-accent text-base">${bill.grand_total.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button variant="primary" onClick={closeModal}>Done</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Reception() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 animate-fade-in">
      <div className="xl:col-span-2">
        <CheckinPanel />
      </div>
      <div className="xl:col-span-3">
        <GuestsPanel />
      </div>
    </div>
  )
}
