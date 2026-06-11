import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ConciergeBell,
  Sparkles,
  UtensilsCrossed,
  Wrench,
  Hotel,
  LogOut,
  X,
  UserCircle2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface NavItem {
  path:  string
  label: string
  icon:  React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { path: '/',             label: 'Dashboard',    icon: <LayoutDashboard size={18} /> },
  { path: '/reception',    label: 'Reception',    icon: <ConciergeBell   size={18} /> },
  { path: '/housekeeping', label: 'Housekeeping', icon: <Sparkles        size={18} /> },
  { path: '/room-service', label: 'Room Service', icon: <UtensilsCrossed size={18} /> },
  { path: '/maintenance',  label: 'Maintenance',  icon: <Wrench          size={18} /> },
]

interface SidebarProps {
  open:    boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-navy-950/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed left-0 top-0 z-40 h-full w-64 flex flex-col',
          'bg-navy-900 border-r border-navy-400/40',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-navy-400/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center shadow-lg shadow-accent/30">
              <Hotel size={16} className="text-navy-950" />
            </div>
            <div>
              <p className="font-sora font-bold text-white text-sm leading-tight">HotelOS</p>
              <p className="text-xs text-slate-500 font-dm">Operations Suite</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-dm font-medium',
                  'transition-all duration-150 group',
                  isActive
                    ? 'bg-accent/10 text-accent border-l-2 border-accent shadow-sm shadow-accent/10'
                    : 'text-slate-400 hover:text-white hover:bg-navy-700/60 border-l-2 border-transparent',
                ].join(' ')
              }
            >
              <span className="flex-shrink-0 transition-colors">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + Logout footer */}
        <div className="px-4 py-4 border-t border-navy-400/40 space-y-3">
          {/* User info */}
          {user && (
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-navy-800/60">
              <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
                <UserCircle2 size={18} className="text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-dm font-semibold text-white truncate">{user.displayName}</p>
                <p className="text-[10px] font-dm text-slate-500 truncate">{user.role}</p>
              </div>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-dm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>

          <p className="text-xs text-slate-700 font-dm px-1">v1.0.0 · BTEC Assignment</p>
        </div>
      </aside>
    </>
  )
}
