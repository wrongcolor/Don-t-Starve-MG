import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { roomDefSchema, WORLD_TILES, type RoomDef } from '../../types/worldContent'
import { FormField, inputClass, btnPrimary, btnSecondary, btnDanger } from './FormField'

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
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RoomDef>({
    resolver: zodResolver(roomDefSchema),
    defaultValues: initialRoom ?? emptyRoom,
  })

  const tags = useFieldArray({ control, name: 'tags' as never })
  const requiredPrefabs = useFieldArray({ control, name: 'requiredPrefabs' as never })
  const fixedPrefabs = useFieldArray({ control, name: 'fixedPrefabs' })
  const scatterPrefabs = useFieldArray({ control, name: 'scatter.prefabs' as never })

  const [enableScatter, setEnableScatter] = useState((initialRoom ?? emptyRoom).scatter !== undefined)

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

      <fieldset className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Tags (opcional)</legend>
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
      </fieldset>

      <fieldset className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
          Prefabs obrigatórios (opcional)
        </legend>
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
      </fieldset>

      <fieldset className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
          Prefabs fixos (quantidade garantida)
        </legend>
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
              <span className="text-xs text-slate-500">a</span>
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
      </fieldset>

      <fieldset className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Decoração espalhada</legend>
        <label className="flex items-center gap-2 text-sm">
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
          </div>
        )}
      </fieldset>

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
