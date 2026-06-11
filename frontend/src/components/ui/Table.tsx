import React from 'react'

interface TableProps {
  children:   React.ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-navy-400/50 ${className}`}>
      <table className="w-full text-sm font-dm">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-navy-700 border-b border-navy-400">
      <tr>{children}</tr>
    </thead>
  )
}

export function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  )
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-navy-400/30">{children}</tbody>
}

export function Tr({
  children,
  className = '',
  highlight = false,
}: {
  children:   React.ReactNode
  className?: string
  highlight?: boolean
}) {
  return (
    <tr
      className={[
        'transition-colors hover:bg-navy-500/30',
        highlight ? 'bg-red-500/5 border-l-2 border-red-500' : '',
        className,
      ].join(' ')}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 text-slate-300 ${className}`}>{children}</td>
  )
}

export function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center text-slate-500 italic">
        {message}
      </td>
    </tr>
  )
}
