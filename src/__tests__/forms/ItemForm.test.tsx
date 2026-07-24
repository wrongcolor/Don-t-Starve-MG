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

  // useFieldArray for spellbook.spells must run unconditionally (rules of hooks) —
  // its mere presence makes react-hook-form materialize a phantom
  // `spellbook: { spells: [] }` in the form's raw values from the very first
  // render, even though emptyItem has no `spellbook` and the checkbox was never
  // touched. zodResolver validates that phantom value (spellbookSchema requires
  // 2+ spells) before onSubmit ever runs, which used to silently block EVERY
  // item submission, not just ones that touch the spellbook checkbox — fixed by
  // stripping `spellbook` in the resolver unless `enableSpellbookRef` says it's
  // really on (see the comment on that ref in ItemForm). This test pins down
  // that the fix holds for the plain, spellbook-untouched case.
  it('submits a plain item successfully without ever touching the spellbook checkbox', async () => {
    const onSave = vi.fn()
    render(<ItemForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_item'), { target: { value: 'plainitem' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Plain Item' } })
    fireEvent.change(screen.getByLabelText('Description (crafting + inspect)'), { target: { value: 'Nothing magic' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.spellbook).toBeUndefined()
  })

  it('submits successfully after enabling and then disabling the spellbook before save', async () => {
    const onSave = vi.fn()
    render(<ItemForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_item'), { target: { value: 'testtome' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Test Tome' } })
    fireEvent.change(screen.getByLabelText('Description (crafting + inspect)'), { target: { value: 'A test tome' } })

    fireEvent.click(screen.getByText('Spellbook (menu of spells to pick from)'))
    expect(screen.getByText('+ Add spell')).toBeDefined()

    fireEvent.click(screen.getByText('Spellbook (menu of spells to pick from)'))
    expect(screen.queryByText('+ Add spell')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.spellbook).toBeUndefined()
  })

  // applyTemplate only ever patches the fields ITS OWN archetype cares about —
  // the Armor template's patch never mentions `weapon`. Before the fix, a
  // previously-applied Sword template's `weapon` stayed on the item, invisible
  // once the UI moved past the Combat fieldset, with nothing in the schema to
  // reject weapon+armor coexisting — the saved item would silently carry both,
  // corrupting the generated equip logic (item.ts picks handheld equip visuals
  // over armor equip visuals whenever `weapon` is set, regardless of category).
  it('applying a template clears weapon/armor/toolAction left over from a previous template', async () => {
    const onSave = vi.fn()
    render(<ItemForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_item'), { target: { value: 'testitem' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Test Item' } })
    fireEvent.change(screen.getByLabelText('Description (crafting + inspect)'), { target: { value: 'A test item' } })

    fireEvent.click(screen.getByText('Sword', { selector: '.tpl-card' }))
    expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('weapon')

    fireEvent.click(screen.getByText('Armor', { selector: '.tpl-card' }))
    expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('armor')

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.category).toBe('armor')
    expect(saved.armor).toMatchObject({ condition: 100, absorption: 0.8 })
    expect(saved.weapon).toBeUndefined()
  })

  it('enabling the tame cloud checkbox reveals its fields with sane defaults, and submits a custom value', async () => {
    const onSave = vi.fn()
    render(<ItemForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_item'), { target: { value: 'testtamebomb' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Test Tame Bomb' } })
    fireEvent.change(screen.getByLabelText('Description (crafting + inspect)'), { target: { value: 'Bomb' } })

    fireEvent.click(screen.getByText('Tame cloud (thrown at a point, temporarily tames nearby hostile creatures)'))
    expect((screen.getByLabelText('Radius') as HTMLInputElement).value).toBe('4')

    fireEvent.change(screen.getByLabelText('Radius'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Cloud lasts (seconds)'), { target: { value: '15' } })
    fireEvent.change(screen.getByLabelText('Tamed for (seconds)'), { target: { value: '90' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.tameBomb).toEqual({ radius: 8, cloudDurationSeconds: 15, tameDurationSeconds: 90 })
  })

  it('the magic effect and tame cloud checkboxes disable each other (same spellcaster slot)', () => {
    render(<ItemForm onSave={vi.fn()} />)

    fireEvent.click(screen.getByText('Magic effect (use on a map point)'))
    expect((screen.getByRole('checkbox', { name: /Tame cloud/ }) as HTMLInputElement).disabled).toBe(true)

    fireEvent.click(screen.getByText(/Magic effect \(use on a map point\)/))
    expect((screen.getByRole('checkbox', { name: /Tame cloud/ }) as HTMLInputElement).disabled).toBe(false)

    fireEvent.click(screen.getByText('Tame cloud (thrown at a point, temporarily tames nearby hostile creatures)'))
    expect((screen.getByRole('checkbox', { name: /Magic effect \(use on a map point\)/ }) as HTMLInputElement).disabled).toBe(true)
  })

  it('enabling the ground attack checkbox reveals its fields with sane defaults, and submits a custom value', async () => {
    const onSave = vi.fn()
    render(<ItemForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('my_item'), { target: { value: 'testspikerod' } })
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Test Spike Rod' } })
    fireEvent.change(screen.getByLabelText('Description (crafting + inspect)'), { target: { value: 'Rod' } })

    fireEvent.click(screen.getByText('Ground attack (thrown at a point, erupts sand spikes/walls — like the Antlion)'))
    expect((screen.getByLabelText('Spikes') as HTMLInputElement).value).toBe('5')
    expect((screen.getByLabelText('Walls (0 = none)') as HTMLInputElement).value).toBe('0')

    fireEvent.change(screen.getByLabelText('Spikes'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Walls (0 = none)'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Radius'), { target: { value: '10' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.groundAttack).toEqual({ spikeCount: 8, wallCount: 3, radius: 10 })
  })

  it('ground attack disables both magic effect and tame cloud (all three share the spellcaster slot)', () => {
    render(<ItemForm onSave={vi.fn()} />)

    fireEvent.click(screen.getByText('Ground attack (thrown at a point, erupts sand spikes/walls — like the Antlion)'))
    expect((screen.getByRole('checkbox', { name: /Magic effect \(use on a map point\)/ }) as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('checkbox', { name: /Tame cloud/ }) as HTMLInputElement).disabled).toBe(true)
  })
})
