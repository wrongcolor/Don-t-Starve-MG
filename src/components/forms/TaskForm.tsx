import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskDefSchema, WORLD_TILES, LOCKS, KEYS, TASK_LOCATIONS, type TaskDef } from '../../types/worldContent'
import { FormField, Fieldset, FormHeader, FormFooter, InfoTip, inputClass, btnDanger } from './FormField'
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
  locations: ['forest'],
}

// Locks gate this Task behind keys given by other tasks; keysGiven are what THIS
// task unlocks for others once generated. Both use the same confirmed enum shape,
// so this one component renders either list — see docs/dst-knowledge/patterns.md#16.
function EnumListEditor({
  label,
  info,
  options,
  values,
  onAdd,
  onRemove,
}: {
  label: string
  info?: string
  options: readonly string[]
  values: string[]
  onAdd: (value: string) => void
  onRemove: (index: number) => void
}) {
  const [selected, setSelected] = useState(options[0])
  return (
    <div className="field">
      <span className="field-label">
        {label}
        {info && <InfoTip text={info} />}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <select className={inputClass} value={selected} onChange={(e) => setSelected(e.target.value)}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <button type="button" className="btn-outline" onClick={() => onAdd(selected)}>
          + Add
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
        <FormHeader icon="📍" title={initialTask ? initialTask.id : 'New Task'} />

        <div className="main-scroll">
          <Fieldset legend="Identity" step={1}>
            <FormField
              label="Id (task name)"
              error={errors.id?.message}
              info="Internal name for this area of the map. Not shown to players — used to reference this Task from other Tasks (locks/keys) and rooms."
            >
              <input className={inputClass} {...register('id')} disabled={!!initialTask} placeholder="My New Area" />
            </FormField>
          </Fieldset>

          <div className="grid-2">
            <Fieldset
              legend="Progression (lock &amp; key)"
              step={2}
              info="Controls the order players explore the map in. A Task with a Lock only gets generated reachable once some other Task has given the matching Key."
            >
              <EnumListEditor
                label="Locks (needs these keys to enter here)"
                info="This area only becomes accessible after the player has obtained ALL of the selected keys from other Tasks."
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
                label="Keys given (what this area unlocks for others)"
                info="Once the player reaches this Task, these keys become available — any other Task locked behind one of them becomes reachable."
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

            <Fieldset
              legend="Rooms"
              step={3}
              info="The pool of Rooms placed inside this Task's area. Each entry is placed a random number of times between min and max. You can reuse a Room across multiple Tasks."
            >
              {roomChoices.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="room id (yours or base game)" {...register(`roomChoices.${index}.roomId` as const)} />
                  <input type="number" className="qty-input" placeholder="min" {...register(`roomChoices.${index}.count.min` as const, { valueAsNumber: true })} />
                  <input type="number" className="qty-input" placeholder="max" {...register(`roomChoices.${index}.count.max` as const, { valueAsNumber: true })} />
                  <button type="button" className={btnDanger} onClick={() => roomChoices.remove(index)}>
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-ingredient"
                onClick={() => roomChoices.append({ roomId: '', count: { min: 1, max: 1 } })}
              >
                + Add room
              </button>
              {errors.roomChoices?.message && <p className="field error">{errors.roomChoices.message}</p>}
            </Fieldset>
          </div>

          <Fieldset legend="Terrain and map" step={4}>
            <div className="field">
              <span className="field-label">
                Appears in these world locations
                <InfoTip text="Where in the overall map this Task can be placed. Without at least one selected, the Task is registered but never actually inserted into any generated world." />
              </span>
              <div className="tag-grid">
                {TASK_LOCATIONS.map((l) => (
                  <label key={l.value} className={`tag-opt ${watched.locations?.includes(l.value) ? 'selected' : ''}`}>
                    <input type="checkbox" value={l.value} className="sr-only" {...register('locations')} />
                    {l.label}
                  </label>
                ))}
              </div>
              {errors.locations?.message && <p className="field error">{errors.locations.message}</p>}
            </div>

            <div className="row-2">
              <FormField
                label="Background terrain"
                info="The default ground tile filling any part of this Task's area not covered by one of its Rooms."
              >
                <select className={inputClass} {...register('backgroundTerrain')}>
                  {WORLD_TILES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Background room (optional)"
                info="An existing Room id used to fill the background instead of a flat terrain — lets the background itself have scattered decoration/prefabs."
              >
                <input className={inputClass} {...register('backgroundRoom')} placeholder="e.g. BGGrass" />
              </FormField>
            </div>

            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableRegion}
                  onChange={(e) => setValue('regionId', e.target.checked ? 'myisland1' : undefined)}
                />
                Part of an island separate from the mainland
                <InfoTip text="Splits this Task off the mainland into its own detached landmass, reachable only by a single crossing — how the Lunar Island works in-game." />
              </label>
            </div>
            {enableRegion && (
              <FormField
                label="Region id (use the same id across all Tasks on this island)"
                hint='Tasks sharing the same "region id" become a single detached landmass, connected to the mainland by a single crossing — this is how the Lunar Island is built in-game (patterns.md#17).'
              >
                <input className={inputClass} {...register('regionId')} />
              </FormField>
            )}
          </Fieldset>
        </div>

        <FormFooter itemName={watched.id || 'New task'} saveLabel={initialTask ? 'Save changes' : 'Add task'} onCancel={onCancel} />
      </form>

      <TaskPreview task={watched} />
    </>
  )
}
