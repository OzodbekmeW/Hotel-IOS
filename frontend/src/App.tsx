import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { useAuth } from '@/context/AuthContext'

const Login        = lazy(() => import('@/pages/Login'))
const Register     = lazy(() => import('@/pages/Register'))
const Dashboard    = lazy(() => import('@/pages/Dashboard'))
const Reception    = lazy(() => import('@/pages/Reception'))
const Housekeeping = lazy(() => import('@/pages/Housekeeping'))
const RoomService  = lazy(() => import('@/pages/RoomService'))
const Maintenance  = lazy(() => import('@/pages/Maintenance'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <p className="text-xs text-slate-500 font-dm">Loading…</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user }   = useAuth()
  const location   = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* Public */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />

        {/* Protected — all wrapped in the main layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index             element={<Dashboard />} />
          <Route path="reception"   element={<Reception />} />
          <Route path="housekeeping" element={<Housekeeping />} />
          <Route path="room-service" element={<RoomService />} />
          <Route path="maintenance"  element={<Maintenance />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
