import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface ModalProps {
  open:      boolean
  onClose:   () => void
  title:     string
  children:  React.ReactNode
  footer?:   React.ReactNode
  size?:     'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div
        className={[
          'relative w-full mx-4 bg-navy-600 border border-navy-400 rounded-2xl shadow-2xl',
          'animate-fade-in',
          sizeMap[size],
        ].join(' ')}
      >
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-400">
          <h2 className="font-sora font-semibold text-white text-lg">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <X size={18} />
          </Button>
        </div>

        {/* body */}
        <div className="px-6 py-5">{children}</div>

        {/* footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-navy-400 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
