import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EntityListPanel } from '../../components/panels/EntityListPanel'

interface FakeEntity {
  id: string
}

function FakeForm({ initial, onSave }: { initial?: FakeEntity; onSave: (item: FakeEntity) => void }) {
  const [id, setId] = useState(initial?.id ?? '')
  return (
    <div>
      <input aria-label="id" value={id} onChange={(e) => setId(e.target.value)} />
      <button onClick={() => onSave({ id })}>Save</button>
    </div>
  )
}

// Regression test for a real bug: upsertById() in the store keys purely off `id`, so
// without this guard, saving a brand-new entry with an id that already belongs to a
// different entry of the same type would silently replace it (data loss, no error).
describe('EntityListPanel', () => {
  it('blocks adding a new entry whose id collides with an existing one, instead of silently overwriting it', () => {
    const onUpsert = vi.fn()
    render(
      <EntityListPanel<FakeEntity>
        headerIcon="⚔️"
        title="Items"
        addLabel="New item"
        emptyMessage="No items"
        tip="tip"
        items={[{ id: 'axe' }]}
        getLabel={(item) => item.id}
        onUpsert={onUpsert}
        onRemove={vi.fn()}
        renderForm={({ initial, onSave }) => <FakeForm initial={initial} onSave={onSave} />}
      />,
    )

    fireEvent.click(screen.getByText('+ New item'))
    fireEvent.change(screen.getByLabelText('id'), { target: { value: 'axe' } })
    fireEvent.click(screen.getByText('Save'))

    expect(onUpsert).not.toHaveBeenCalled()
    expect(screen.getByText('The id "axe" is already used by another entry — choose a different one.')).toBeDefined()
  })

  it('still allows saving an unrelated new id, and editing an existing entry under its own id', () => {
    const onUpsert = vi.fn()
    render(
      <EntityListPanel<FakeEntity>
        headerIcon="⚔️"
        title="Items"
        addLabel="New item"
        emptyMessage="No items"
        tip="tip"
        items={[{ id: 'axe' }]}
        getLabel={(item) => item.id}
        onUpsert={onUpsert}
        onRemove={vi.fn()}
        renderForm={({ initial, onSave }) => <FakeForm initial={initial} onSave={onSave} />}
      />,
    )

    fireEvent.click(screen.getByText('Save'))
    expect(onUpsert).toHaveBeenCalledWith({ id: 'axe' })
  })
})
