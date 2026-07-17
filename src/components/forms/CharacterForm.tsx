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
  title: 'a personagem original',
  name: '',
  description: '',
  quote: '',
  stats: { health: 150, hunger: 150, sanity: 200 },
  startingInventory: ['torch'],
  speechOverrides: {},
  perks: [],
}

const PERK_LABELS: Record<(typeof CHARACTER_PERKS)[number], string> = {
  no_hunger: 'Não sente fome',
  no_sanity_drain: 'Sanidade não drena naturalmente',
  fire_immune: 'Imune a fogo',
  freeze_immune: 'Imune a congelamento',
  night_vision: 'Enxerga no escuro',
  faster_walk: 'Anda mais rápido (+25%)',
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
        <FormHeader icon="🧑" title={initialCharacter ? initialCharacter.name : 'Novo Personagem'} />

        <div className="main-scroll">
          <div className="grid-2">
            <Fieldset legend="Identidade" step={1}>
              <div className="row-2">
                <FormField label="Id (identificador interno)" error={errors.id?.message}>
                  <input className={inputClass} {...register('id')} disabled={!!initialCharacter} placeholder="meu_char" />
                </FormField>
                <FormField label="Gênero">
                  <select className={inputClass} {...register('gender')}>
                    {CHARACTER_GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Nome exibido" error={errors.name?.message}>
                <input className={inputClass} {...register('name')} />
              </FormField>

              <FormField label='Título (ex: "a estranha", "o inventor")' error={errors.title?.message}>
                <input className={inputClass} {...register('title')} />
              </FormField>
            </Fieldset>

            <Fieldset legend="Apresentação" step={2}>
              <FormField label="Descrição (tela de seleção)" error={errors.description?.message}>
                <textarea className={inputClass} rows={2} {...register('description')} />
              </FormField>

              <FormField label="Frase de efeito" error={errors.quote?.message}>
                <input className={inputClass} {...register('quote')} />
              </FormField>
            </Fieldset>
          </div>

          <div className="grid-3">
            <Fieldset legend="Atributos" step={3}>
              <div className="row-2">
                <FormField label="Vida">
                  <input type="number" className={inputClass} {...register('stats.health', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Fome">
                  <input type="number" className={inputClass} {...register('stats.hunger', { valueAsNumber: true })} />
                </FormField>
              </div>
              <FormField label="Sanidade">
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

            <Fieldset legend="Inventário inicial" step={5}>
              {inventory.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="id do prefab (ex: torch)" {...register(`startingInventory.${index}` as const)} />
                  <button type="button" className={btnDanger} onClick={() => inventory.remove(index)}>
                    Remover
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient" onClick={() => inventory.append('')}>
                + Adicionar item
              </button>
            </Fieldset>
          </div>

          <p style={{ fontSize: 12, color: 'var(--ink-soft)', padding: '0 4px' }}>
            Fala customizada: por padrão o personagem herda toda a fala do Wilson (speech_wilson). Você pode
            ajustar chaves específicas depois de gerar o mod, editando <code>speech_{'{id}'}.lua</code>.
          </p>
        </div>

        <FormFooter itemName={watched.name || 'Novo personagem'} saveLabel={initialCharacter ? 'Salvar alterações' : 'Adicionar personagem'} onCancel={onCancel} />
      </form>

      <CharacterPreview character={watched} />
    </>
  )
}
