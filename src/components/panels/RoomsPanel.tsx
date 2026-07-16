import { useModProjectStore } from '../../store/modProjectStore'
import { RoomForm } from '../forms/RoomForm'
import { EntityListPanel } from './EntityListPanel'

export function RoomsPanel() {
  const rooms = useModProjectStore((s) => s.project.rooms)
  const upsertRoom = useModProjectStore((s) => s.upsertRoom)
  const removeRoom = useModProjectStore((s) => s.removeRoom)

  return (
    <EntityListPanel
      title="Rooms (salas de conteúdo)"
      addLabel="+ Nova sala"
      emptyMessage="Nenhuma sala adicionada ainda."
      items={rooms}
      getLabel={(room) => room.id}
      getMeta={(room) => room.terrain}
      onUpsert={upsertRoom}
      onRemove={removeRoom}
      renderForm={({ initial, onSave, onCancel }) => (
        <RoomForm initialRoom={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
