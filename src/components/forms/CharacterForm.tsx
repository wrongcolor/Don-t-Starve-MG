import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { characterDefSchema, CHARACTER_GENDERS, CHARACTER_PERKS, type CharacterDef } from '../../types/modProject'
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
}

const PERK_LABELS: Record<(typeof CHARACTER_PERKS)[number], string> = {
  no_hunger: 'Doesn\'t feel hunger',
  no_sanity_drain: 'Sanity doesn\'t drain naturally',
  fire_immune: 'Fire immune',
  freeze_immune: 'Freeze immune',
  night_vision: 'Sees in the dark',
  faster_walk: 'Walks faster (+25%)',
}

export function CharacterForm({ initialCharacter, onSave, onCancel }: CharacterFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CharacterDef>({
    resolver: zodResolver(characterDefSchema),
    defaultValues: initialCharacter ?? emptyCharacter,
  })

  const inventory = useFieldArray({ control, name: 'startingInventory' as never })
  const watched = watch()

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
