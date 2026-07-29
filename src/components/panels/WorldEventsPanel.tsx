import { useModProjectStore } from '../../store/modProjectStore'
import { WorldEventForm } from '../forms/WorldEventForm'
import { EntityListPanel } from './EntityListPanel'

export function WorldEventsPanel() {
  const worldEvents = useModProjectStore((s) => s.project.worldEvents)
  const upsertWorldEvent = useModProjectStore((s) => s.upsertWorldEvent)
  const removeWorldEvent = useModProjectStore((s) => s.removeWorldEvent)

  return (
    <EntityListPanel
      headerIcon="🔔"
      title="World Events"
      addLabel="New event"
      emptyMessage="No world events added yet."
      emptyHint="Nothing happens on its own yet — add the first trigger."
      tip="A World Event fires on a real DST event (a phase change, moon phase, or a player action) and spawns a group of prefabs nearby — the same shape as the pirate raid's captain + crew."
      items={worldEvents}
      getLabel={(event) => event.displayName}
      onUpsert={upsertWorldEvent}
      onRemove={removeWorldEvent}
      renderForm={({ initial, onSave, onCancel }) => (
        <WorldEventForm initialWorldEvent={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
