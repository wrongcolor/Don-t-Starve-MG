import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  children: ReactNode
  hint?: string
}

export function FormField({ label, error, children, hint }: FormFieldProps) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-parchment-300">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-parchment-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-blood-400">{error}</p>}
    </label>
  )
}

interface FieldsetProps {
  legend: string
  children: ReactNode
  className?: string
}

export function Fieldset({ legend, children, className = '' }: FieldsetProps) {
  return (
    <fieldset className={`rounded-lg border border-ink-700 bg-ink-900/60 p-3 space-y-2 ${className}`}>
      <legend className="px-1 font-display text-sm text-ember-400">{legend}</legend>
      {children}
    </fieldset>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`rounded-lg border border-ink-700 bg-ink-900/60 ${className}`}>{children}</div>
}

export const inputClass =
  'w-full rounded border border-ink-600 bg-ink-900 px-3 py-1.5 text-sm text-parchment-100 placeholder-parchment-400/60 focus:outline-none focus:ring-2 focus:ring-ember-400 focus:border-ember-400'

export const btnPrimary =
  'inline-flex items-center gap-1.5 rounded border border-ember-500 bg-ember-500 px-3 py-1.5 text-sm font-semibold text-ink-950 hover:bg-ember-400 hover:border-ember-400 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-6px_var(--color-ember-500)] active:translate-y-0 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-150'

export const btnSecondary =
  'inline-flex items-center gap-1.5 rounded border border-ink-600 bg-ink-800 px-3 py-1.5 text-sm font-medium text-parchment-200 hover:bg-ink-700 hover:border-ink-500 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150'

export const btnDanger =
  'inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-blood-400 hover:bg-blood-500/10 active:scale-95 transition-all duration-150'
