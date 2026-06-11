import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header }  from './Header'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useInitData }  from '@/hooks/useRooms'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { status } = useWebSocket()

  // Fetch initial data from all services and populate Zustand store
  useInitData()

  return (
    <div className="flex h-screen bg-navy-950 text-slate-200 font-dm overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          wsStatus={status}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
