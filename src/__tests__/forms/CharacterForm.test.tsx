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

  it('reuses an existing character\'s build when chosen, and submits that choice', async () => {
    const onSave = vi.fn()
    render(<CharacterForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_char'), { target: { value: 'viana' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Viana' } })
    fireEvent.change(screen.getByLabelText('Description (selection screen)'), { target: { value: 'A sun-touched witch' } })
    fireEvent.change(screen.getByLabelText('Catchphrase'), { target: { value: 'The sun lends its light.' } })

    fireEvent.click(screen.getByText('Reuse an existing character\'s build'))
    fireEvent.change(screen.getByLabelText('Build'), { target: { value: 'wendy' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add character' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.animation).toEqual({ source: 'vanilla', build: 'wendy' })
  })

  it('enabling the mana checkbox reveals its fields with sane defaults, and submits a custom value with regen', async () => {
    const onSave = vi.fn()
    render(<CharacterForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_char'), { target: { value: 'viana' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Viana' } })
    fireEvent.change(screen.getByLabelText('Description (selection screen)'), { target: { value: 'A sun-touched witch' } })
    fireEvent.change(screen.getByLabelText('Catchphrase'), { target: { value: 'The sun lends its light.' } })

    fireEvent.click(screen.getByText('This character has a mana pool'))
    expect((screen.getByLabelText('Max mana') as HTMLInputElement).value).toBe('100')

    fireEvent.change(screen.getByLabelText('Max mana'), { target: { value: '150' } })
    fireEvent.click(screen.getByText('Regenerates over time'))
    fireEvent.change(screen.getByLabelText('Mana per second'), { target: { value: '2' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add character' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.mana).toEqual({ max: 150, regenPerSecond: 2 })
  })

  it('submits a plain character successfully without ever touching the mana checkbox', async () => {
    const onSave = vi.fn()
    render(<CharacterForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_char'), { target: { value: 'plainchar' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Plain Char' } })
    fireEvent.change(screen.getByLabelText('Description (selection screen)'), { target: { value: 'Nothing magic' } })
    fireEvent.change(screen.getByLabelText('Catchphrase'), { target: { value: '...' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add character' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.mana).toBeUndefined()
  })
})
