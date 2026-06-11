import React from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  icon?:     React.ReactNode
  children?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-gradient-accent text-white hover:opacity-90 shadow-lg shadow-accent/20',
  secondary: 'bg-navy-600 text-slate-200 border border-navy-400 hover:bg-navy-500',
  danger:    'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30',
  ghost:     'text-slate-400 hover:text-white hover:bg-navy-600',
  success:   'bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2   text-sm gap-2',
  lg: 'px-6 py-2.5 text-base gap-2',
}

export function Button({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-dm font-medium rounded-lg',
        'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/40',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" size={14} /> : icon}
      {children}
    </button>
  )
}
