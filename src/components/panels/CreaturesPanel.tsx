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
      title="Criaturas"
      addLabel="Nova criatura"
      emptyMessage="Nenhuma criatura adicionada ainda."
      emptyHint="A floresta está vazia — invoque a primeira criatura."
      tip="Comportamento define reação a ataques: passiva foge, neutra revida, hostil ataca por conta própria."
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
