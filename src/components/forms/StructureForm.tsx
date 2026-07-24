import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  structureDefSchema,
  TECH_LEVELS,
  RECIPE_FILTERS,
  VANILLA_ITEM_BUILDS,
  PROTOTYPER_CATEGORIES,
  ROOM_SIZES,
  type StructureDef,
} from '../../types/modProject'
import { FormField, Fieldset, FormHeader, FormFooter, InfoTip, inputClass, btnDanger } from './FormField'
import { StructurePreview } from './StructurePreview'
import { PrefabPickerButton } from './PrefabPicker'

interface StructureFormProps {
  initialStructure?: StructureDef
  onSave: (structure: StructureDef) => void
  onCancel?: () => void
}

const emptyStructure: StructureDef = {
  id: '',
  displayName: '',
  description: '',
  animation: { source: 'custom' },
  loot: [],
  recipe: { ingredients: [{ prefab: 'boards', amount: 4 }], techLevel: 'NONE', filters: ['STRUCTURES'] },
}

export function StructureForm({ initialStructure, onSave, onCancel }: StructureFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StructureDef>({
    resolver: zodResolver(structureDefSchema),
    defaultValues: initialStructure ?? emptyStructure,
  })

  const loot = useFieldArray({ control, name: 'loot' })
  const recipe = useFieldArray({ control, name: 'recipe.ingredients' })

  const [animationSource, setAnimationSource] = useState<'custom' | 'vanilla'>(
    (initialStructure ?? emptyStructure).animation?.source ?? 'custom',
  )
  const watched = watch()
  const enableContainer = watched.container !== undefined
  const containerWidgetSource = watched.container?.widget?.source ?? 'vanilla'
  const enableAcceptsTag = watched.container?.acceptsTag !== undefined
  const enablePreservation = watched.container?.preservation !== undefined
  const enableTeleportPair = watched.teleportPair === true
  const enableDaySpawner = watched.daySpawner !== undefined
  const enableResident = watched.resident !== undefined
  const enablePrototyper = watched.prototyper !== undefined
  const enableRestStation = watched.restStation !== undefined
  const enableRestStationUses = watched.restStation?.maxUses !== undefined
  const enableInterior = watched.interior !== undefined

  const onSubmit = (data: StructureDef) => onSave(data)

  return (
    <>
      <form className="main" onSubmit={handleSubmit(onSubmit)}>
        <FormHeader icon="🏛️" title={initialStructure ? initialStructure.displayName : 'New Structure'} />

        <div className="main-scroll">
          <div className="grid-2">
            <Fieldset legend="Identity" step={1}>
              <FormField label="Id (internal identifier)" error={errors.id?.message}>
                <input className={inputClass} {...register('id')} disabled={!!initialStructure} placeholder="my_structure" />
              </FormField>
              <FormField label="Display name" error={errors.displayName?.message}>
                <input className={inputClass} {...register('displayName')} />
              </FormField>
              <FormField label="Description (inspect)" error={errors.description?.message}>
                <textarea className={inputClass} rows={2} {...register('description')} />
              </FormField>
            </Fieldset>

            <Fieldset legend="Appearance" step={2}>
              <div className="checks">
                <label>
                  <input
                    type="radio"
                    name="structure-animation-source"
                    checked={animationSource === 'custom'}
                    onChange={() => {
                      setAnimationSource('custom')
                      setValue('animation', { source: 'custom' })
                    }}
                  />
                  I'll create my own animation (own build, anim/&lt;id&gt;.zip)
                </label>
                <label>
                  <input
                    type="radio"
                    name="structure-animation-source"
                    checked={animationSource === 'vanilla'}
                    onChange={() => {
                      setAnimationSource('vanilla')
                      setValue('animation', { source: 'vanilla', build: VANILLA_ITEM_BUILDS[0].build })
                    }}
                  />
                  Reuse an existing in-game animation
                </label>
              </div>

              {animationSource === 'vanilla' && (
                <FormField
                  label="Animation"
                  error={(errors.animation as { build?: { message?: string } } | undefined)?.build?.message}
                >
                  <select className={inputClass} {...register('animation.build' as const)}>
                    {VANILLA_ITEM_BUILDS.map((b) => (
                      <option key={b.build} value={b.build}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            </Fieldset>
          </div>

          <Fieldset legend="How is it placed?" step={3}>
            <div className="checks">
              <label>
                <input
                  type="radio"
                  name="structure-deploy-mode"
                  checked={watched.deployMode !== 'deployableItem'}
                  onChange={() => setValue('deployMode', undefined)}
                />
                Crafting shows a placer ghost — click the ground to build it directly (like a Science Machine)
              </label>
              <label>
                <input
                  type="radio"
                  name="structure-deploy-mode"
                  checked={watched.deployMode === 'deployableItem'}
                  onChange={() => setValue('deployMode', 'deployableItem')}
                />
                Crafting gives an inventory item first — placed as a separate action, and hammering it back down returns that same item (like Warly's Portable Crock Pot)
              </label>
            </div>
          </Fieldset>

          <Fieldset legend="Recipe (Crafting)" step={4}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', marginBottom: 8 }}>
              Ingredients
            </span>
            {recipe.fields.map((field, index) => (
              <div key={field.id} className="ingredient-row">
                <input className={inputClass} placeholder="prefab id (e.g. boards)" {...register(`recipe.ingredients.${index}.prefab` as const)} />
                <PrefabPickerButton onSelect={(id) => setValue(`recipe.ingredients.${index}.prefab` as const, id, { shouldDirty: true })} />
                <input type="number" className="qty-input" {...register(`recipe.ingredients.${index}.amount` as const, { valueAsNumber: true })} />
                <button type="button" className={btnDanger} onClick={() => recipe.remove(index)}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="add-ingredient" onClick={() => recipe.append({ prefab: '', amount: 1 })}>
              + Add ingredient
            </button>
            {errors.recipe?.ingredients?.message && <p className="field error">{errors.recipe.ingredients.message}</p>}

            <FormField label="Tech level">
              <select className={inputClass} {...register('recipe.techLevel')}>
                {TECH_LEVELS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>

            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', marginBottom: 8 }}>
              Crafting tabs
            </span>
            <div className="tag-grid">
              {RECIPE_FILTERS.map((f) => (
                <label key={f} className={`tag-opt ${watched.recipe?.filters?.includes(f) ? 'selected' : ''}`}>
                  <input type="checkbox" value={f} className="sr-only" {...register('recipe.filters')} />
                  {f}
                </label>
              ))}
            </div>
            {errors.recipe?.filters?.message && <p className="field error">{errors.recipe.filters.message}</p>}
          </Fieldset>

          {watched.deployMode === 'deployableItem' ? (
            <Fieldset legend="Loot (hammered down)" step={5}>
              <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: -4 }}>
                Hammering a deployed item back down returns the inventory item itself, so it never drops separate loot.
              </p>
            </Fieldset>
          ) : (
            <Fieldset legend="Loot (hammered down)" step={5}>
              <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: -4, marginBottom: 8 }}>
                Dropped when a player hammers this structure down (workable + lootdropper).
              </p>
              {loot.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="prefab id (e.g. boards)" {...register(`loot.${index}.prefab` as const)} />
                  <PrefabPickerButton onSelect={(id) => setValue(`loot.${index}.prefab` as const, id, { shouldDirty: true })} />
                  <input type="number" step="0.01" min="0.01" max="1" className="qty-input" {...register(`loot.${index}.chance` as const, { valueAsNumber: true })} />
                  <button type="button" className={btnDanger} onClick={() => loot.remove(index)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient" onClick={() => loot.append({ prefab: '', chance: 1 })}>
                + Add loot
              </button>
            </Fieldset>
          )}

          <Fieldset legend="Container (optional)" step={6}>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableContainer}
                  onChange={(e) =>
                    setValue(
                      'container',
                      e.target.checked
                        ? { widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: false }
                        : undefined,
                    )
                  }
                />
                It's a container (chest/box with slots)
              </label>
            </div>
            {enableContainer && (
              <>
                <div className="icon-toggle-row" style={{ marginBottom: 12 }}>
                  <div
                    className={`icon-toggle ${containerWidgetSource === 'vanilla' ? 'active' : ''}`}
                    onClick={() => setValue('container.widget', { source: 'vanilla', reusePrefab: 'sacred_chest' })}
                  >
                    Reuse a vanilla widget
                  </div>
                  <div
                    className={`icon-toggle ${containerWidgetSource === 'custom' ? 'active' : ''}`}
                    onClick={() => setValue('container.widget', { source: 'custom', slots: 8, columns: 2 })}
                  >
                    Custom widget (own UI art)
                  </div>
                </div>

                {containerWidgetSource === 'vanilla' ? (
                  <FormField
                    label="Reuse this container's widget (prefab id)"
                    hint='Clones its exact skin and slot grid at runtime — no UI art needed. e.g. "sacred_chest", "icebox", "treasurechest".'
                  >
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className={inputClass} {...register('container.widget.reusePrefab' as const)} placeholder="sacred_chest" />
                      <PrefabPickerButton onSelect={(id) => setValue('container.widget.reusePrefab' as const, id, { shouldDirty: true })} />
                    </div>
                  </FormField>
                ) : (
                  <div className="row-2">
                    <FormField label="Slots" hint="Needs a matching ui_<id> build supplied by you — see README.">
                      <input
                        type="number"
                        min={2}
                        max={16}
                        className={inputClass}
                        {...register('container.widget.slots' as const, { valueAsNumber: true })}
                      />
                    </FormField>
                    <FormField label="Columns">
                      <input
                        type="number"
                        min={1}
                        max={8}
                        className={inputClass}
                        {...register('container.widget.columns' as const, { valueAsNumber: true })}
                      />
                    </FormField>
                  </div>
                )}

                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableAcceptsTag}
                      onChange={(e) => setValue('container.acceptsTag', e.target.checked ? '' : undefined)}
                    />
                    Only accepts items with a specific tag
                  </label>
                </div>
                {enableAcceptsTag && (
                  <FormField label="Required tag (e.g. pocketwatch)">
                    <input className={inputClass} {...register('container.acceptsTag')} />
                  </FormField>
                )}

                <div className="checks" style={{ marginTop: 12 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={enablePreservation}
                      onChange={(e) =>
                        setValue('container.preservation', e.target.checked ? { perishRateMultiplier: 0.25 } : undefined)
                      }
                    />
                    Preserves contents (like an icebox)
                  </label>
                </div>
                {enablePreservation && (
                  <div className="row-2">
                    <FormField label="Spoilage rate (0 = never spoils, 1 = normal)">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className={inputClass}
                        {...register('container.preservation.perishRateMultiplier', { valueAsNumber: true })}
                      />
                    </FormField>
                    <FormField label="Temperature effect rate (optional, 1 = normal)">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className={inputClass}
                        {...register('container.preservation.temperatureRateMultiplier', { valueAsNumber: true })}
                      />
                    </FormField>
                  </div>
                )}
              </>
            )}
          </Fieldset>

          <Fieldset legend="Special mechanics" step={7}>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableTeleportPair}
                  onChange={(e) => setValue('teleportPair', e.target.checked || undefined)}
                />
                Teleporter pair (every 2 built link to each other)
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={enableDaySpawner}
                  onChange={(e) =>
                    setValue('daySpawner', e.target.checked ? { prefab: 'deerclops', chance: 0.1, range: 40 } : undefined)
                  }
                />
                Has a chance to spawn a mob at the start of each day
              </label>
            </div>
            {enableDaySpawner && (
              <div className="row-2">
                <FormField label="Prefab to spawn (e.g. deerclops)">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className={inputClass} {...register('daySpawner.prefab')} />
                    <PrefabPickerButton onSelect={(id) => setValue('daySpawner.prefab', id, { shouldDirty: true })} />
                  </div>
                </FormField>
                <FormField label="Chance per day (0 to 1)">
                  <input type="number" step="0.01" min="0.01" max="1" className={inputClass} {...register('daySpawner.chance', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Spawn range (distance from the structure)">
                  <input type="number" min="1" max="100" className={inputClass} {...register('daySpawner.range', { valueAsNumber: true })} />
                </FormField>
              </div>
            )}

            <div className="checks" style={{ marginTop: 12 }}>
              <label>
                <input
                  type="checkbox"
                  checked={enableResident}
                  onChange={(e) =>
                    setValue('resident', e.target.checked ? { prefab: 'pigman', respawnDelayDays: 2 } : undefined)
                  }
                />
                Houses a single persistent resident (like a pig house)
              </label>
            </div>
            {enableResident && (
              <div className="row-2">
                <FormField label="Resident prefab (e.g. pigman)">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className={inputClass} {...register('resident.prefab')} />
                    <PrefabPickerButton onSelect={(id) => setValue('resident.prefab', id, { shouldDirty: true })} />
                  </div>
                </FormField>
                <FormField label="Days to respawn a new resident after it dies">
                  <input type="number" step="0.5" min="0.01" className={inputClass} {...register('resident.respawnDelayDays', { valueAsNumber: true })} />
                </FormField>
              </div>
            )}

            <div className="checks" style={{ marginTop: 12 }}>
              <label>
                <input
                  type="checkbox"
                  checked={enablePrototyper}
                  onChange={(e) =>
                    setValue('prototyper', e.target.checked ? { category: PROTOTYPER_CATEGORIES[0], tier: 1 } : undefined)
                  }
                />
                Crafting station (unlocks recipes for nearby players)
              </label>
            </div>
            {enablePrototyper && (
              <div className="row-2">
                <FormField label="Tech category">
                  <select className={inputClass} {...register('prototyper.category')}>
                    {PROTOTYPER_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Tier (1 to 4)">
                  <input type="number" min="1" max="4" className={inputClass} {...register('prototyper.tier', { valueAsNumber: true })} />
                </FormField>
              </div>
            )}

            <div className="checks" style={{ marginTop: 12 }}>
              <label>
                <input
                  type="checkbox"
                  checked={enableRestStation}
                  onChange={(e) =>
                    setValue(
                      'restStation',
                      e.target.checked ? { sleepPhase: 'night', healthPerTick: 1, hungerPerTick: -1, sanityPerTick: 1 } : undefined,
                    )
                  }
                />
                Players can sleep here to recover health/hunger/sanity (like a Tent)
              </label>
            </div>
            {enableRestStation && (
              <>
                <div className="row-2">
                  <FormField label="Only usable at">
                    <select className={inputClass} {...register('restStation.sleepPhase')}>
                      <option value="night">Night</option>
                      <option value="day">Day</option>
                    </select>
                  </FormField>
                  <FormField label="Health per tick (1 tick = 1s asleep)">
                    <input type="number" step="0.1" className={inputClass} {...register('restStation.healthPerTick', { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Hunger per tick (negative = costs hunger)">
                    <input type="number" step="0.1" className={inputClass} {...register('restStation.hungerPerTick', { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Sanity per tick">
                    <input type="number" step="0.1" className={inputClass} {...register('restStation.sanityPerTick', { valueAsNumber: true })} />
                  </FormField>
                </div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableRestStationUses}
                      onChange={(e) => setValue('restStation.maxUses', e.target.checked ? 15 : undefined)}
                    />
                    Wears out after a limited number of uses
                  </label>
                </div>
                {enableRestStationUses && (
                  <FormField label="Max uses">
                    <input type="number" min="1" className={inputClass} {...register('restStation.maxUses', { valueAsNumber: true })} />
                  </FormField>
                )}
              </>
            )}

            <div className="checks" style={{ marginTop: 12 }}>
              <label>
                <input
                  type="checkbox"
                  checked={enableInterior}
                  onChange={(e) => setValue('interior', e.target.checked ? { size: 'tiny' } : undefined)}
                />
                Walking through its door leads to a separate interior room
                <InfoTip text="Real mechanism from the published mod 'Above the Clouds' (interiorspawner) — the generated mod will declare a dependency on it (mod_dependencies), so players need it installed too." />
              </label>
            </div>
            {enableInterior && (
              <FormField label="Room size">
                <select className={inputClass} {...register('interior.size')}>
                  {ROOM_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size[0].toUpperCase() + size.slice(1)}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </Fieldset>
        </div>

        <FormFooter itemName={watched.displayName || 'New structure'} saveLabel={initialStructure ? 'Save changes' : 'Add structure'} onCancel={onCancel} />
      </form>

      <StructurePreview structure={watched} />
    </>
  )
}
