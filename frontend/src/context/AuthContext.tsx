import React, { createContext, useContext, useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  username:    string
  displayName: string
  role:        string
}

interface UserRecord {
  password:    string
  role:        string
  displayName: string
}

interface AuthContextValue {
  user:     AuthUser | null
  login:    (username: string, password: string) => boolean
  logout:   () => void
  register: (username: string, displayName: string, role: string, password: string) => { ok: boolean; error?: string }
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const AUTH_KEY  = 'hotel_os_auth'
const USERS_KEY = 'hotel_os_users'

// ── Default built-in credentials ──────────────────────────────────────────────

const DEFAULT_USERS: Record<string, UserRecord> = {
  admin:        { password: 'hotel2024',    role: 'Administrator',    displayName: 'Admin'        },
  reception:    { password: 'front2024',    role: 'Reception Staff',  displayName: 'Reception'    },
  housekeeping: { password: 'clean2024',    role: 'Housekeeping',     displayName: 'Housekeeping' },
  manager:      { password: 'manager2024',  role: 'Hotel Manager',    displayName: 'Manager'      },
}

function loadUsers(): Record<string, UserRecord> {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    const extra = raw ? (JSON.parse(raw) as Record<string, UserRecord>) : {}
    return { ...DEFAULT_USERS, ...extra }
  } catch {
    return { ...DEFAULT_USERS }
  }
}

function saveExtraUser(username: string, record: UserRecord) {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    const extra = raw ? (JSON.parse(raw) as Record<string, UserRecord>) : {}
    extra[username] = record
    localStorage.setItem(USERS_KEY, JSON.stringify(extra))
  } catch { /* ignore */ }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY)
      return saved ? (JSON.parse(saved) as AuthUser) : null
    } catch {
      return null
    }
  })

  const login = useCallback((username: string, password: string): boolean => {
    const users  = loadUsers()
    const record = users[username.toLowerCase().trim()]
    if (!record || record.password !== password) return false

    const authUser: AuthUser = {
      username:    username.toLowerCase().trim(),
      displayName: record.displayName,
      role:        record.role,
    }
    setUser(authUser)
    localStorage.setItem(AUTH_KEY, JSON.stringify(authUser))
    return true
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(AUTH_KEY)
  }, [])

  const register = useCallback(
    (username: string, displayName: string, role: string, password: string): { ok: boolean; error?: string } => {
      const key = username.toLowerCase().trim()
      if (!key) return { ok: false, error: 'Username is required.' }
      if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }

      const users = loadUsers()
      if (users[key]) return { ok: false, error: 'Username already exists.' }

      const record: UserRecord = { password, role, displayName: displayName.trim() || username }
      saveExtraUser(key, record)

      const authUser: AuthUser = { username: key, displayName: record.displayName, role }
      setUser(authUser)
      localStorage.setItem(AUTH_KEY, JSON.stringify(authUser))
      return { ok: true }
    },
    [],
  )

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
