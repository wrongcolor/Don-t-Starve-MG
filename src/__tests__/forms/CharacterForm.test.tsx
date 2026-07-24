import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CharacterForm } from '../../components/forms/CharacterForm'

// SkillTreeEditor owns a useFieldArray for skillTree.branches and only mounts
// while the checkbox is on — a different dodge than ItemForm's spellbook fix,
// but react-hook-form keeps array-field registrations around after unmount by
// default (shouldUnregister defaults to false), so toggling the checkbox back
// off before submit could plausibly leave a phantom `skillTree: { branches: [] }`
// in the raw values and silently block the whole form's submit, same failure
// class as the spellbook bug. This test exists to pin down that it does NOT.
describe('CharacterForm', () => {
  it('submits a plain character successfully without ever touching the skill tree checkbox', async () => {
    const onSave = vi.fn()
    render(<CharacterForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_char'), { target: { value: 'testy' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Testy' } })
    fireEvent.change(screen.getByLabelText('Description (selection screen)'), { target: { value: 'A test character' } })
    fireEvent.change(screen.getByLabelText('Catchphrase'), { target: { value: 'I test things.' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add character' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.skillTree).toBeUndefined()
  })

  it('submits successfully after enabling and then disabling the skill tree before save', async () => {
    const onSave = vi.fn()
    render(<CharacterForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_char'), { target: { value: 'testy' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Testy' } })
    fireEvent.change(screen.getByLabelText('Description (selection screen)'), { target: { value: 'A test character' } })
    fireEvent.change(screen.getByLabelText('Catchphrase'), { target: { value: 'I test things.' } })

    fireEvent.click(screen.getByLabelText('This character has a skill tree'))
    expect(screen.getByText('+ Add branch')).toBeDefined()

    fireEvent.click(screen.getByLabelText('This character has a skill tree'))
    expect(screen.queryByText('+ Add branch')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Add character' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.skillTree).toBeUndefined()
  })
})
