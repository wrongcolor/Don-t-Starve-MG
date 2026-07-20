import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { characterDefSchema, CHARACTER_GENDERS, CHARACTER_PERKS, FOOD_TYPES, type CharacterDef } from '../../types/modProject'
import { FormField, Fieldset, FormHeader, FormFooter, inputClass, btnDanger } from './FormField'
import { CharacterPreview } from './CharacterPreview'

interface CharacterFormProps {
  initialCharacter?: CharacterDef
  onSave: (character: CharacterDef) => void
  onCancel?: () => void
}

const emptyCharacter: CharacterDef = {
  id: '',
  gender: 'NEUTRAL',
  title: 'the original character',
  name: '',
  description: '',
  quote: '',
  stats: { health: 150, hunger: 150, sanity: 200 },
  startingInventory: ['torch'],
  speechOverrides: {},
  perks: [],
  foodTypeAffinities: [],
}

const PERK_LABELS: Record<(typeof CHARACTER_PERKS)[number], string> = {
  no_sanity_drain: 'Sanity doesn\'t drain naturally',
  fire_immune: 'Fire immune',
  freeze_immune: 'Freeze immune',
  night_vision: 'Sees in the dark',
}

export function CharacterForm({ initialCharacter, onSave, onCancel }: CharacterFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CharacterDef>({
    resolver: zodResolver(characterDefSchema),
    defaultValues: initialCharacter ?? emptyCharacter,
  })

  const inventory = useFieldArray({ control, name: 'startingInventory' as never })
  const affinities = useFieldArray({ control, name: 'foodTypeAffinities' })
  const watched = watch()
  const enableDamageMultiplier = watched.damageMultiplier !== undefined
  const enableHungerRateMultiplier = watched.hungerRateMultiplier !== undefined
  const enableWalkSpeedMultiplier = watched.walkSpeedMultiplier !== undefined

  const onSubmit = (data: CharacterDef) => onSave(data)

  return (
    <>
      <form className="main" onSubmit={handleSubmit(onSubmit)}>
        <FormHeader icon="🧑" title={initialCharacter ? initialCharacter.name : 'New Character'} />

        <div className="main-scroll">
          <div className="grid-2">
            <Fieldset legend="Identity" step={1}>
              <div className="row-2">
                <FormField label="Id (internal identifier)" error={errors.id?.message}>
                  <input className={inputClass} {...register('id')} disabled={!!initialCharacter} placeholder="my_char" />
                </FormField>
                <FormField label="Gender">
                  <select className={inputClass} {...register('gender')}>
                    {CHARACTER_GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Display name" error={errors.name?.message}>
                <input className={inputClass} {...register('name')} />
              </FormField>

              <FormField label='Title (e.g. "the wanderer", "the inventor")' error={errors.title?.message}>
                <input className={inputClass} {...register('title')} />
              </FormField>
            </Fieldset>

            <Fieldset legend="Presentation" step={2}>
              <FormField label="Description (selection screen)" error={errors.description?.message}>
                <textarea className={inputClass} rows={2} {...register('description')} />
              </FormField>

              <FormField label="Catchphrase" error={errors.quote?.message}>
                <input className={inputClass} {...register('quote')} />
              </FormField>
            </Fieldset>
          </div>

          <div className="grid-3">
            <Fieldset legend="Stats" step={3}>
              <div className="row-2">
                <FormField label="Health">
                  <input type="number" className={inputClass} {...register('stats.health', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Hunger">
                  <input type="number" className={inputClass} {...register('stats.hunger', { valueAsNumber: true })} />
                </FormField>
              </div>
              <FormField label="Sanity">
                <input type="number" className={inputClass} {...register('stats.sanity', { valueAsNumber: true })} />
              </FormField>
            </Fieldset>

            <Fieldset legend="Perks" step={4}>
              <div className="tag-grid">
                {CHARACTER_PERKS.map((perk) => (
                  <label key={perk} className={`tag-opt ${watched.perks?.includes(perk) ? 'selected' : ''}`}>
                    <input type="checkbox" value={perk} className="sr-only" {...register('perks')} />
                    {PERK_LABELS[perk]}
                  </label>
                ))}
              </div>
            </Fieldset>

            <Fieldset legend="Starting inventory" step={5}>
              {inventory.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="prefab id (e.g. torch)" {...register(`startingInventory.${index}` as const)} />
                  <button type="button" className={btnDanger} onClick={() => inventory.remove(index)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient" onClick={() => inventory.append('')}>
                + Add item
              </button>
            </Fieldset>
          </div>

          <Fieldset legend="Stat multipliers (optional)" step={6}>
            <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: -4, marginBottom: 8 }}>
              Sourced from a real character mod's master_postinit (see docs/dst-knowledge/patterns.md#21) — a static
              multiplier applied once at spawn, independent of any skill tree.
            </p>
            <div className="row-2">
              <div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableDamageMultiplier}
                      onChange={(e) => setValue('damageMultiplier', e.target.checked ? 1 : undefined)}
                    />
                    Damage dealt
                  </label>
                </div>
                {enableDamageMultiplier && (
                  <FormField label="Multiplier (1 = normal)">
                    <input type="number" step="0.05" className={inputClass} {...register('damageMultiplier', { valueAsNumber: true })} />
                  </FormField>
                )}
              </div>
              <div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableHungerRateMultiplier}
                      onChange={(e) => setValue('hungerRateMultiplier', e.target.checked ? 1 : undefined)}
                    />
                    Hunger rate
                  </label>
                </div>
                {enableHungerRateMultiplier && (
                  <FormField label="Multiplier (1 = normal, 0 = never hungry)">
                    <input type="number" step="0.05" className={inputClass} {...register('hungerRateMultiplier', { valueAsNumber: true })} />
                  </FormField>
                )}
              </div>
              <div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableWalkSpeedMultiplier}
                      onChange={(e) => setValue('walkSpeedMultiplier', e.target.checked ? 1.25 : undefined)}
                    />
                    Walk speed
                  </label>
                </div>
                {enableWalkSpeedMultiplier && (
                  <FormField label="Multiplier (1 = normal)">
                    <input type="number" step="0.05" className={inputClass} {...register('walkSpeedMultiplier', { valueAsNumber: true })} />
                  </FormField>
                )}
              </div>
            </div>

            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', margin: '12px 0 8px' }}>
              Food type affinities (extra hunger/health/sanity from a whole food category)
            </span>
            {affinities.fields.map((field, index) => (
              <div key={field.id} className="ingredient-row">
                <select className={inputClass} {...register(`foodTypeAffinities.${index}.foodType` as const)}>
                  {FOOD_TYPES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  className="qty-input"
                  {...register(`foodTypeAffinities.${index}.multiplier` as const, { valueAsNumber: true })}
                />
                <button type="button" className={btnDanger} onClick={() => affinities.remove(index)}>
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="add-ingredient"
              onClick={() => affinities.append({ foodType: 'VEGGIE', multiplier: 1.33 })}
            >
              + Add affinity
            </button>
          </Fieldset>

          <p style={{ fontSize: 12, color: 'var(--ink-soft)', padding: '0 4px' }}>
            Custom speech: by default the character inherits all of Wilson's speech (speech_wilson). You can adjust
            specific lines after generating the mod, by editing <code>speech_{'{id}'}.lua</code>.
          </p>
        </div>

        <FormFooter itemName={watched.name || 'New character'} saveLabel={initialCharacter ? 'Save changes' : 'Add character'} onCancel={onCancel} />
      </form>

      <CharacterPreview character={watched} />
    </>
  )
}
