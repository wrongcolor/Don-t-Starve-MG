import { useState } from 'react'
import { useModProjectStore } from '../../store/modProjectStore'
import { CreatureForm } from '../forms/CreatureForm'
import { btnPrimary, btnSecondary, btnDanger } from '../forms/FormField'
import type { CreatureDef } from '../../types/modProject'

export function CreaturesPanel() {
  const creatures = useModProjectStore((s) => s.project.creatures)
  const upsertCreature = useModProjectStore((s) => s.upsertCreature)
  const removeCreature = useModProjectStore((s) => s.removeCreature)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const editingCreature = editingId ? creatures.find((c) => c.id === editingId) : undefined

  const handleSave = (creature: CreatureDef) => {
    upsertCreature(creature)
    setEditingId(null)
    setAdding(false)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Criaturas e mobs</h2>
        {!adding && !editingId && (
          <button className={btnPrimary} onClick={() => setAdding(true)}>
            + Nova criatura
          </button>
        )}
      </div>

      {creatures.length === 0 && !adding && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma criatura adicionada ainda.</p>
      )}

      {!adding && !editingId && (
        <ul className="space-y-1">
          {creatures.map((creature) => (
            <li
              key={creature.id}
              className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2"
            >
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{creature.displayName}</span>
                <span className="ml-2 text-xs text-slate-400">#{creature.id}</span>
              </div>
              <div className="flex gap-2">
                <button className={btnSecondary} onClick={() => setEditingId(creature.id)}>
                  Editar
                </button>
                <button className={btnDanger} onClick={() => removeCreature(creature.id)}>
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(adding || editingCreature) && (
        <CreatureForm
          key={editingId ?? 'new'}
          initialCreature={editingCreature}
          onSave={handleSave}
          onCancel={() => {
            setAdding(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}
