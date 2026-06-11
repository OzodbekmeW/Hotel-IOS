import axios from 'axios'
import toast from 'react-hot-toast'

function makeInstance(baseURL: string) {
  const instance = axios.create({ baseURL, timeout: 8000 })

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      const msg: string =
        (err.response?.data as { detail?: string })?.detail ??
        err.message ??
        'Unknown error'
      // Don't toast on every background request — callers decide
      return Promise.reject(new Error(msg))
    },
  )

  return instance
}

export const receptionHttp    = makeInstance(import.meta.env.VITE_RECEPTION_URL    as string)
export const housekeepingHttp = makeInstance(import.meta.env.VITE_HOUSEKEEPING_URL as string)
export const roomServiceHttp  = makeInstance(import.meta.env.VITE_ROOM_SERVICE_URL as string)
export const maintenanceHttp  = makeInstance(import.meta.env.VITE_MAINTENANCE_URL  as string)

/** Wrap any API call: shows toast on error and re-throws. */
export async function apiCall<T>(
  fn: () => Promise<T>,
  errorMessage?: string,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const msg = err instanceof Error ? err.message : (errorMessage ?? 'Request failed')
    toast.error(msg, { duration: 5000, position: 'bottom-right' })
    throw err
  }
}
