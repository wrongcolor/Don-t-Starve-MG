import type { CSSProperties, ReactNode } from 'react'

// A small "?" button next to a label that reveals an explanation on hover/focus
// (clicking a button focuses it, so click and hover both work) — added for the
// World tab (Rooms/Tasks), whose fields are the least self-explanatory in the app.
export function InfoTip({ text }: { text: string }) {
  return (
    <button type="button" className="info-btn" aria-label="Field info" onClick={(e) => e.preventDefault()}>
      ?<span className="info-tip" role="tooltip">{text}</span>
    </button>
  )
}

interface FormFieldProps {
  label: string
  error?: string
  children: ReactNode
  hint?: string
  info?: string
}

export function FormField({ label, error, children, hint, info }: FormFieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {info && <InfoTip text={info} />}
      </span>
      {children}
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="error">{error}</p>}
    </label>
  )
}

interface FieldsetProps {
  legend: string
  step?: number
  info?: string
  children: ReactNode
  className?: string
}

export function Fieldset({ legend, step, info, children, className = '' }: FieldsetProps) {
  return (
    <div className={`card panel ${className}`}>
      <div className="section-title">
        {step !== undefined && <span className="step-num">{step}</span>}
        {legend}
        {info && <InfoTip text={info} />}
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
            Cancel
          </button>
        )}
        <button type="submit" className={btnPrimary}>
          {saveLabel}
        </button>
      </div>
    </div>
  )
}
