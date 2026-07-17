import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ItemForm } from '../../components/forms/ItemForm'

describe('ItemForm', () => {
  it('switching category to Food reveals edible fields with sane defaults, and submits them', async () => {
    const onSave = vi.fn()
    render(<ItemForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_item'), { target: { value: 'jerky' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Jerky' } })
    fireEvent.change(screen.getByLabelText('Description (crafting + inspect)'), { target: { value: 'Dried meat' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'food' } })

    expect(screen.getByText('Food (Edible)')).toBeDefined()
    expect((screen.getByLabelText('Hunger restored') as HTMLInputElement).value).toBe('12.5')
    expect((screen.getByLabelText('Health restored') as HTMLInputElement).value).toBe('1')

    fireEvent.change(screen.getByLabelText('Food type'), { target: { value: 'MEAT' } })
    fireEvent.change(screen.getByLabelText('Hunger restored'), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText('Health restored'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Sanity restored (negative drains)'), { target: { value: '-5' } })

    fireEvent.change(screen.getByPlaceholderText('prefab id (e.g. twigs)'), { target: { value: 'monstermeat' } })
    fireEvent.click(screen.getByLabelText('COOKING'))

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.edible).toEqual({ foodType: 'MEAT', healthValue: 3, hungerValue: 25, sanityValue: -5 })
  })

  it('clears edible data when switching away from Food back to another category', () => {
    render(<ItemForm onSave={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'food' } })
    expect(screen.getByText('Food (Edible)')).toBeDefined()

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'generic' } })
    expect(screen.queryByText('Food (Edible)')).toBeNull()
  })

  it('enabling the on-eat buff checkbox reveals its fields with sane defaults, and submits a custom value', async () => {
    const onSave = vi.fn()
    render(<ItemForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_item'), { target: { value: 'ragefruit' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Rage Fruit' } })
    fireEvent.change(screen.getByLabelText('Description (crafting + inspect)'), { target: { value: 'Angry fruit' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'food' } })

    expect(screen.queryByText('Damage bonus (0 to 5, e.g. 0.25 = +25%)')).toBeNull()

    fireEvent.click(screen.getByText('Grants a temporary combat buff when eaten'))

    expect((screen.getByLabelText(/Damage bonus/) as HTMLInputElement).value).toBe('0.25')
    expect((screen.getByLabelText('Duration (seconds)') as HTMLInputElement).value).toBe('120')

    fireEvent.change(screen.getByLabelText(/Damage bonus/), { target: { value: '0.5' } })
    fireEvent.change(screen.getByLabelText('Duration (seconds)'), { target: { value: '60' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.onEatBuff).toEqual({ damageMultiplier: 0.5, durationSeconds: 60 })
  })

  it('unchecking the on-eat buff clears the field from the saved item', async () => {
    const onSave = vi.fn()
    render(<ItemForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_item'), { target: { value: 'plainfood' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Plain Food' } })
    fireEvent.change(screen.getByLabelText('Description (crafting + inspect)'), { target: { value: 'Nothing special' } })
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'food' } })

    fireEvent.click(screen.getByText('Grants a temporary combat buff when eaten'))
    fireEvent.click(screen.getByText('Grants a temporary combat buff when eaten'))

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.onEatBuff).toBeUndefined()
  })
})
