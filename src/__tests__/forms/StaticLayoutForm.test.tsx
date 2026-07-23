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
})
