import { roomServiceHttp } from './axios'
import { RoomOrder, OrderStatus, OrderItem } from '@/types'

interface CreateOrderPayload {
  room_number: string
  items:       OrderItem[]
}

export const roomServiceApi = {
  getOrders: async (): Promise<RoomOrder[]> => {
    const { data } = await roomServiceHttp.get<RoomOrder[]>('/orders')
    return data
  },

  getOrder: async (orderId: string): Promise<RoomOrder> => {
    const { data } = await roomServiceHttp.get<RoomOrder>(`/orders/${orderId}`)
    return data
  },

  createOrder: async (payload: CreateOrderPayload): Promise<RoomOrder> => {
    const { data } = await roomServiceHttp.post<RoomOrder>('/orders', payload)
    return data
  },

  updateStatus: async (orderId: string, status: OrderStatus): Promise<RoomOrder> => {
    const { data } = await roomServiceHttp.post<RoomOrder>(
      `/orders/${orderId}/status`,
      { status },
    )
    return data
  },
}

export const { getOrders, getOrder, createOrder, updateStatus } = roomServiceApi
