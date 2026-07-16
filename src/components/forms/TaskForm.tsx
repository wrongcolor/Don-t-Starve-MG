import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskDefSchema, WORLD_TILES, LOCKS, KEYS, type TaskDef } from '../../types/worldContent'
import { FormField, Fieldset, inputClass, btnPrimary, btnSecondary, btnDanger } from './FormField'

interface TaskFormProps {
  initialTask?: TaskDef
  onSave: (task: TaskDef) => void
  onCancel?: () => void
}

const emptyTask: TaskDef = {
  id: '',
  locks: ['NONE'],
  keysGiven: [],
  roomChoices: [],
  backgroundTerrain: 'GRASS',
  backgroundRoom: undefined,
}

// Locks gate this Task behind keys given by other tasks; keysGiven are what THIS
// task unlocks for others once generated. Both use the same confirmed enum shape,
// so this one component renders either list — see docs/dst-knowledge/patterns.md#16.
function EnumListEditor({
  label,
  options,
  values,
  onAdd,
  onRemove,
}: {
  label: string
  options: readonly string[]
  values: string[]
  onAdd: (value: string) => void
  onRemove: (index: number) => void
}) {
  const [selected, setSelected] = useState(options[0])
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-parchment-300">{label}</span>
      <div className="flex gap-2">
        <select className={inputClass} value={selected} onChange={(e) => setSelected(e.target.value)}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <button type="button" className={btnSecondary} onClick={() => onAdd(selected)}>
          + Adicionar
        </button>
      </div>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((v, index) => (
            <li
              key={`${v}-${index}`}
              className="flex items-center gap-1 rounded-full bg-ink-800 border border-ink-700 px-2 py-0.5 text-xs text-parchment-200"
            >
              {v}
              <button type="button" className="text-blood-400" onClick={() => onRemove(index)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TaskForm({ initialTask, onSave, onCancel }: TaskFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskDef>({
    resolver: zodResolver(taskDefSchema),
    defaultValues: initialTask ?? emptyTask,
  })

  const roomChoices = useFieldArray({ control, name: 'roomChoices' })

  const [locks, setLocks] = useState<string[]>((initialTask ?? emptyTask).locks)
  const [keysGiven, setKeysGiven] = useState<string[]>((initialTask ?? emptyTask).keysGiven)

  const enableRegion = watch('regionId') !== undefined

  const onSubmit = (data: TaskDef) => onSave(data)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <FormField label="Id (nome da task)" error={errors.id?.message}>
        <input className={inputClass} {...register('id')} disabled={!!initialTask} placeholder="Minha Nova Area" />
      </FormField>

      <Fieldset legend="Progressão (lock & key)" className="space-y-3">
        <EnumListEditor
          label="Travas (precisa ter essas chaves pra entrar aqui)"
          options={LOCKS}
          values={locks}
          onAdd={(v) => {
            const next = [...locks, v]
            setLocks(next)
            setValue('locks', next)
          }}
          onRemove={(i) => {
            const next = locks.filter((_, idx) => idx !== i)
            setLocks(next)
            setValue('locks', next)
          }}
        />
        <EnumListEditor
          label="Chaves dadas (o que essa área libera pra outras)"
          options={KEYS}
          values={keysGiven}
          onAdd={(v) => {
            const next = [...keysGiven, v]
            setKeysGiven(next)
            setValue('keysGiven', next)
          }}
          onRemove={(i) => {
            const next = keysGiven.filter((_, idx) => idx !== i)
            setKeysGiven(next)
            setValue('keysGiven', next)
          }}
        />
      </Fieldset>

      <Fieldset legend="Salas (Rooms)">
        <div className="space-y-2">
          {roomChoices.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-center">
              <input
                className={inputClass}
                placeholder="id da sala (sua ou do jogo base)"
                {...register(`roomChoices.${index}.roomId` as const)}
              />
              <input
                type="number"
                className={`${inputClass} w-20`}
                placeholder="mín"
                {...register(`roomChoices.${index}.count.min` as const, { valueAsNumber: true })}
              />
              <span className="text-xs text-parchment-400">a</span>
              <input
                type="number"
                className={`${inputClass} w-20`}
                placeholder="máx"
                {...register(`roomChoices.${index}.count.max` as const, { valueAsNumber: true })}
              />
              <button type="button" className={btnDanger} onClick={() => roomChoices.remove(index)}>
                Remover
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`${btnSecondary} mt-2`}
          onClick={() => roomChoices.append({ roomId: '', count: { min: 1, max: 1 } })}
        >
          + Sala
        </button>
        {errors.roomChoices?.message && <p className="mt-1 text-xs text-blood-400">{errors.roomChoices.message}</p>}
      </Fieldset>

      <Fieldset legend="Terreno e mapa">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Terreno de fundo">
            <select className={inputClass} {...register('backgroundTerrain')}>
              {WORLD_TILES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Sala de fundo (opcional)">
            <input className={inputClass} {...register('backgroundRoom')} placeholder="ex: BGGrass" />
          </FormField>
        </div>

        <label className="flex items-center gap-2 text-sm text-parchment-300">
          <input
            type="checkbox"
            checked={enableRegion}
            onChange={(e) => setValue('regionId', e.target.checked ? 'minhailha1' : undefined)}
          />
          Faz parte de uma ilha separada do continente
        </label>
        {enableRegion && (
          <FormField
            label="Id da região (use o mesmo id em todas as Tasks dessa ilha)"
            hint='Tasks com o mesmo "id da região" viram um único pedaço de terra isolado, ligado ao continente por uma única travessia — é assim que a Ilha da Lua é montada no jogo (patterns.md#17).'
          >
            <input className={inputClass} {...register('regionId')} />
          </FormField>
        )}
      </Fieldset>

      <div className="flex gap-2">
        <button type="submit" className={btnPrimary}>
          {initialTask ? 'Salvar alterações' : 'Adicionar task'}
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
