import { useModProjectStore } from '../../store/modProjectStore'
import { CreatureForm } from '../forms/CreatureForm'
import { EntityListPanel } from './EntityListPanel'
import { behaviorVisual } from './entityVisuals'

export function CreaturesPanel() {
  const creatures = useModProjectStore((s) => s.project.creatures)
  const upsertCreature = useModProjectStore((s) => s.upsertCreature)
  const removeCreature = useModProjectStore((s) => s.removeCreature)

  return (
    <EntityListPanel
      headerIcon="👹"
      title="Creatures"
      addLabel="New creature"
      emptyMessage="No creatures added yet."
      emptyHint="The forest is empty — summon the first creature."
      tip="Behavior defines the reaction to attacks: passive flees, neutral fights back, hostile attacks on its own."
      items={creatures}
      getLabel={(creature) => creature.displayName}
      getIcon={(creature) => behaviorVisual(creature.behavior)}
      onUpsert={upsertCreature}
      onRemove={removeCreature}
      renderForm={({ initial, onSave, onCancel }) => (
        <CreatureForm initialCreature={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
