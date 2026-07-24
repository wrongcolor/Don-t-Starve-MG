import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StaticLayoutForm } from '../../components/forms/StaticLayoutForm'

describe('StaticLayoutForm', () => {
  it('submits a new layout with an all-zero grid sized to the default width/height', async () => {
    const onSave = vi.fn()
    render(<StaticLayoutForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('MyGraveyardLayout'), { target: { value: 'MyLayout' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add layout' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.id).toBe('MyLayout')
    expect(saved.width).toBe(12)
    expect(saved.height).toBe(12)
    expect(saved.tiles).toHaveLength(12)
    expect(saved.tiles[0]).toHaveLength(12)
    expect(saved.tiles.flat().every((v: number) => v === 0)).toBe(true)
  })

  it('resizing the grid preserves overlapping tiles and drops out-of-bounds objects', async () => {
    const onSave = vi.fn()
    const { container } = render(<StaticLayoutForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('MyGraveyardLayout'), { target: { value: 'ShrunkLayout' } })

    const firstCell = container.querySelectorAll('.layout-cell')[0]
    fireEvent.mouseDown(firstCell)
    fireEvent.mouseUp(firstCell)

    const widthInput = screen.getByLabelText('Width (tiles)') as HTMLInputElement
    fireEvent.change(widthInput, { target: { value: '5' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add layout' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.width).toBe(5)
    expect(saved.tiles[0]).toHaveLength(5)
    // the painted top-left cell (0,0) must survive the resize
    expect(saved.tiles[0][0]).not.toBe(0)
  })

  // LayoutGrid used to track its selection as a raw array index. Resizing
  // drops out-of-bounds objects (StaticLayoutForm.resize's filter), reindexing
  // the survivors — a stale index would then silently point at whatever
  // object shifted into that slot, showing/editing the WRONG prefab's
  // properties with no indication anything had changed. Placing A(col 6,
  // dropped by the width-5 resize) before B/C/D and selecting C (not the last
  // one placed) reproduces the exact index shift: C moves from array index 2
  // to 1, and the old code would show D (which lands on the stale index 2)
  // instead.
  it('keeps the same object selected after a resize reindexes the objects array', async () => {
    const onSave = vi.fn()
    const { container } = render(<StaticLayoutForm onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('MyGraveyardLayout'), { target: { value: 'SelectionLayout' } })
    fireEvent.click(screen.getByText('📦 Place prefabs'))

    const cells = () => container.querySelectorAll('.layout-cell')
    const prefabInput = screen.getByPlaceholderText('prefab id to place (e.g. gravestone)')

    fireEvent.change(prefabInput, { target: { value: 'A' } })
    fireEvent.mouseDown(cells()[6]) // (row 0, col 6) — dropped once width shrinks to 5

    fireEvent.change(prefabInput, { target: { value: 'B' } })
    fireEvent.mouseDown(cells()[0]) // (row 0, col 0)

    fireEvent.change(prefabInput, { target: { value: 'C' } })
    fireEvent.mouseDown(cells()[1]) // (row 0, col 1) — the one we'll select and track

    fireEvent.change(prefabInput, { target: { value: 'D' } })
    fireEvent.mouseDown(cells()[2]) // (row 0, col 2)

    fireEvent.mouseDown(cells()[1]) // re-click C's cell to select it (already occupied)
    expect(screen.getByText('C (1, 0)')).toBeDefined()

    const widthInput = screen.getByLabelText('Width (tiles)') as HTMLInputElement
    fireEvent.change(widthInput, { target: { value: '5' } })

    // still C, not D sliding into C's old index
    expect(screen.getByText('C (1, 0)')).toBeDefined()
    expect(screen.queryByText('D (2, 0)')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Add layout' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const saved = onSave.mock.calls[0][0]
    expect(saved.objects.map((o: { prefab: string }) => o.prefab).sort()).toEqual(['B', 'C', 'D'])
  })
})
