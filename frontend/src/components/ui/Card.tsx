import React from 'react'

interface CardProps {
  children:   React.ReactNode
  className?: string
  glow?:      boolean
  onClick?:   () => void
}

export function Card({ children, className = '', glow = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-gradient-card rounded-xl border border-navy-400/50',
        'transition-all duration-300',
        glow ? 'ring-2 ring-accent/50 shadow-lg shadow-accent/20 animate-status-glow' : '',
        onClick ? 'cursor-pointer hover:border-accent/40 hover:-translate-y-0.5' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  label:     string
  value:     number | string
  icon:      React.ReactNode
  accent?:   string
  sublabel?: string
}

export function StatCard({ label, value, icon, accent = 'text-accent', sublabel }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-dm font-semibold text-slate-400 uppercase tracking-widest">
          {label}
        </span>
        <span className={`${accent} opacity-80`}>{icon}</span>
      </div>
      <div className={`text-3xl font-sora font-bold ${accent} animate-count-up`}>{value}</div>
      {sublabel && <p className="text-xs text-slate-500 mt-1">{sublabel}</p>}
    </Card>
  )
}
