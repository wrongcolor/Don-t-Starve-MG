import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { characterDefSchema, CHARACTER_GENDERS, CHARACTER_PERKS, type CharacterDef } from '../../types/modProject'
import { FormField, Fieldset, inputClass, btnPrimary, btnSecondary, btnDanger } from './FormField'

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
    formState: { errors },
  } = useForm<CharacterDef>({
    resolver: zodResolver(characterDefSchema),
    defaultValues: initialCharacter ?? emptyCharacter,
  })

  const inventory = useFieldArray({ control, name: 'startingInventory' as never })

  const onSubmit = (data: CharacterDef) => onSave(data)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
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

      <FormField label="Descrição (tela de seleção)" error={errors.description?.message}>
        <textarea className={inputClass} rows={2} {...register('description')} />
      </FormField>

      <FormField label="Frase de efeito" error={errors.quote?.message}>
        <input className={inputClass} {...register('quote')} />
      </FormField>

      <Fieldset legend="Atributos">
        <div className="grid grid-cols-3 gap-2">
          <FormField label="Vida">
            <input type="number" className={inputClass} {...register('stats.health', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Fome">
            <input type="number" className={inputClass} {...register('stats.hunger', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Sanidade">
            <input type="number" className={inputClass} {...register('stats.sanity', { valueAsNumber: true })} />
          </FormField>
        </div>
      </Fieldset>

      <Fieldset legend="Perks">
        <div className="grid grid-cols-2 gap-1">
          {CHARACTER_PERKS.map((perk) => (
            <label key={perk} className="flex items-center gap-1.5 text-xs text-parchment-300">
              <input type="checkbox" value={perk} {...register('perks')} />
              {PERK_LABELS[perk]}
            </label>
          ))}
        </div>
      </Fieldset>

      <Fieldset legend="Inventário inicial">
        <div className="space-y-2">
          {inventory.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <input
                className={inputClass}
                placeholder="id do prefab (ex: torch)"
                {...register(`startingInventory.${index}` as const)}
              />
              <button type="button" className={btnDanger} onClick={() => inventory.remove(index)}>
                Remover
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={`${btnSecondary} mt-2`} onClick={() => inventory.append('')}>
          + Item
        </button>
      </Fieldset>

      <p className="text-xs text-parchment-400">
        Fala customizada: por padrão o personagem herda toda a fala do Wilson (speech_wilson). Você
        pode ajustar chaves específicas depois de gerar o mod, editando <code>speech_{'{id}'}.lua</code>.
      </p>

      <div className="flex gap-2">
        <button type="submit" className={btnPrimary}>
          {initialCharacter ? 'Salvar alterações' : 'Adicionar personagem'}
        </button>
        {onCancel && (
          <button type="button" className={btnSecondary} onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
