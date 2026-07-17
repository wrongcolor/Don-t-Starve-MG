import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskDefSchema, WORLD_TILES, LOCKS, KEYS, type TaskDef } from '../../types/worldContent'
import { FormField, Fieldset, FormHeader, FormFooter, inputClass, btnDanger } from './FormField'
import { TaskPreview } from './TaskPreview'

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
    <div className="field">
      <span>{label}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <select className={inputClass} value={selected} onChange={(e) => setSelected(e.target.value)}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <button type="button" className="btn-outline" onClick={() => onAdd(selected)}>
          + Adicionar
        </button>
      </div>
      {values.length > 0 && (
        <div className="sel-tags" style={{ marginTop: 8 }}>
          {values.map((v, index) => (
            <div key={`${v}-${index}`} className="sel-tag">
              {v}
              <button type="button" className="x" onClick={() => onRemove(index)}>
                ✕
              </button>
            </div>
          ))}
        </div>
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

  const watched = watch()
  const enableRegion = watched.regionId !== undefined

  const onSubmit = (data: TaskDef) => onSave(data)

  return (
    <>
      <form className="main" onSubmit={handleSubmit(onSubmit)}>
        <FormHeader icon="📍" title={initialTask ? initialTask.id : 'Nova Task'} />

        <div className="main-scroll">
          <Fieldset legend="Identidade" step={1}>
            <FormField label="Id (nome da task)" error={errors.id?.message}>
              <input className={inputClass} {...register('id')} disabled={!!initialTask} placeholder="Minha Nova Area" />
            </FormField>
          </Fieldset>

          <div className="grid-2">
            <Fieldset legend="Progressão (lock &amp; key)" step={2}>
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

            <Fieldset legend="Salas (Rooms)" step={3}>
              {roomChoices.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="id da sala (sua ou do jogo base)" {...register(`roomChoices.${index}.roomId` as const)} />
                  <input type="number" className="qty-input" placeholder="mín" {...register(`roomChoices.${index}.count.min` as const, { valueAsNumber: true })} />
                  <input type="number" className="qty-input" placeholder="máx" {...register(`roomChoices.${index}.count.max` as const, { valueAsNumber: true })} />
                  <button type="button" className={btnDanger} onClick={() => roomChoices.remove(index)}>
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-ingredient"
                onClick={() => roomChoices.append({ roomId: '', count: { min: 1, max: 1 } })}
              >
                + Adicionar sala
              </button>
              {errors.roomChoices?.message && <p className="field error">{errors.roomChoices.message}</p>}
            </Fieldset>
          </div>

          <Fieldset legend="Terreno e mapa" step={4}>
            <div className="row-2">
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

            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableRegion}
                  onChange={(e) => setValue('regionId', e.target.checked ? 'minhailha1' : undefined)}
                />
                Faz parte de uma ilha separada do continente
              </label>
            </div>
            {enableRegion && (
              <FormField
                label="Id da região (use o mesmo id em todas as Tasks dessa ilha)"
                hint='Tasks com o mesmo "id da região" viram um único pedaço de terra isolado, ligado ao continente por uma única travessia — é assim que a Ilha da Lua é montada no jogo (patterns.md#17).'
              >
                <input className={inputClass} {...register('regionId')} />
              </FormField>
            )}
          </Fieldset>
        </div>

        <FormFooter itemName={watched.id || 'Nova task'} saveLabel={initialTask ? 'Salvar alterações' : 'Adicionar task'} onCancel={onCancel} />
      </form>

      <TaskPreview task={watched} />
    </>
  )
}
