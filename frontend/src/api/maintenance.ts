import { maintenanceHttp } from './axios'
import { MaintenanceRequest, MaintenanceQueueResponse, CreateReportForm } from '@/types'

export const maintenanceApi = {
  getQueue: async (): Promise<MaintenanceQueueResponse> => {
    const { data } = await maintenanceHttp.get<MaintenanceQueueResponse>('/queue')
    return data
  },

  getAllReports: async (): Promise<MaintenanceRequest[]> => {
    const { data } = await maintenanceHttp.get<MaintenanceRequest[]>('/reports')
    return data
  },

  createReport: async (form: CreateReportForm): Promise<MaintenanceRequest> => {
    const { data } = await maintenanceHttp.post<MaintenanceRequest>('/reports', form)
    return data
  },

  resolveReport: async (requestId: string): Promise<MaintenanceRequest> => {
    const { data } = await maintenanceHttp.post<MaintenanceRequest>(
      `/reports/${requestId}/resolve`,
    )
    return data
  },
}

export const { getQueue, getAllReports, createReport, resolveReport } = maintenanceApi
