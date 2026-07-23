import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  staticLayoutDefSchema,
  createEmptyStaticLayout,
  createEmptyTileGrid,
  LAYOUT_GRID_SIZE,
  LAYOUT_POSITIONS,
  PLACE_MASKS,
  type StaticLayoutDef,
} from '../../types/worldContent'
import { FormField, Fieldset, FormHeader, FormFooter, inputClass } from './FormField'
import { LayoutGrid } from './LayoutGrid'

interface StaticLayoutFormProps {
  initialLayout?: StaticLayoutDef
  onSave: (layout: StaticLayoutDef) => void
  onCancel?: () => void
}

const emptyLayout = createEmptyStaticLayout()

export function StaticLayoutForm({ initialLayout, onSave, onCancel }: StaticLayoutFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StaticLayoutDef>({
    resolver: zodResolver(staticLayoutDefSchema),
    defaultValues: initialLayout ?? emptyLayout,
  })

  const watched = watch()
  const onSubmit = (data: StaticLayoutDef) => onSave(data)

  // Resizing preserves whatever overlaps the new bounds; objects that would fall
  // outside the shrunk grid are dropped rather than left dangling out of bounds.
  function resize(nextWidth: number, nextHeight: number) {
    const width = Math.min(LAYOUT_GRID_SIZE.max, Math.max(LAYOUT_GRID_SIZE.min, nextWidth))
    const height = Math.min(LAYOUT_GRID_SIZE.max, Math.max(LAYOUT_GRID_SIZE.min, nextHeight))
    const nextTiles = Array.from({ length: height }, (_, r) =>
      Array.from({ length: width }, (_, c) => watched.tiles[r]?.[c] ?? 0),
    )
    setValue('width', width)
    setValue('height', height)
    setValue('tiles', nextTiles)
    setValue(
      'objects',
      watched.objects.filter((o) => o.col < width && o.row < height),
    )
  }

  return (
    <>
      <form className="main" onSubmit={handleSubmit(onSubmit)}>
        <FormHeader icon="🗺️" title={initialLayout ? initialLayout.id : 'New static layout'} />

        <div className="main-scroll">
          <Fieldset
            legend="Identity"
            step={1}
            info="A hand-placed micro-layout of ground tiles and prefabs a Room can embed (e.g. a small graveyard clearing) — confirmed real via a published mod, see docs/dst-knowledge/patterns.md#55."
          >
            <div className="row-2">
              <FormField label="Id (layout name)" error={errors.id?.message}>
                <input className={inputClass} {...register('id')} disabled={!!initialLayout} placeholder="MyGraveyardLayout" />
              </FormField>
              <div className="row-2">
                <FormField label="Width (tiles)">
                  <input
                    type="number"
                    className={inputClass}
                    min={LAYOUT_GRID_SIZE.min}
                    max={LAYOUT_GRID_SIZE.max}
                    value={watched.width}
                    onChange={(e) => resize(Number(e.target.value) || LAYOUT_GRID_SIZE.min, watched.height)}
                  />
                </FormField>
                <FormField label="Height (tiles)">
                  <input
                    type="number"
                    className={inputClass}
                    min={LAYOUT_GRID_SIZE.min}
                    max={LAYOUT_GRID_SIZE.max}
                    value={watched.height}
                    onChange={(e) => resize(watched.width, Number(e.target.value) || LAYOUT_GRID_SIZE.min)}
                  />
                </FormField>
              </div>
            </div>
          </Fieldset>

          <Fieldset
            legend="Grid"
            step={2}
            info="Paint tiles onto the grid (click-drag to paint a run) or switch to placing prefabs at specific cells."
          >
            <LayoutGrid
              width={watched.width}
              height={watched.height}
              tiles={watched.tiles ?? createEmptyTileGrid(watched.width, watched.height)}
              objects={watched.objects ?? []}
              onTilesChange={(tiles) => setValue('tiles', tiles)}
              onObjectsChange={(objects) => setValue('objects', objects)}
            />
            {errors.tiles?.message && <p className="field error">{errors.tiles.message}</p>}
          </Fieldset>

          <Fieldset
            legend="Placement in the room"
            step={3}
            info="How the game's world-gen engine drops this layout into a room that references it."
          >
            <div className="row-2">
              <FormField label="Position">
                <select className={inputClass} {...register('layoutPosition')}>
                  {LAYOUT_POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Start mask" info="Which ground exceptions are allowed when the engine first tries to fit this layout.">
                <select className={inputClass} {...register('startMask')}>
                  {PLACE_MASKS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Fill mask" info="Same as start mask, but for filling the rest of the layout's footprint.">
                <select className={inputClass} {...register('fillMask')}>
                  {PLACE_MASKS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </Fieldset>
        </div>

        <FormFooter itemName={watched.id || 'New static layout'} saveLabel={initialLayout ? 'Save changes' : 'Add layout'} onCancel={onCancel} />
      </form>
    </>
  )
}
