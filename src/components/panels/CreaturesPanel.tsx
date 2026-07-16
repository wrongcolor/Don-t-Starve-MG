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
      title="Criaturas e mobs"
      addLabel="+ Nova criatura"
      emptyMessage="Nenhuma criatura adicionada ainda."
      emptyHint="A floresta está vazia — invoque a primeira criatura."
      items={creatures}
      getLabel={(creature) => creature.displayName}
      getVisual={(creature) => behaviorVisual(creature.behavior)}
      onUpsert={upsertCreature}
      onRemove={removeCreature}
      renderForm={({ initial, onSave, onCancel }) => (
        <CreatureForm initialCreature={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
