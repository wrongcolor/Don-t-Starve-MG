import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StructureForm } from '../../components/forms/StructureForm'

describe('StructureForm', () => {
  it('submits a plain structure successfully without touching any special mechanic', async () => {
    const onSave = vi.fn()
    render(<StructureForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_structure'), { target: { value: 'plainhut' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Plain Hut' } })
    fireEvent.change(screen.getByLabelText('Description (inspect)'), { target: { value: 'Just a hut' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add structure' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.id).toBe('plainhut')
    expect(saved.restStation).toBeUndefined()
  })

  it('enabling the rest station checkbox reveals its fields with sane defaults, and submits a custom value', async () => {
    const onSave = vi.fn()
    render(<StructureForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_structure'), { target: { value: 'sleepytent' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Sleepy Tent' } })
    fireEvent.change(screen.getByLabelText('Description (inspect)'), { target: { value: 'Rest here' } })

    fireEvent.click(screen.getByText('Players can sleep here to recover health/hunger/sanity (like a Tent)'))

    expect((screen.getByLabelText('Only usable at') as HTMLSelectElement).value).toBe('night')
    expect((screen.getByLabelText('Health per tick (1 tick = 1s asleep)') as HTMLInputElement).value).toBe('1')

    fireEvent.change(screen.getByLabelText('Only usable at'), { target: { value: 'day' } })
    fireEvent.change(screen.getByLabelText('Health per tick (1 tick = 1s asleep)'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Hunger per tick (negative = costs hunger)'), { target: { value: '-2' } })
    fireEvent.change(screen.getByLabelText('Sanity per tick'), { target: { value: '3' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add structure' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.restStation).toEqual({ sleepPhase: 'day', healthPerTick: 2, hungerPerTick: -2, sanityPerTick: 3 })
  })

  it('the limited-uses sub-toggle sets maxUses only when checked', async () => {
    const onSave = vi.fn()
    render(<StructureForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_structure'), { target: { value: 'wornouttent' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Worn-out Tent' } })
    fireEvent.change(screen.getByLabelText('Description (inspect)'), { target: { value: 'Rest here' } })

    fireEvent.click(screen.getByText('Players can sleep here to recover health/hunger/sanity (like a Tent)'))
    expect(screen.queryByLabelText('Max uses')).toBeNull()

    fireEvent.click(screen.getByText('Wears out after a limited number of uses'))
    expect((screen.getByLabelText('Max uses') as HTMLInputElement).value).toBe('15')

    fireEvent.click(screen.getByRole('button', { name: 'Add structure' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.restStation.maxUses).toBe(15)
  })
})
