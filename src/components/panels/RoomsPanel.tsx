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
      headerIcon="🌳"
      title="Rooms"
      addLabel="Nova sala"
      emptyMessage="Nenhuma sala adicionada ainda."
      emptyHint="O mapa ainda é só névoa — desenhe a primeira sala."
      tip="Rooms definem o conteúdo real de uma área: terreno + prefabs fixos/espalhados."
      items={rooms}
      getLabel={(room) => room.id}
      getIcon={(room) => roomVisual(room.terrain)}
      onUpsert={upsertRoom}
      onRemove={removeRoom}
      renderForm={({ initial, onSave, onCancel }) => (
        <RoomForm initialRoom={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
