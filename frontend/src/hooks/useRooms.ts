import { useEffect } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'
import { receptionApi } from '@/api/reception'
import { roomServiceApi } from '@/api/roomService'
import { maintenanceApi } from '@/api/maintenance'
import { Room } from '@/types'

/** Fetch all domain data on mount and populate the Zustand store. */
export function useInitData() {
  const { setRooms, setGuests, setOrders, setMaintenance } = useDashboardStore()

  useEffect(() => {
    receptionApi.getRooms().then(setRooms).catch(console.error)
    receptionApi.getGuests().then(setGuests).catch(console.error)
    roomServiceApi.getOrders().then(setOrders).catch(console.error)
    maintenanceApi.getAllReports().then(setMaintenance).catch(console.error)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Derive computed selectors from the rooms slice. */
export function useRoomStats() {
  const rooms = useDashboardStore((s) => s.rooms)
  const list  = Object.values(rooms) as Room[]

  return {
    total:       list.length,
    clean:       list.filter((r) => r.status === 'CLEAN').length,
    dirty:       list.filter((r) => r.status === 'DIRTY').length,
    cleaning:    list.filter((r) => r.status === 'CLEANING').length,
    occupied:    list.filter((r) => r.status === 'OCCUPIED').length,
    maintenance: list.filter((r) => r.status === 'MAINTENANCE').length,
  }
}
