import { useModProjectStore } from '../../store/modProjectStore'
import { ItemForm } from '../forms/ItemForm'
import { EntityListPanel } from './EntityListPanel'

export function ItemsPanel() {
  const items = useModProjectStore((s) => s.project.items)
  const upsertItem = useModProjectStore((s) => s.upsertItem)
  const removeItem = useModProjectStore((s) => s.removeItem)

  return (
    <EntityListPanel
      title="Itens e receitas"
      addLabel="+ Novo item"
      emptyMessage="Nenhum item adicionado ainda."
      items={items}
      getLabel={(item) => item.displayName}
      onUpsert={upsertItem}
      onRemove={removeItem}
      renderForm={({ initial, onSave, onCancel }) => (
        <ItemForm initialItem={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
