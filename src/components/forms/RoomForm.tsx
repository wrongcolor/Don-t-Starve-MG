import { useEffect, useRef, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { roomDefSchema, WORLD_TILES, type RoomDef } from '../../types/worldContent'
import { FormField, Fieldset, FormHeader, FormFooter, inputClass, btnDanger } from './FormField'
import { RoomPreview } from './RoomPreview'

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
    watch,
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

  const watched = watch()
  const onSubmit = (data: RoomDef) => onSave(data)

  return (
    <>
      <form className="main" onSubmit={handleSubmit(onSubmit)}>
        <FormHeader icon="🌳" title={initialRoom ? initialRoom.id : 'Nova Sala'} />

        <div className="main-scroll">
          <div className="grid-2">
            <Fieldset legend="Identidade" step={1}>
              <div className="row-2">
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
            </Fieldset>

            <Fieldset legend="Tags (opcional)" step={2}>
              {tags.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="ex: Town" {...register(`tags.${index}` as const)} />
                  <button type="button" className={btnDanger} onClick={() => tags.remove(index)}>
                    Remover
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient" onClick={() => tags.append('')}>
                + Adicionar tag
              </button>
            </Fieldset>
          </div>

          <div className="grid-2">
            <Fieldset legend="Prefabs obrigatórios (opcional)" step={3}>
              {requiredPrefabs.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="ex: pigking" {...register(`requiredPrefabs.${index}` as const)} />
                  <button type="button" className={btnDanger} onClick={() => requiredPrefabs.remove(index)}>
                    Remover
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient" onClick={() => requiredPrefabs.append('')}>
                + Adicionar prefab obrigatório
              </button>
            </Fieldset>

            <Fieldset legend="Prefabs fixos (quantidade garantida)" step={4}>
              {fixedPrefabs.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="id do prefab (ex: pighouse)" {...register(`fixedPrefabs.${index}.prefab` as const)} />
                  <input type="number" className="qty-input" placeholder="mín" {...register(`fixedPrefabs.${index}.count.min` as const, { valueAsNumber: true })} />
                  <input type="number" className="qty-input" placeholder="máx" {...register(`fixedPrefabs.${index}.count.max` as const, { valueAsNumber: true })} />
                  <button type="button" className={btnDanger} onClick={() => fixedPrefabs.remove(index)}>
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-ingredient"
                onClick={() => fixedPrefabs.append({ prefab: '', count: { min: 1, max: 1 } })}
              >
                + Adicionar prefab fixo
              </button>
            </Fieldset>
          </div>

          <Fieldset legend="Decoração espalhada" step={5}>
            <div className="checks">
              <label>
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
            </div>
            {enableScatter && (
              <>
                <FormField label="Densidade (0 a 1)">
                  <input type="number" step="0.01" min="0" max="1" className={inputClass} {...register('scatter.percent', { valueAsNumber: true })} />
                </FormField>
                {scatterPrefabs.fields.map((field, index) => (
                  <div key={field.id} className="ingredient-row">
                    <input className={inputClass} placeholder="id do prefab (ex: grass)" {...register(`scatter.prefabs.${index}.prefab` as const)} />
                    <input type="number" step="0.001" className="qty-input" placeholder="peso" {...register(`scatter.prefabs.${index}.weight` as const, { valueAsNumber: true })} />
                    <button type="button" className={btnDanger} onClick={() => scatterPrefabs.remove(index)}>
                      Remover
                    </button>
                  </div>
                ))}
                <button type="button" className="add-ingredient" onClick={() => scatterPrefabs.append({ prefab: '', weight: 0.05 })}>
                  + Item de decoração
                </button>
                {errors.scatter?.prefabs?.message && <p className="field error">{errors.scatter.prefabs.message}</p>}
              </>
            )}
          </Fieldset>
        </div>

        <FormFooter itemName={watched.id || 'Nova sala'} saveLabel={initialRoom ? 'Salvar alterações' : 'Adicionar sala'} onCancel={onCancel} />
      </form>

      <RoomPreview room={watched} />
    </>
  )
}
