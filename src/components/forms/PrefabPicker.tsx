import { useState } from 'react'
import { COMMON_PREFAB_CATEGORIES } from '../../data/commonPrefabs'
import { inputClass } from './FormField'

interface PrefabPickerModalProps {
  onSelect: (id: string) => void
  onClose: () => void
}

function PrefabPickerModal({ onSelect, onClose }: PrefabPickerModalProps) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()

  const visibleCategories = COMMON_PREFAB_CATEGORIES.map((category) => ({
    ...category,
    items: category.items.filter(
      (item) => item.id.includes(query) || item.label.toLowerCase().includes(query),
    ),
  })).filter((category) => category.items.length > 0)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel-header">
          <h2>Choose a prefab</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <input
          autoFocus
          className={inputClass}
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="modal-body">
          {visibleCategories.length === 0 && (
            <p className="modal-empty">No match in the curated list — you can still type any prefab id directly.</p>
          )}
          {visibleCategories.map((category) => (
            <div key={category.name}>
              <div className="modal-category">{category.name}</div>
              <div className="modal-grid">
                {category.items.map((item) => (
                  <button type="button" key={item.id} className="modal-item" onClick={() => onSelect(item.id)}>
                    <span className="modal-item-icon">{item.icon}</span>
                    {item.label}
                    <span className="modal-item-id">{item.id}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface PrefabPickerButtonProps {
  onSelect: (id: string) => void
}

// A curated shortcut, not a replacement for the text input next to it — the
// list only covers well-known vanilla prefabs (see commonPrefabs.ts), so any
// other id (a vanilla one we haven't curated, or the user's own custom prefab)
// still has to be typed directly.
export function PrefabPickerButton({ onSelect }: PrefabPickerButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="mini-btn" onClick={() => setOpen(true)} aria-label="Choose a common prefab">
        📋
      </button>
      {open && (
        <PrefabPickerModal
          onSelect={(id) => {
            onSelect(id)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
