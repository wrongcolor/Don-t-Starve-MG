import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  worldEventDefSchema,
  WORLD_EVENT_PHASES,
  WORLD_EVENT_MOON_PHASES,
  createEmptyWorldEvent,
  type WorldEventDef,
  type WorldEventTrigger,
} from '../../types/worldEvent'
import { FormField, Fieldset, FormHeader, FormFooter, inputClass, btnDanger } from './FormField'
import { WorldEventPreview } from './WorldEventPreview'
import { PrefabPickerButton } from './PrefabPicker'

interface WorldEventFormProps {
  initialWorldEvent?: WorldEventDef
  onSave: (event: WorldEventDef) => void
  onCancel?: () => void
}

const TRIGGER_KIND_LABELS: Record<WorldEventTrigger['kind'], string> = {
  phaseChange: 'Phase change (dawn/dusk/night)',
  moonPhase: 'Moon phase',
  playerDeath: 'Player dies',
  killCreature: 'Player kills a specific creature',
  eatItem: 'Player eats (optionally a specific food)',
  craftItem: 'Player crafts a specific item',
  harvestItem: 'Player harvests a specific pickable',
}

const PHASE_LABELS: Record<(typeof WORLD_EVENT_PHASES)[number], string> = {
  day: 'Day (dawn)',
  dusk: 'Dusk',
  night: 'Night (dead of night)',
}

const MOON_PHASE_LABELS: Record<(typeof WORLD_EVENT_MOON_PHASES)[number], string> = {
  full: 'Full moon',
  new: 'New moon',
}

function defaultTriggerFor(kind: WorldEventTrigger['kind']): WorldEventTrigger {
  switch (kind) {
    case 'phaseChange':
      return { kind, phase: 'dusk' }
    case 'moonPhase':
      return { kind, moonPhase: 'full' }
    case 'playerDeath':
      return { kind }
    case 'killCreature':
    case 'craftItem':
    case 'harvestItem':
      return { kind, prefabId: '' }
    case 'eatItem':
      return { kind, prefabId: undefined }
  }
}

export function WorldEventForm({ initialWorldEvent, onSave, onCancel }: WorldEventFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WorldEventDef>({
    resolver: zodResolver(worldEventDefSchema),
    defaultValues: initialWorldEvent ?? createEmptyWorldEvent(),
  })

  const spawnGroup = useFieldArray({ control, name: 'spawnGroup' })
  const loot = useFieldArray({ control, name: 'loot' })

  const watched = watch()
  const trigger = watched.trigger

  const onSubmit = (data: WorldEventDef) => onSave(data)

  return (
    <>
      <form className="main" onSubmit={handleSubmit(onSubmit)}>
        <FormHeader icon="🔔" title={initialWorldEvent ? initialWorldEvent.displayName : 'New World Event'} />

        <div className="main-scroll">
          <div className="grid-2">
            <Fieldset legend="Identity" step={1}>
              <div className="row-2">
                <FormField label="Id (internal identifier)" error={errors.id?.message}>
                  <input className={inputClass} {...register('id')} disabled={!!initialWorldEvent} placeholder="my_event" />
                </FormField>
                <FormField label="Chance to fire (0.01-1)" error={errors.chance?.message}>
                  <input type="number" step="0.01" min="0.01" max="1" className={inputClass} {...register('chance', { valueAsNumber: true })} />
                </FormField>
              </div>

              <FormField label="Display name" error={errors.displayName?.message}>
                <input className={inputClass} {...register('displayName')} />
              </FormField>

              <FormField label="Description" error={errors.description?.message}>
                <textarea className={inputClass} rows={2} {...register('description')} />
              </FormField>
            </Fieldset>

            <Fieldset legend="Trigger" step={2} info="Every trigger below is a confirmed real DST event — see docs/dst-knowledge for the source.">
              <FormField label="When">
                <select
                  className={inputClass}
                  value={trigger.kind}
                  onChange={(e) => setValue('trigger', defaultTriggerFor(e.target.value as WorldEventTrigger['kind']), { shouldValidate: true })}
                >
                  {Object.entries(TRIGGER_KIND_LABELS).map(([kind, label]) => (
                    <option key={kind} value={kind}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>

              {trigger.kind === 'phaseChange' && (
                <FormField label="Phase">
                  <select className={inputClass} {...register('trigger.phase' as const)}>
                    {WORLD_EVENT_PHASES.map((phase) => (
                      <option key={phase} value={phase}>
                        {PHASE_LABELS[phase]}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              {trigger.kind === 'moonPhase' && (
                <FormField label="Moon phase">
                  <select className={inputClass} {...register('trigger.moonPhase' as const)}>
                    {WORLD_EVENT_MOON_PHASES.map((phase) => (
                      <option key={phase} value={phase}>
                        {MOON_PHASE_LABELS[phase]}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              {(trigger.kind === 'killCreature' || trigger.kind === 'craftItem' || trigger.kind === 'harvestItem') && (
                <FormField
                  label="Prefab to watch for"
                  error={
                    (errors.trigger as { prefabId?: { message?: string } } | undefined)?.prefabId?.message
                  }
                >
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className={inputClass} {...register('trigger.prefabId' as const)} placeholder="e.g. spider" />
                    <PrefabPickerButton onSelect={(id) => setValue('trigger.prefabId' as const, id, { shouldDirty: true, shouldValidate: true })} />
                  </div>
                </FormField>
              )}

              {trigger.kind === 'eatItem' && (
                <FormField label="Prefab to watch for (leave empty for any food)">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className={inputClass} {...register('trigger.prefabId' as const)} placeholder="e.g. berries (optional)" />
                    <PrefabPickerButton onSelect={(id) => setValue('trigger.prefabId' as const, id, { shouldDirty: true })} />
                  </div>
                </FormField>
              )}
            </Fieldset>
          </div>

          <Fieldset legend="Spawn group" step={3} info="Together with the trigger's chance, spawns near the triggering player (or a random online player for phase/moon-phase triggers) — same shape as the real pirate raid's captain + crew.">
            <FormField label="Spawn radius" error={errors.spawnRadius?.message}>
              <input type="number" min="1" max="60" className={inputClass} {...register('spawnRadius', { valueAsNumber: true })} />
            </FormField>

            {spawnGroup.fields.map((field, index) => (
              <div key={field.id} className="ingredient-row">
                <input
                  className={inputClass}
                  placeholder="prefab id (e.g. one of this mod's creatures)"
                  {...register(`spawnGroup.${index}.prefabId` as const)}
                />
                <PrefabPickerButton onSelect={(id) => setValue(`spawnGroup.${index}.prefabId` as const, id, { shouldDirty: true })} />
                <input type="number" min="1" className="qty-input" placeholder="min" {...register(`spawnGroup.${index}.count.min` as const, { valueAsNumber: true })} />
                <input type="number" min="1" className="qty-input" placeholder="max" {...register(`spawnGroup.${index}.count.max` as const, { valueAsNumber: true })} />
                <button type="button" className={btnDanger} onClick={() => spawnGroup.remove(index)}>
                  Remove
                </button>
              </div>
            ))}
            {errors.spawnGroup?.message && <p className="error">{errors.spawnGroup.message}</p>}
            <button type="button" className="add-ingredient" onClick={() => spawnGroup.append({ prefabId: '', count: { min: 1, max: 1 } })}>
              + Add prefab to group
            </button>

            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', margin: '12px 0 8px' }}>
              Loot (optional)
            </span>
            {loot.fields.map((field, index) => (
              <div key={field.id} className="ingredient-row">
                <input className={inputClass} placeholder="prefab id (e.g. monstermeat)" {...register(`loot.${index}.prefab` as const)} />
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
        </div>

        <FormFooter itemName={watched.displayName || 'New World Event'} saveLabel={initialWorldEvent ? 'Save changes' : 'Add event'} onCancel={onCancel} />
      </form>

      <WorldEventPreview event={watched} />
    </>
  )
}
