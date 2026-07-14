import { useState } from 'react'
import { useModProjectStore } from '../../store/modProjectStore'
import { RoomForm } from '../forms/RoomForm'
import { btnPrimary, btnSecondary, btnDanger } from '../forms/FormField'
import type { RoomDef } from '../../types/worldContent'

export function RoomsPanel() {
  const rooms = useModProjectStore((s) => s.project.rooms)
  const upsertRoom = useModProjectStore((s) => s.upsertRoom)
  const removeRoom = useModProjectStore((s) => s.removeRoom)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const editingRoom = editingId ? rooms.find((r) => r.id === editingId) : undefined

  const handleSave = (room: RoomDef) => {
    upsertRoom(room)
    setEditingId(null)
    setAdding(false)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Rooms (salas de conteúdo)</h2>
        {!adding && !editingId && (
          <button className={btnPrimary} onClick={() => setAdding(true)}>
            + Nova sala
          </button>
        )}
      </div>

      {rooms.length === 0 && !adding && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma sala adicionada ainda.</p>
      )}

      {!adding && !editingId && (
        <ul className="space-y-1">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2"
            >
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{room.id}</span>
                <span className="ml-2 text-xs text-slate-400">{room.terrain}</span>
              </div>
              <div className="flex gap-2">
                <button className={btnSecondary} onClick={() => setEditingId(room.id)}>
                  Editar
                </button>
                <button className={btnDanger} onClick={() => removeRoom(room.id)}>
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(adding || editingRoom) && (
        <RoomForm
          key={editingId ?? 'new'}
          initialRoom={editingRoom}
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
