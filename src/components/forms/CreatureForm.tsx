import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  creatureDefSchema,
  CREATURE_BEHAVIORS,
  VANILLA_CREATURE_BUILDS,
  type CreatureDef,
} from '../../types/modProject'
import { FormField, inputClass, btnPrimary, btnSecondary, btnDanger } from './FormField'

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

  const onSubmit = (data: CreatureDef) => onSave(data)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Id (identificador interno)" error={errors.id?.message}>
          <input className={inputClass} {...register('id')} disabled={!!initialCreature} placeholder="minha_criatura" />
        </FormField>
        <FormField label="Comportamento">
          <select className={inputClass} {...register('behavior')}>
            {CREATURE_BEHAVIORS.map((b) => (
              <option key={b} value={b}>
                {b === 'passive' ? 'Passiva (foge/vagueia)' : b === 'neutral' ? 'Neutra (revida se atacada)' : 'Hostil (ataca por conta própria)'}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Nome exibido" error={errors.displayName?.message}>
        <input className={inputClass} {...register('displayName')} />
      </FormField>

      <FormField label="Descrição (inspect)" error={errors.description?.message}>
        <textarea className={inputClass} rows={2} {...register('description')} />
      </FormField>

      <fieldset className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Atributos</legend>
        <div className="grid grid-cols-4 gap-2">
          <FormField label="Vida">
            <input type="number" className={inputClass} {...register('stats.health', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Dano">
            <input type="number" className={inputClass} {...register('stats.damage', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Período de ataque (s)">
            <input type="number" step="0.1" className={inputClass} {...register('stats.attackPeriod', { valueAsNumber: true })} />
          </FormField>
          <FormField label="Velocidade">
            <input type="number" step="0.1" className={inputClass} {...register('stats.walkSpeed', { valueAsNumber: true })} />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Animação</legend>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="creature-animation-source"
            checked={animationSource === 'custom'}
            onChange={() => {
              setAnimationSource('custom')
              setValue('animation', { source: 'custom' })
            }}
          />
          Vou criar minha própria animação (build próprio, anim/&lt;id&gt;.zip)
        </label>
        <label className="flex items-center gap-2 text-sm">
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
          Usar uma animação já existente no jogo
        </label>

        {animationSource === 'vanilla' && (
          <div className="space-y-2 pl-1">
            <FormField label="Build">
              <select className={inputClass} {...register('animation.build' as const)}>
                {VANILLA_CREATURE_BUILDS.map((b) => (
                  <option key={b.build} value={b.build}>
                    {b.label}
                  </option>
                ))}
              </select>
            </FormField>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nomes das animações usadas nesse build (ajuste se o build escolhido usar nomes
              diferentes — esta ferramenta não confirma isso contra os arquivos do jogo):
            </p>
            <div className="grid grid-cols-5 gap-2">
              <FormField label="Idle">
                <input className={inputClass} {...register('animation.clips.idle' as const)} />
              </FormField>
              <FormField label="Andar">
                <input className={inputClass} {...register('animation.clips.walk' as const)} />
              </FormField>
              <FormField label="Ataque">
                <input className={inputClass} {...register('animation.clips.atk' as const)} />
              </FormField>
              <FormField label="Acertado">
                <input className={inputClass} {...register('animation.clips.hit' as const)} />
              </FormField>
              <FormField label="Morte">
                <input className={inputClass} {...register('animation.clips.death' as const)} />
              </FormField>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Reaproveitar uma animação do jogo dispensa o build próprio, mas confirme em-jogo (
          <code>c_spawn</code>) que a criatura anda/ataca/morre corretamente antes de publicar.
        </p>
      </fieldset>

      <fieldset className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Loot</legend>
        <div className="space-y-2">
          {loot.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <input
                className={inputClass}
                placeholder="id do prefab (ex: monstermeat)"
                {...register(`loot.${index}.prefab` as const)}
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                className={`${inputClass} w-24`}
                {...register(`loot.${index}.chance` as const, { valueAsNumber: true })}
              />
              <button type="button" className={btnDanger} onClick={() => loot.remove(index)}>
                Remover
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={`${btnSecondary} mt-2`} onClick={() => loot.append({ prefab: '', chance: 1 })}>
          + Loot
        </button>
      </fieldset>

      <fieldset className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
          Tags extras (opcional)
        </legend>
        <div className="space-y-2">
          {tags.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <input className={inputClass} placeholder="ex: prey, largecreature" {...register(`tags.${index}` as const)} />
              <button type="button" className={btnDanger} onClick={() => tags.remove(index)}>
                Remover
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={`${btnSecondary} mt-2`} onClick={() => tags.append('')}>
          + Tag
        </button>
      </fieldset>

      <div className="flex gap-2">
        <button type="submit" className={btnPrimary}>
          {initialCreature ? 'Salvar alterações' : 'Adicionar criatura'}
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
