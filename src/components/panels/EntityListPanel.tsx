import { useState, type ReactNode } from 'react'
import { btnPrimary, btnSecondary, btnDanger } from '../forms/FormField'
import { EmptyState, accentClasses } from './entityVisuals'

interface EntityVisual {
  icon: ReactNode
  accent: string
}

interface EntityListPanelProps<T extends { id: string }> {
  title: string
  addLabel: string
  emptyMessage: string
  emptyHint?: string
  items: T[]
  getLabel: (item: T) => string
  getMeta?: (item: T) => ReactNode
  getVisual?: (item: T) => EntityVisual
  onUpsert: (item: T) => void
  onRemove: (id: string) => void
  renderForm: (props: { initial?: T; onSave: (item: T) => void; onCancel: () => void }) => ReactNode
}

// Items/Characters/Creatures/Rooms/Tasks panels are all the same CRUD-over-a-list
// shape — this generalizes that shape once instead of five near-identical files.
export function EntityListPanel<T extends { id: string }>({
  title,
  addLabel,
  emptyMessage,
  emptyHint,
  items,
  getLabel,
  getMeta,
  getVisual,
  onUpsert,
  onRemove,
  renderForm,
}: EntityListPanelProps<T>) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const editingItem = editingId ? items.find((i) => i.id === editingId) : undefined

  const handleSave = (item: T) => {
    onUpsert(item)
    setEditingId(null)
    setAdding(false)
  }

  const handleCancel = () => {
    setAdding(false)
    setEditingId(null)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base text-parchment-100">{title}</h2>
        {!adding && !editingId && (
          <button className={`${btnPrimary} ${items.length === 0 ? 'animate-ember-pulse' : ''}`} onClick={() => setAdding(true)}>
            {addLabel}
          </button>
        )}
      </div>

      {items.length === 0 && !adding && <EmptyState message={emptyMessage} hint={emptyHint} />}

      {!adding && !editingId && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const visual = getVisual?.(item)
            const accent = accentClasses(visual?.accent ?? 'parchment')
            return (
              <li key={item.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}>
                <div
                  className={`group flex items-center justify-between gap-3 rounded-lg border border-ink-700 border-l-4 ${accent.border} bg-ink-900/60 px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink-800/80 hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,0.7)]`}
                >
                  <div className="flex items-center gap-3">
                    {visual && (
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-md ${accent.bg} ${accent.text} transition-transform duration-200 group-hover:scale-110`}>
                        {visual.icon}
                      </span>
                    )}
                    <div>
                      <span className="text-sm font-medium text-parchment-100">{getLabel(item)}</span>
                      <span className="ml-2 text-xs text-parchment-400">{getMeta ? getMeta(item) : `#${item.id}`}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-80 transition-opacity group-hover:opacity-100">
                    <button className={btnSecondary} onClick={() => setEditingId(item.id)}>
                      Editar
                    </button>
                    <button className={btnDanger} onClick={() => onRemove(item.id)}>
                      Remover
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {(adding || editingItem) && (
        <div className="animate-fade-in-up">{renderForm({ initial: editingItem, onSave: handleSave, onCancel: handleCancel })}</div>
      )}
    </div>
  )
}
