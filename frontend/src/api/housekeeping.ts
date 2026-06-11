import { housekeepingHttp } from './axios'
import { CleaningQueueResponse } from '@/types'

export const housekeepingApi = {
  getQueue: async (): Promise<CleaningQueueResponse> => {
    const { data } = await housekeepingHttp.get<CleaningQueueResponse>('/queue')
    return data
  },

  startCleaning: async (roomNumber: string): Promise<void> => {
    await housekeepingHttp.post(`/clean/start/${roomNumber}`)
  },

  completeCleaning: async (roomNumber: string): Promise<void> => {
    await housekeepingHttp.post(`/clean/complete/${roomNumber}`)
  },
}

export const { getQueue, startCleaning, completeCleaning } = housekeepingApi
