import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:   string
  error?:   string
  hint?:    string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string
  error?:    string
  children:  React.ReactNode
}

const baseInput =
  'w-full bg-navy-700 border border-navy-400 rounded-lg px-3 py-2 text-sm text-slate-200 ' +
  'placeholder:text-slate-500 font-dm ' +
  'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 ' +
  'transition-colors disabled:opacity-50'

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-dm font-semibold text-slate-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`${baseInput} ${error ? 'border-red-500/60 focus:ring-red-500/30' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint  && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  ),
)
Input.displayName = 'Input'

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className = '', ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-dm font-semibold text-slate-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`${baseInput} ${error ? 'border-red-500/60' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  ),
)
Select.displayName = 'Select'
