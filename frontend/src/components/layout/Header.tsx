import React from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Wifi, WifiOff, Loader2, UserCircle2 } from 'lucide-react'
import { WsStatus } from '@/hooks/useWebSocket'
import { useAuth } from '@/context/AuthContext'

const PAGE_TITLES: Record<string, string> = {
  '/':             'Dashboard',
  '/reception':    'Reception',
  '/housekeeping': 'Housekeeping',
  '/room-service': 'Room Service',
  '/maintenance':  'Maintenance',
}

interface HeaderProps {
  onMenuClick: () => void
  wsStatus:    WsStatus
}

function ConnectionBadge({ status }: { status: WsStatus }) {
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-xs font-dm font-semibold text-green-400">Live</span>
        <Wifi size={12} className="text-green-400" />
      </div>
    )
  }
  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30">
        <Loader2 size={12} className="text-yellow-400 animate-spin" />
        <span className="text-xs font-dm font-semibold text-yellow-400">Connecting</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
      <WifiOff size={12} className="text-red-400" />
      <span className="text-xs font-dm font-semibold text-red-400">Offline</span>
    </div>
  )
}

export function Header({ onMenuClick, wsStatus }: HeaderProps) {
  const location = useLocation()
  const title    = PAGE_TITLES[location.pathname] ?? 'HotelOS'
  const { user } = useAuth()

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-navy-400/40 bg-navy-900/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-700 transition-colors"
        >
          <Menu size={20} />
        </button>
        <h1 className="font-sora font-semibold text-white text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <ConnectionBadge status={wsStatus} />

        <div className="text-xs text-slate-500 font-dm hidden sm:block">
          {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>

        {user && (
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-navy-400/40">
            <UserCircle2 size={16} className="text-accent" />
            <span className="text-xs font-dm text-slate-300 font-medium">{user.displayName}</span>
          </div>
        )}
      </div>
    </header>
  )
}
