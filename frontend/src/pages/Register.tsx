import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Hotel, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const ROLES = [
  'Administrator',
  'Reception Staff',
  'Housekeeping',
  'Hotel Manager',
  'Maintenance Staff',
  'Room Service Staff',
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [username,    setUsername]    = useState('')
  const [role,        setRole]        = useState(ROLES[0])
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [showCf,      setShowCf]      = useState(false)
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [shake,       setShake]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!displayName.trim()) { setError('Full name is required.'); return }
    if (!username.trim())    { setError('Username is required.'); return }
    if (!password)           { setError('Password is required.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); triggerShake(); return }

    setLoading(true)
    await new Promise((r) => setTimeout(r, 500))

    const result = register(username, displayName, role, password)
    setLoading(false)

    if (result.ok) {
      navigate('/', { replace: true })
    } else {
      setError(result.error ?? 'Registration failed.')
      triggerShake()
    }
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const clearError = () => setError('')

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      {/* Background grid */}
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

        <div className="bg-navy-900/90 backdrop-blur-md rounded-2xl border border-navy-400/40 shadow-2xl overflow-hidden">
          {/* Top accent stripe */}
          <div className="h-1 w-full bg-gradient-accent" />

          <div className="px-8 py-10">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-lg shadow-accent/30 mb-4">
                <Hotel size={26} className="text-navy-950" />
              </div>
              <h1 className="font-sora font-bold text-white text-2xl tracking-tight">Create Account</h1>
              <p className="text-slate-500 font-dm text-sm mt-1">Register new staff member</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 animate-fade-in">
                  <AlertCircle size={15} className="text-red-400 shrink-0" />
                  <p className="text-sm font-dm text-red-300">{error}</p>
                </div>
              )}

              {/* Full name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-dm font-semibold text-slate-400 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); clearError() }}
                  placeholder="John Smith"
                  autoComplete="name"
                  autoFocus
                  className="w-full rounded-xl bg-navy-800 border border-navy-400/60 text-white placeholder-slate-600 text-sm font-dm px-4 py-3 focus:outline-none focus:border-accent/70 focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-dm font-semibold text-slate-400 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/\s/g, '')); clearError() }}
                  placeholder="johnsmith"
                  autoComplete="username"
                  className="w-full rounded-xl bg-navy-800 border border-navy-400/60 text-white placeholder-slate-600 text-sm font-dm px-4 py-3 focus:outline-none focus:border-accent/70 focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="block text-xs font-dm font-semibold text-slate-400 uppercase tracking-wider">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl bg-navy-800 border border-navy-400/60 text-white text-sm font-dm px-4 py-3 focus:outline-none focus:border-accent/70 focus:ring-2 focus:ring-accent/20 transition-all"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
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
                    onChange={(e) => { setPassword(e.target.value); clearError() }}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
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
                {/* Strength indicator */}
                {password.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={[
                          'h-1 flex-1 rounded-full transition-all duration-300',
                          password.length >= level * 4
                            ? level === 1 ? 'bg-red-400' : level === 2 ? 'bg-yellow-400' : 'bg-green-400'
                            : 'bg-navy-600',
                        ].join(' ')}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-dm font-semibold text-slate-400 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showCf ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); clearError() }}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className={[
                      'w-full rounded-xl bg-navy-800 border text-white placeholder-slate-600 text-sm font-dm px-4 py-3 pr-11',
                      'focus:outline-none focus:ring-2 transition-all',
                      confirm && password && confirm === password
                        ? 'border-green-500/60 focus:ring-green-500/20'
                        : confirm && password && confirm !== password
                        ? 'border-red-500/60 focus:ring-red-500/20'
                        : 'border-navy-400/60 focus:ring-accent/20 focus:border-accent/70',
                    ].join(' ')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCf((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showCf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {confirm && password === confirm && (
                    <CheckCircle2 size={15} className="absolute right-9 top-1/2 -translate-y-1/2 text-green-400" />
                  )}
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
                    Creating account…
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Create Account
                  </>
                )}
              </button>
            </form>

            {/* Link to login */}
            <p className="mt-6 text-center text-sm font-dm text-slate-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-accent hover:text-accent/80 font-semibold transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-700 font-dm mt-6">
          HotelOS v1.0.0 · BTEC University Assignment
        </p>
      </div>
    </div>
  )
}
