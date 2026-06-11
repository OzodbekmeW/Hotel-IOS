import { receptionHttp } from './axios'
import { Room, Guest, CheckinForm, CheckinResponse, BillResponse } from '@/types'

export const receptionApi = {
  getRooms: async (): Promise<Room[]> => {
    const { data } = await receptionHttp.get<Room[]>('/rooms')
    return data
  },

  getRoom: async (roomNumber: string): Promise<Room> => {
    const { data } = await receptionHttp.get<Room>(`/rooms/${roomNumber}`)
    return data
  },

  getGuests: async (): Promise<Guest[]> => {
    const { data } = await receptionHttp.get<Guest[]>('/guests')
    return data
  },

  checkin: async (form: CheckinForm): Promise<CheckinResponse> => {
    const body: Record<string, unknown> = {
      name:      form.name,
      room_type: form.room_type,
    }
    if (form.floor_preference)    body.floor_preference    = form.floor_preference
    if (form.proximity_preference) body.proximity_preference = form.proximity_preference

    const { data } = await receptionHttp.post<CheckinResponse>('/checkin', body)
    return data
  },

  checkout: async (guestId: string): Promise<BillResponse> => {
    const { data } = await receptionHttp.post<BillResponse>(`/checkout/${guestId}`)
    return data
  },
}

export const { getRooms, getRoom, getGuests, checkin, checkout } = receptionApi
