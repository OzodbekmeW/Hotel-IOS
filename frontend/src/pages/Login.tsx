import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Hotel, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from       = (location.state as { from?: string })?.from ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [shake,    setShake]    = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Please enter your username and password.')
      return
    }

    setLoading(true)
    setError('')

    // Simulate a brief network delay for UX realism
    await new Promise((r) => setTimeout(r, 600))

    const ok = login(username, password)
    setLoading(false)

    if (ok) {
      navigate(from, { replace: true })
    } else {
      setError('Invalid username or password.')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(56,189,248,1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(56,189,248,1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Glow blob */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className={`relative w-full max-w-md animate-fade-in ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>

        {/* Card */}
        <div className="bg-navy-900/90 backdrop-blur-md rounded-2xl border border-navy-400/40 shadow-2xl overflow-hidden">

          {/* Header stripe */}
          <div className="h-1 w-full bg-gradient-accent" />

          <div className="px-8 py-10">

            {/* Logo */}
            <div className="flex flex-col items-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-lg shadow-accent/30 mb-4">
                <Hotel size={26} className="text-navy-950" />
              </div>
              <h1 className="font-sora font-bold text-white text-2xl tracking-tight">HotelOS</h1>
              <p className="text-slate-500 font-dm text-sm mt-1">Operations Management Suite</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 animate-fade-in">
                  <AlertCircle size={15} className="text-red-400 shrink-0" />
                  <p className="text-sm font-dm text-red-300">{error}</p>
                </div>
              )}

              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-dm font-semibold text-slate-400 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError('') }}
                  placeholder="admin"
                  autoComplete="username"
                  autoFocus
                  className="w-full rounded-xl bg-navy-800 border border-navy-400/60 text-white placeholder-slate-600 text-sm font-dm px-4 py-3 focus:outline-none focus:border-accent/70 focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-dm font-semibold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-xl bg-navy-800 border border-navy-400/60 text-white placeholder-slate-600 text-sm font-dm px-4 py-3 pr-11 focus:outline-none focus:border-accent/70 focus:ring-2 focus:ring-accent/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-accent text-navy-950 font-sora font-semibold text-sm shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Link to register */}
            <p className="mt-6 text-center text-sm font-dm text-slate-500">
              New staff member?{' '}
              <Link
                to="/register"
                className="text-accent hover:text-accent/80 font-semibold transition-colors"
              >
                Create Account
              </Link>
            </p>

            {/* Credential hints */}
            <div className="mt-4 p-4 rounded-xl bg-navy-800/60 border border-navy-400/30">
              <p className="text-xs font-dm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Staff Accounts
              </p>
              <div className="space-y-1.5">
                {[
                  { user: 'admin',        pw: 'hotel2024',   role: 'Administrator'   },
                  { user: 'reception',    pw: 'front2024',   role: 'Reception Staff' },
                  { user: 'housekeeping', pw: 'clean2024',   role: 'Housekeeping'    },
                  { user: 'manager',      pw: 'manager2024', role: 'Hotel Manager'   },
                ].map(({ user, pw, role }) => (
                  <button
                    key={user}
                    type="button"
                    onClick={() => { setUsername(user); setPassword(pw); setError('') }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-navy-700/60 transition-colors group text-left"
                  >
                    <span className="text-xs font-dm text-slate-400 group-hover:text-slate-200 transition-colors">
                      <span className="text-accent font-semibold">{user}</span> · {pw}
                    </span>
                    <span className="text-[10px] font-dm text-slate-600 group-hover:text-slate-500">
                      {role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-700 font-dm mt-6">
          HotelOS v1.0.0 · BTEC University Assignment
        </p>
      </div>
    </div>
  )
}
