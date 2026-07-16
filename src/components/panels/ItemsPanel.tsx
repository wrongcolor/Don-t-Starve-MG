import { useModProjectStore } from '../../store/modProjectStore'
import { ItemForm } from '../forms/ItemForm'
import { EntityListPanel } from './EntityListPanel'
import { categoryVisual } from './entityVisuals'

export function ItemsPanel() {
  const items = useModProjectStore((s) => s.project.items)
  const upsertItem = useModProjectStore((s) => s.upsertItem)
  const removeItem = useModProjectStore((s) => s.removeItem)

  return (
    <EntityListPanel
      title="Itens e receitas"
      addLabel="+ Novo item"
      emptyMessage="Nenhum item adicionado ainda."
      emptyHint="A fogueira está apagada — adicione o primeiro item pra começar."
      items={items}
      getLabel={(item) => item.displayName}
      getVisual={(item) => categoryVisual(item.category)}
      onUpsert={upsertItem}
      onRemove={removeItem}
      renderForm={({ initial, onSave, onCancel }) => (
        <ItemForm initialItem={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
