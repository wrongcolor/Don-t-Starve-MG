import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreatureForm } from '../../components/forms/CreatureForm'

describe('CreatureForm', () => {
  it('submits a plain hostile creature successfully without touching ground attack', async () => {
    const onSave = vi.fn()
    render(<CreatureForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_creature'), { target: { value: 'plainmob' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Plain Mob' } })
    fireEvent.change(screen.getByLabelText('Description (inspect)'), { target: { value: 'A mob' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add creature' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.id).toBe('plainmob')
    expect(saved.groundAttack).toBeUndefined()
  })

  it('enabling the ground attack checkbox reveals its fields with sane defaults, and submits a custom value', async () => {
    const onSave = vi.fn()
    render(<CreatureForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_creature'), { target: { value: 'dunestalker' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Dune Stalker' } })
    fireEvent.change(screen.getByLabelText('Description (inspect)'), { target: { value: 'Watches from the sand' } })

    fireEvent.click(screen.getByText('Ground attack (erupts sand spikes/walls around itself while fighting — like the Antlion)'))
    expect((screen.getByLabelText('Spikes') as HTMLInputElement).value).toBe('5')
    expect((screen.getByLabelText('Walls (0 = none)') as HTMLInputElement).value).toBe('0')
    expect((screen.getByLabelText('Cooldown (seconds)') as HTMLInputElement).value).toBe('20')

    fireEvent.change(screen.getByLabelText('Spikes'), { target: { value: '6' } })
    fireEvent.change(screen.getByLabelText('Walls (0 = none)'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Radius'), { target: { value: '6' } })
    fireEvent.change(screen.getByLabelText('Cooldown (seconds)'), { target: { value: '15' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add creature' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.groundAttack).toEqual({ spikeCount: 6, wallCount: 2, radius: 6, cooldownSeconds: 15 })
  })

  it('disables the ground attack checkbox for passive creatures, and clears it when switching to passive', async () => {
    const onSave = vi.fn()
    render(<CreatureForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_creature'), { target: { value: 'switchmob' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Switch Mob' } })
    fireEvent.change(screen.getByLabelText('Description (inspect)'), { target: { value: 'A mob' } })

    fireEvent.click(screen.getByText('Ground attack (erupts sand spikes/walls around itself while fighting — like the Antlion)'))
    expect(screen.getByLabelText('Spikes')).toBeDefined()

    fireEvent.change(screen.getByLabelText('Behavior'), { target: { value: 'passive' } })
    expect(screen.queryByLabelText('Spikes')).toBeNull()
    expect((screen.getByRole('checkbox', { name: /Ground attack/ }) as HTMLInputElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Add creature' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.groundAttack).toBeUndefined()
  })
})
