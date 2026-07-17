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
      addLabel="New room"
      emptyMessage="No rooms added yet."
      emptyHint="The map is still just fog — draw the first room."
      tip="Rooms define the actual content of an area: terrain + fixed/scattered prefabs."
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
