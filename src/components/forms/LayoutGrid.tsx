import { useRef, useState } from 'react'
import { LAYOUT_TILE_PALETTE, type StaticLayoutObject } from '../../types/worldContent'
import { inputClass, btnDanger } from './FormField'
import { PrefabPickerButton } from './PrefabPicker'

const CELL_SIZE = 24

// Fixed swatch per curated palette entry, keyed by value (not index — the palette's
// index is the real GROUND_TYPES position used by the generator, unrelated to color).
const TILE_COLORS: Record<string, string> = {
  GRASS: '#7a9b4c',
  FOREST: '#4a6b3a',
  ROCKY: '#8a8478',
  SAVANNA: '#c9b26a',
  DIRT: '#8a6a4a',
  MARSH: '#5a6b4a',
  CAVE: '#4a4640',
  FUNGUS: '#7a5a8a',
  WOODFLOOR: '#a97b4f',
  CARPET: '#a13a3a',
  CHECKER: '#c9c9b0',
  MUD: '#5a4a3a',
  SINKHOLE: '#2a2a2a',
  PEBBLEBEACH: '#c9bfa0',
  IMPASSABLE: '#1b120c',
  OCEAN_COASTAL: '#3a6a8a',
}

const NONE_COLOR = '#e9dcb9'

interface LayoutGridProps {
  width: number
  height: number
  tiles: number[][]
  objects: StaticLayoutObject[]
  onTilesChange: (tiles: number[][]) => void
  onObjectsChange: (objects: StaticLayoutObject[]) => void
}

export function LayoutGrid({ width, tiles, objects, onTilesChange, onObjectsChange }: LayoutGridProps) {
  const [mode, setMode] = useState<'paint' | 'place'>('paint')
  const [selectedTileIndex, setSelectedTileIndex] = useState<number>(LAYOUT_TILE_PALETTE[0].index)
  const [pendingPrefab, setPendingPrefab] = useState('')
  // Identifying the selection by (row, col) instead of a raw array index keeps
  // it valid across a resize done outside this component (StaticLayoutForm's
  // resize() drops out-of-bounds objects, reindexing the rest) — a stored
  // index would silently point at whatever object shifted into that slot,
  // showing/editing the wrong prefab's properties with no indication anything
  // changed. Re-deriving the index via findIndex each render means a resize
  // either correctly follows the same object to its new index, or (if it was
  // the one dropped) clears the selection instead of aiming at a stranger.
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const paintingRef = useRef(false)

  const selectedObjectIndex =
    selectedCell !== null ? objects.findIndex((o) => o.row === selectedCell.row && o.col === selectedCell.col) : -1
  const selectedObject = selectedObjectIndex !== -1 ? objects[selectedObjectIndex] : undefined

  function paintCell(row: number, col: number) {
    const next = tiles.map((r) => [...r])
    next[row][col] = selectedTileIndex
    onTilesChange(next)
  }

  function placeOrSelectCell(row: number, col: number) {
    const existingIndex = objects.findIndex((o) => o.row === row && o.col === col)
    if (existingIndex !== -1) {
      setSelectedCell({ row, col })
      return
    }
    if (!pendingPrefab.trim()) return
    onObjectsChange([...objects, { prefab: pendingPrefab.trim(), col, row, properties: [] }])
  }

  function handleCellMouseDown(row: number, col: number) {
    if (mode === 'paint') {
      paintingRef.current = true
      paintCell(row, col)
    } else {
      placeOrSelectCell(row, col)
    }
  }

  function handleCellMouseEnter(row: number, col: number) {
    if (mode === 'paint' && paintingRef.current) paintCell(row, col)
  }

  function removeObject(index: number) {
    onObjectsChange(objects.filter((_, i) => i !== index))
    setSelectedCell(null)
  }

  function updateSelectedProperties(properties: StaticLayoutObject['properties']) {
    if (selectedObjectIndex === -1) return
    onObjectsChange(objects.map((o, i) => (i === selectedObjectIndex ? { ...o, properties } : o)))
  }

  function colorFor(tileValue: number): string {
    if (tileValue === 0) return NONE_COLOR
    const entry = LAYOUT_TILE_PALETTE.find((p) => p.index === tileValue)
    return entry ? TILE_COLORS[entry.value] : '#999'
  }

  return (
    <div>
      <div className="layout-toolbar">
        <button
          type="button"
          className={`tag-opt ${mode === 'paint' ? 'selected' : ''}`}
          onClick={() => setMode('paint')}
        >
          🖌 Paint tiles
        </button>
        <button
          type="button"
          className={`tag-opt ${mode === 'place' ? 'selected' : ''}`}
          onClick={() => setMode('place')}
        >
          📦 Place prefabs
        </button>
      </div>

      {mode === 'paint' && (
        <div className="layout-palette">
          <button
            type="button"
            className={`layout-swatch ${selectedTileIndex === 0 ? 'selected' : ''}`}
            style={{ background: NONE_COLOR }}
            title="None (room's own terrain shows through)"
            onClick={() => setSelectedTileIndex(0)}
          >
            ✕
          </button>
          {LAYOUT_TILE_PALETTE.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`layout-swatch ${selectedTileIndex === t.index ? 'selected' : ''}`}
              style={{ background: TILE_COLORS[t.value] }}
              title={t.label}
              onClick={() => setSelectedTileIndex(t.index)}
            />
          ))}
        </div>
      )}

      {mode === 'place' && (
        <div className="ingredient-row">
          <input
            className={inputClass}
            placeholder="prefab id to place (e.g. gravestone)"
            value={pendingPrefab}
            onChange={(e) => setPendingPrefab(e.target.value)}
          />
          <PrefabPickerButton onSelect={setPendingPrefab} />
        </div>
      )}

      <div
        className="layout-grid"
        style={{ gridTemplateColumns: `repeat(${width}, ${CELL_SIZE}px)` }}
        onMouseUp={() => {
          paintingRef.current = false
        }}
        onMouseLeave={() => {
          paintingRef.current = false
        }}
      >
        {tiles.map((rowTiles, row) =>
          rowTiles.map((tileValue, col) => {
            const object = objects.find((o) => o.row === row && o.col === col)
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                className="layout-cell"
                style={{ background: colorFor(tileValue) }}
                title={object ? object.prefab : undefined}
                onMouseDown={() => handleCellMouseDown(row, col)}
                onMouseEnter={() => handleCellMouseEnter(row, col)}
              >
                {object && <span className="layout-cell-object" />}
              </button>
            )
          }),
        )}
      </div>

      {selectedObject && selectedObjectIndex !== -1 && (
        <div className="card panel" style={{ marginTop: 10 }}>
          <div className="section-title">
            {selectedObject.prefab} ({selectedObject.col}, {selectedObject.row})
          </div>
          {selectedObject.properties.map((prop, i) => (
            <div key={i} className="ingredient-row">
              <input
                className={inputClass}
                placeholder="property key (e.g. data.setepitaph)"
                value={prop.key}
                onChange={(e) =>
                  updateSelectedProperties(
                    selectedObject.properties.map((p, pi) => (pi === i ? { ...p, key: e.target.value } : p)),
                  )
                }
              />
              <input
                className={inputClass}
                placeholder="value"
                value={prop.value}
                onChange={(e) =>
                  updateSelectedProperties(
                    selectedObject.properties.map((p, pi) => (pi === i ? { ...p, value: e.target.value } : p)),
                  )
                }
              />
              <button
                type="button"
                className={btnDanger}
                onClick={() => updateSelectedProperties(selectedObject.properties.filter((_, pi) => pi !== i))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-ingredient"
            onClick={() => updateSelectedProperties([...selectedObject.properties, { key: '', value: '' }])}
          >
            + Add property
          </button>
          <button type="button" className={btnDanger} style={{ marginTop: 8 }} onClick={() => removeObject(selectedObjectIndex)}>
            Remove this prefab
          </button>
        </div>
      )}
    </div>
  )
}
