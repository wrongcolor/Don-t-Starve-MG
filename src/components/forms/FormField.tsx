import type { CSSProperties, ReactNode } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  children: ReactNode
  hint?: string
}

export function FormField({ label, error, children, hint }: FormFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="error">{error}</p>}
    </label>
  )
}

interface FieldsetProps {
  legend: string
  step?: number
  children: ReactNode
  className?: string
}

export function Fieldset({ legend, step, children, className = '' }: FieldsetProps) {
  return (
    <div className={`card panel ${className}`}>
      <div className="section-title">
        {step !== undefined && <span className="step-num">{step}</span>}
        {legend}
      </div>
      {children}
    </div>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div className={`card panel ${className}`} style={style}>
      {children}
    </div>
  )
}

export const inputClass = 'input-box'

export const btnPrimary = 'btn-save'

export const btnSecondary = 'btn-outline'

export const btnDanger = 'btn-remove'

export function FormHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="header-bar panel">
      <span className="header-icon">{icon}</span>
      <h1>{title}</h1>
    </div>
  )
}

interface FormFooterProps {
  itemName: string
  saveLabel: string
  onCancel?: () => void
}

export function FormFooter({ itemName, saveLabel, onCancel }: FormFooterProps) {
  return (
    <div className="footer panel">
      <div className="footer-left">
        <span>{itemName}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {onCancel && (
          <button type="button" className={btnSecondary} onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className={btnPrimary}>
          {saveLabel}
        </button>
      </div>
    </div>
  )
}
