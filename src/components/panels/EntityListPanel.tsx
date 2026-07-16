import { useState, type ReactNode } from 'react'
import { btnPrimary, btnSecondary, btnDanger, Card } from '../forms/FormField'

interface EntityListPanelProps<T extends { id: string }> {
  title: string
  addLabel: string
  emptyMessage: string
  items: T[]
  getLabel: (item: T) => string
  getMeta?: (item: T) => ReactNode
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
  items,
  getLabel,
  getMeta,
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
          <button className={btnPrimary} onClick={() => setAdding(true)}>
            {addLabel}
          </button>
        )}
      </div>

      {items.length === 0 && !adding && <p className="text-sm text-parchment-400">{emptyMessage}</p>}

      {!adding && !editingId && (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="flex items-center justify-between px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-parchment-100">{getLabel(item)}</span>
                  <span className="ml-2 text-xs text-parchment-400">
                    {getMeta ? getMeta(item) : `#${item.id}`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button className={btnSecondary} onClick={() => setEditingId(item.id)}>
                    Editar
                  </button>
                  <button className={btnDanger} onClick={() => onRemove(item.id)}>
                    Remover
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {(adding || editingItem) && renderForm({ initial: editingItem, onSave: handleSave, onCancel: handleCancel })}
    </div>
  )
}
