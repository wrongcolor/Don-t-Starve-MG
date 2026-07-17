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
      headerIcon="⚔️"
      title="Items"
      addLabel="New item"
      emptyMessage="No items added yet."
      emptyHint="The campfire is out — add the first item to get started."
      tip="Create amazing items for your mod! Each category (tool, weapon, armor) unlocks different fields."
      items={items}
      getLabel={(item) => item.displayName}
      getIcon={(item) => categoryVisual(item.category)}
      onUpsert={upsertItem}
      onRemove={removeItem}
      renderForm={({ initial, onSave, onCancel }) => (
        <ItemForm initialItem={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
