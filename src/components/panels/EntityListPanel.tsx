import { Fragment, useState, type ReactNode } from 'react'
import { EmptyState } from './entityVisuals'

interface EntityListPanelProps<T extends { id: string }> {
  headerIcon: string
  title: string
  addLabel: string
  emptyMessage: string
  emptyHint?: string
  tip: ReactNode
  tipIcon?: string
  items: T[]
  getLabel: (item: T) => string
  getIcon?: (item: T) => string
  onUpsert: (item: T) => void
  onRemove: (id: string) => void
  renderForm: (props: { initial?: T; onSave: (item: T) => void; onCancel: () => void }) => ReactNode
}

// Items/Characters/Creatures/Rooms/Tasks panels all share this shape: a
// searchable sidebar list + a form (which owns its own `.main` + `.preview`
// panes, since only the form has live access to the watched field values).
export function EntityListPanel<T extends { id: string }>({
  headerIcon,
  title,
  addLabel,
  emptyMessage,
  emptyHint,
  tip,
  tipIcon = '🧑‍🎨',
  items,
  getLabel,
  getIcon,
  onUpsert,
  onRemove,
  renderForm,
}: EntityListPanelProps<T>) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  const resolvedEditingId = editingId && items.some((i) => i.id === editingId) ? editingId : null
  const activeId = resolvedEditingId ?? (adding ? null : (items[0]?.id ?? null))
  const activeItem = activeId ? items.find((i) => i.id === activeId) : undefined

  const filtered = items.filter((item) => getLabel(item).toLowerCase().includes(search.toLowerCase()))

  // activeItem is undefined only while adding a brand-new entry (see the `adding`
  // branch above) — upsertById() in the store keys purely off `id`, so saving a new
  // entry whose id matches an existing one of the same type would otherwise silently
  // replace it instead of erroring, since the id field is only read-only when editing.
  const handleSave = (item: T) => {
    if (!activeItem && items.some((i) => i.id === item.id)) {
      setSaveError(`The id "${item.id}" is already used by another entry — choose a different one.`)
      return
    }
    setSaveError(null)
    onUpsert(item)
    setAdding(false)
    setEditingId(item.id)
  }

  const handleCancel = () => {
    setSaveError(null)
    setAdding(false)
    setEditingId(null)
  }

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onRemove(id)
  }

  return (
    <div className="layout">
      <div className="sidebar">
        <button
          className="btn-new"
          onClick={() => {
            setSaveError(null)
            setAdding(true)
          }}
        >
          + {addLabel}
        </button>
        {saveError && (
          <p className="field error" style={{ color: 'var(--accent-red)', margin: '0 0 8px' }}>
            {saveError}
          </p>
        )}
        <div className="sidebar-list panel">
          <div className="sidebar-title">{title.toUpperCase()}</div>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span>🔍</span>
          </div>
          <div className="item-list">
            {filtered.map((item) => (
              <button
                key={item.id}
                className={`item-row ${item.id === activeId ? 'active' : ''}`}
                onClick={() => {
                  setSaveError(null)
                  setEditingId(item.id)
                  setAdding(false)
                }}
              >
                {getIcon && <span className="ic">{getIcon(item)}</span>}
                <span>{getLabel(item)}</span>
                <span className="remove" onClick={(e) => handleRemove(e, item.id)}>
                  ✕
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="tip-box panel">
          <div className="tip-title">TIP</div>
          {tip}
          <div className="tip-face">{tipIcon}</div>
        </div>
      </div>

      {(adding || activeItem) && (
        <Fragment key={activeItem?.id ?? 'new'}>
          {renderForm({ initial: activeItem, onSave: handleSave, onCancel: handleCancel })}
        </Fragment>
      )}

      {!adding && !activeItem && (
        <div className="main">
          <div className="header-bar panel">
            <span className="header-icon">{headerIcon}</span>
            <h1>{title}</h1>
          </div>
          <div className="card panel" style={{ flex: 1 }}>
            <EmptyState message={emptyMessage} hint={emptyHint} />
          </div>
        </div>
      )}
    </div>
  )
}
