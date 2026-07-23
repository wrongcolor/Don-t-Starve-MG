import { useModProjectStore } from '../../store/modProjectStore'
import { StructureForm } from '../forms/StructureForm'
import { EntityListPanel } from './EntityListPanel'

export function StructuresPanel() {
  const structures = useModProjectStore((s) => s.project.structures)
  const upsertStructure = useModProjectStore((s) => s.upsertStructure)
  const removeStructure = useModProjectStore((s) => s.removeStructure)

  return (
    <EntityListPanel
      headerIcon="🏛️"
      title="Structures"
      addLabel="New structure"
      emptyMessage="No structures added yet."
      emptyHint="Nothing built here yet — add the first structure to get started."
      tip="Structures are placed in the world, not carried around — they always get a hammer-destroy and a placer."
      items={structures}
      getLabel={(structure) => structure.displayName}
      getIcon={() => '🏛️'}
      onUpsert={upsertStructure}
      onRemove={removeStructure}
      renderForm={({ initial, onSave, onCancel }) => (
        <StructureForm initialStructure={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
