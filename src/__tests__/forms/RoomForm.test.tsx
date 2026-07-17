import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RoomForm } from '../../components/forms/RoomForm'

// Regression test for a bug where useFieldArray on `scatter.prefabs` (needed
// unconditionally per rules of hooks) materialized a partial `scatter: { prefabs: [] }`
// in the form's raw values even with the "scattered decoration" checkbox off — zodResolver
// rejected that partial shape against the optional `scatter` schema with no visible error,
// so the form silently did nothing on submit.
describe('RoomForm', () => {
  it('submits a room with no scatter set when the checkbox is left off', async () => {
    const onSave = vi.fn()
    render(<RoomForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('MyForestRoom'), { target: { value: 'PlainRoom' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add room' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.id).toBe('PlainRoom')
    expect(saved.scatter).toBeUndefined()
  })

  it('submits scatter data when the checkbox is enabled and a prefab is filled in', async () => {
    const onSave = vi.fn()
    render(<RoomForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('MyForestRoom'), { target: { value: 'ScatterRoom' } })
    fireEvent.click(screen.getByText('Has decoration scattered around the room (e.g. grass, flowers)'))
    fireEvent.click(screen.getByRole('button', { name: '+ Add decoration item' }))
    fireEvent.change(screen.getByPlaceholderText('prefab id (e.g. grass)'), { target: { value: 'grass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add room' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.scatter).toBeDefined()
    expect(saved.scatter.prefabs).toEqual([{ prefab: 'grass', weight: 0.05 }])
  })
})
