import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  creatureDefSchema,
  CREATURE_BEHAVIORS,
  VANILLA_CREATURE_BUILDS,
  type CreatureDef,
} from '../../types/modProject'
import { FormField, Fieldset, FormHeader, FormFooter, inputClass, btnDanger } from './FormField'
import { CreaturePreview } from './CreaturePreview'

interface CreatureFormProps {
  initialCreature?: CreatureDef
  onSave: (creature: CreatureDef) => void
  onCancel?: () => void
}

const DEFAULT_CLIPS = { idle: 'idle', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' }

const emptyCreature: CreatureDef = {
  id: '',
  displayName: '',
  description: '',
  animation: { source: 'custom' },
  stats: { health: 100, damage: 20, attackPeriod: 2, walkSpeed: 4 },
  loot: [{ prefab: 'monstermeat', chance: 1 }],
  behavior: 'neutral',
  tags: [],
}

export function CreatureForm({ initialCreature, onSave, onCancel }: CreatureFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatureDef>({
    resolver: zodResolver(creatureDefSchema),
    defaultValues: initialCreature ?? emptyCreature,
  })

  const loot = useFieldArray({ control, name: 'loot' })
  const tags = useFieldArray({ control, name: 'tags' as never })

  const [animationSource, setAnimationSource] = useState<'custom' | 'vanilla'>(
    (initialCreature ?? emptyCreature).animation?.source ?? 'custom',
  )
  const watched = watch()
  const enableAttackRange = watched.stats?.attackRange !== undefined
  const enableSanityAura = watched.sanityAura !== undefined
  const enableCookable = watched.cookable !== undefined

  const onSubmit = (data: CreatureDef) => onSave(data)

  return (
    <>
      <form className="main" onSubmit={handleSubmit(onSubmit)}>
        <FormHeader icon="👹" title={initialCreature ? initialCreature.displayName : 'New Creature'} />

        <div className="main-scroll">
          <div className="grid-2">
            <Fieldset legend="Identity" step={1}>
              <div className="row-2">
                <FormField label="Id (internal identifier)" error={errors.id?.message}>
                  <input className={inputClass} {...register('id')} disabled={!!initialCreature} placeholder="my_creature" />
                </FormField>
                <FormField label="Behavior">
                  <select className={inputClass} {...register('behavior')}>
                    {CREATURE_BEHAVIORS.map((b) => (
                      <option key={b} value={b}>
                        {b === 'passive' ? 'Passive (flees/wanders)' : b === 'neutral' ? 'Neutral (fights back if attacked)' : 'Hostile (attacks on its own)'}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Display name" error={errors.displayName?.message}>
                <input className={inputClass} {...register('displayName')} />
              </FormField>

              <FormField label="Description (inspect)" error={errors.description?.message}>
                <textarea className={inputClass} rows={2} {...register('description')} />
              </FormField>
            </Fieldset>

            <Fieldset legend="Animation" step={2}>
              <div className="checks">
                <label>
                  <input
                    type="radio"
                    name="creature-animation-source"
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
                    name="creature-animation-source"
                    checked={animationSource === 'vanilla'}
                    onChange={() => {
                      setAnimationSource('vanilla')
                      setValue('animation', {
                        source: 'vanilla',
                        build: VANILLA_CREATURE_BUILDS[0].build,
                        clips: DEFAULT_CLIPS,
                      })
                    }}
                  />
                  Reuse an existing in-game animation
                </label>
              </div>

              {animationSource === 'vanilla' && (
                <>
                  <FormField label="Build">
                    <select className={inputClass} {...register('animation.build' as const)}>
                      {VANILLA_CREATURE_BUILDS.map((b) => (
                        <option key={b.build} value={b.build}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <p className="field hint">Animation clip names used by this build (adjust if needed — not confirmed against the game files):</p>
                  <div className="row-2">
                    <FormField label="Idle">
                      <input className={inputClass} {...register('animation.clips.idle' as const)} />
                    </FormField>
                    <FormField label="Walk">
                      <input className={inputClass} {...register('animation.clips.walk' as const)} />
                    </FormField>
                    <FormField label="Attack">
                      <input className={inputClass} {...register('animation.clips.atk' as const)} />
                    </FormField>
                    <FormField label="Hit">
                      <input className={inputClass} {...register('animation.clips.hit' as const)} />
                    </FormField>
                    <FormField label="Death">
                      <input className={inputClass} {...register('animation.clips.death' as const)} />
                    </FormField>
                  </div>
                </>
              )}
            </Fieldset>
          </div>

          <div className="grid-3">
            <Fieldset legend="Combat stats" step={3}>
              <div className="row-2">
                <FormField label="Health">
                  <input type="number" className={inputClass} {...register('stats.health', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Damage">
                  <input type="number" className={inputClass} {...register('stats.damage', { valueAsNumber: true })} />
                </FormField>
              </div>
              <div className="row-2">
                <FormField label="Attack period (s)">
                  <input type="number" step="0.1" className={inputClass} {...register('stats.attackPeriod', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Speed">
                  <input type="number" step="0.1" className={inputClass} {...register('stats.walkSpeed', { valueAsNumber: true })} />
                </FormField>
              </div>

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableAttackRange}
                    onChange={(e) => setValue('stats.attackRange', e.target.checked ? 3 : undefined)}
                  />
                  Custom attack range (default: 2)
                </label>
              </div>
              {enableAttackRange && (
                <FormField label="Range">
                  <input type="number" step="0.1" className={inputClass} {...register('stats.attackRange', { valueAsNumber: true })} />
                </FormField>
              )}
            </Fieldset>

            <Fieldset legend="Traits" step={4}>
              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableSanityAura}
                    onChange={(e) => setValue('sanityAura', e.target.checked ? -10 : undefined)}
                  />
                  Affects the sanity of nearby survivors
                </label>
              </div>
              {enableSanityAura && (
                <FormField label="Sanity aura (negative = scary)">
                  <input type="number" className={inputClass} {...register('sanityAura', { valueAsNumber: true })} />
                </FormField>
              )}

              <div className="checks">
                <label>
                  <input type="checkbox" {...register('flammable')} />
                  Can catch fire
                </label>
                <label>
                  <input type="checkbox" {...register('freezable')} />
                  Can freeze
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={enableCookable}
                    onChange={(e) => setValue('cookable', e.target.checked ? { product: 'cookedsmallmeat' } : undefined)}
                  />
                  Can be cooked over a fire
                </label>
              </div>
              {enableCookable && (
                <FormField label="Becomes this prefab when cooked (e.g. cookedsmallmeat)">
                  <input className={inputClass} {...register('cookable.product')} />
                </FormField>
              )}
            </Fieldset>

            <Fieldset legend="Loot and tags" step={5}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', marginBottom: 8 }}>Loot</span>
              {loot.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="prefab id (e.g. monstermeat)" {...register(`loot.${index}.prefab` as const)} />
                  <input type="number" step="0.01" min="0.01" max="1" className="qty-input" {...register(`loot.${index}.chance` as const, { valueAsNumber: true })} />
                  <button type="button" className={btnDanger} onClick={() => loot.remove(index)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient" onClick={() => loot.append({ prefab: '', chance: 1 })}>
                + Add loot
              </button>

              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', margin: '12px 0 8px' }}>Extra tags</span>
              {tags.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="e.g. prey, largecreature" {...register(`tags.${index}` as const)} />
                  <button type="button" className={btnDanger} onClick={() => tags.remove(index)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient" onClick={() => tags.append('')}>
                + Add tag
              </button>
            </Fieldset>
          </div>
        </div>

        <FormFooter itemName={watched.displayName || 'New creature'} saveLabel={initialCreature ? 'Save changes' : 'Add creature'} onCancel={onCancel} />
      </form>

      <CreaturePreview creature={watched} />
    </>
  )
}
