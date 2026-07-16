import { useEffect, useRef, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { roomDefSchema, WORLD_TILES, type RoomDef } from '../../types/worldContent'
import { FormField, Fieldset, inputClass, btnPrimary, btnSecondary, btnDanger } from './FormField'

interface RoomFormProps {
  initialRoom?: RoomDef
  onSave: (room: RoomDef) => void
  onCancel?: () => void
}

const emptyRoom: RoomDef = {
  id: '',
  terrain: 'GRASS',
  tags: [],
  requiredPrefabs: [],
  fixedPrefabs: [],
}

export function RoomForm({ initialRoom, onSave, onCancel }: RoomFormProps) {
  const [enableScatter, setEnableScatter] = useState((initialRoom ?? emptyRoom).scatter !== undefined)

  // useFieldArray for scatter.prefabs must run unconditionally (rules of hooks), which
  // makes react-hook-form materialize `scatter: { prefabs: [] }` in the form's raw
  // values even when the "decoração espalhada" checkbox is off. zodResolver validates
  // those RAW values before onSubmit ever runs, so a submit-time fix is too late — the
  // optional `scatter` schema (needs percent + prefabs.min(1)) rejects the partial
  // object with no field-level error visible, and the form looks like it does nothing.
  // Stripping `scatter` here, inside the resolver, fixes it at the point that matters.
  const enableScatterRef = useRef(enableScatter)
  useEffect(() => {
    enableScatterRef.current = enableScatter
  }, [enableScatter])

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RoomDef>({
    resolver: (values, context, options) =>
      zodResolver(roomDefSchema)(enableScatterRef.current ? values : { ...values, scatter: undefined }, context, options),
    defaultValues: initialRoom ?? emptyRoom,
  })

  const tags = useFieldArray({ control, name: 'tags' as never })
  const requiredPrefabs = useFieldArray({ control, name: 'requiredPrefabs' as never })
  const fixedPrefabs = useFieldArray({ control, name: 'fixedPrefabs' })
  const scatterPrefabs = useFieldArray({ control, name: 'scatter.prefabs' as never })

  const onSubmit = (data: RoomDef) => onSave(data)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Id (nome da sala)" error={errors.id?.message}>
          <input className={inputClass} {...register('id')} disabled={!!initialRoom} placeholder="MinhaSalaFloresta" />
        </FormField>
        <FormField label="Terreno">
          <select className={inputClass} {...register('terrain')}>
            {WORLD_TILES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <Fieldset legend="Tags (opcional)">
        <div className="space-y-2">
          {tags.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <input className={inputClass} placeholder="ex: Town" {...register(`tags.${index}` as const)} />
              <button type="button" className={btnDanger} onClick={() => tags.remove(index)}>
                Remover
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={`${btnSecondary} mt-2`} onClick={() => tags.append('')}>
          + Tag
        </button>
      </Fieldset>

      <Fieldset legend="Prefabs obrigatórios (opcional)">
        <div className="space-y-2">
          {requiredPrefabs.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <input
                className={inputClass}
                placeholder="ex: pigking"
                {...register(`requiredPrefabs.${index}` as const)}
              />
              <button type="button" className={btnDanger} onClick={() => requiredPrefabs.remove(index)}>
                Remover
              </button>
            </div>
          ))}
        </div>
        <button type="button" className={`${btnSecondary} mt-2`} onClick={() => requiredPrefabs.append('')}>
          + Prefab obrigatório
        </button>
      </Fieldset>

      <Fieldset legend="Prefabs fixos (quantidade garantida)">
        <div className="space-y-2">
          {fixedPrefabs.fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-center">
              <input
                className={inputClass}
                placeholder="id do prefab (ex: pighouse)"
                {...register(`fixedPrefabs.${index}.prefab` as const)}
              />
              <input
                type="number"
                className={`${inputClass} w-20`}
                placeholder="mín"
                {...register(`fixedPrefabs.${index}.count.min` as const, { valueAsNumber: true })}
              />
              <span className="text-xs text-parchment-400">a</span>
              <input
                type="number"
                className={`${inputClass} w-20`}
                placeholder="máx"
                {...register(`fixedPrefabs.${index}.count.max` as const, { valueAsNumber: true })}
              />
              <button type="button" className={btnDanger} onClick={() => fixedPrefabs.remove(index)}>
                Remover
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`${btnSecondary} mt-2`}
          onClick={() => fixedPrefabs.append({ prefab: '', count: { min: 1, max: 1 } })}
        >
          + Prefab fixo
        </button>
      </Fieldset>

      <Fieldset legend="Decoração espalhada">
        <label className="flex items-center gap-2 text-sm text-parchment-300">
          <input
            type="checkbox"
            checked={enableScatter}
            onChange={(e) => {
              setEnableScatter(e.target.checked)
              setValue('scatter', e.target.checked ? { percent: 0.1, prefabs: [] } : undefined)
            }}
          />
          Tem decoração espalhada pela sala (ex: grama, flores)
        </label>
        {enableScatter && (
          <div className="space-y-2 pl-1">
            <FormField label="Densidade (0 a 1)">
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                className={inputClass}
                {...register('scatter.percent', { valueAsNumber: true })}
              />
            </FormField>
            <div className="space-y-2">
              {scatterPrefabs.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="id do prefab (ex: grass)"
                    {...register(`scatter.prefabs.${index}.prefab` as const)}
                  />
                  <input
                    type="number"
                    step="0.001"
                    className={`${inputClass} w-24`}
                    placeholder="peso"
                    {...register(`scatter.prefabs.${index}.weight` as const, { valueAsNumber: true })}
                  />
                  <button type="button" className={btnDanger} onClick={() => scatterPrefabs.remove(index)}>
                    Remover
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`${btnSecondary} mt-2`}
              onClick={() => scatterPrefabs.append({ prefab: '', weight: 0.05 })}
            >
              + Item de decoração
            </button>
            {errors.scatter?.prefabs?.message && (
              <p className="mt-1 text-xs text-blood-400">{errors.scatter.prefabs.message}</p>
            )}
          </div>
        )}
      </Fieldset>

      <div className="flex gap-2">
        <button type="submit" className={btnPrimary}>
          {initialRoom ? 'Salvar alterações' : 'Adicionar sala'}
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
