import { useModProjectStore } from '../../store/modProjectStore'
import { RoomForm } from '../forms/RoomForm'
import { EntityListPanel } from './EntityListPanel'
import { roomVisual } from './entityVisuals'

export function RoomsPanel() {
  const rooms = useModProjectStore((s) => s.project.rooms)
  const upsertRoom = useModProjectStore((s) => s.upsertRoom)
  const removeRoom = useModProjectStore((s) => s.removeRoom)

  return (
    <EntityListPanel
      title="Rooms (salas de conteúdo)"
      addLabel="+ Nova sala"
      emptyMessage="Nenhuma sala adicionada ainda."
      emptyHint="O mapa ainda é só névoa — desenhe a primeira sala."
      items={rooms}
      getLabel={(room) => room.id}
      getMeta={(room) => room.terrain}
      getVisual={(room) => roomVisual(room.terrain)}
      onUpsert={upsertRoom}
      onRemove={removeRoom}
      renderForm={({ initial, onSave, onCancel }) => (
        <RoomForm initialRoom={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
