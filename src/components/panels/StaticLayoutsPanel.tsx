import { useModProjectStore } from '../../store/modProjectStore'
import { StaticLayoutForm } from '../forms/StaticLayoutForm'
import { EntityListPanel } from './EntityListPanel'

export function StaticLayoutsPanel() {
  const staticLayouts = useModProjectStore((s) => s.project.staticLayouts)
  const upsertStaticLayout = useModProjectStore((s) => s.upsertStaticLayout)
  const removeStaticLayout = useModProjectStore((s) => s.removeStaticLayout)

  return (
    <EntityListPanel
      headerIcon="🗺️"
      title="Static layouts"
      addLabel="New static layout"
      emptyMessage="No static layouts added yet."
      emptyHint="Paint the first hand-placed micro-layout — a Room can embed it later."
      tip="A fixed arrangement of tiles + prefabs a Room can embed, e.g. a small graveyard clearing."
      items={staticLayouts}
      getLabel={(layout) => layout.id}
      onUpsert={upsertStaticLayout}
      onRemove={removeStaticLayout}
      renderForm={({ initial, onSave, onCancel }) => (
        <StaticLayoutForm initialLayout={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
