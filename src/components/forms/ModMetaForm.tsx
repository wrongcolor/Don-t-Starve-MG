import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { modMetaSchema, type ModMeta } from '../../types/modProject'
import { useModProjectStore } from '../../store/modProjectStore'
import { FormField, Fieldset, FormHeader, inputClass, btnPrimary, btnDanger } from './FormField'

export function ModMetaForm() {
  const meta = useModProjectStore((s) => s.project.meta)
  const setMeta = useModProjectStore((s) => s.setMeta)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ModMeta>({
    resolver: zodResolver(modMetaSchema),
    defaultValues: meta,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'configOptions' })

  const onSubmit = (data: ModMeta) => setMeta(data)

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormHeader icon="📋" title="Mod Metadata" />

      <div style={{ marginTop: 12 }} className="grid-2">
        <Fieldset legend="Identity" step={1}>
          <FormField label="Mod name" error={errors.name?.message}>
            <input className={inputClass} {...register('name')} placeholder="My Amazing Mod" />
          </FormField>

          <FormField label="Description" error={errors.description?.message}>
            <textarea className={inputClass} rows={2} {...register('description')} />
          </FormField>

          <div className="row-2">
            <FormField label="Author" error={errors.author?.message}>
              <input className={inputClass} {...register('author')} />
            </FormField>
            <FormField label="Version" error={errors.version?.message}>
              <input className={inputClass} {...register('version')} placeholder="1.0.0" />
            </FormField>
          </div>

          <div className="checks">
            <label>
              <input type="checkbox" {...register('allClientsRequireMod')} />
              All clients must have the mod installed
            </label>
          </div>
        </Fieldset>

        <Fieldset legend="Config options (optional)" step={2}>
          {fields.map((field, index) => (
            <div key={field.id} className="ingredient-row">
              <input className={inputClass} placeholder="internal_name" {...register(`configOptions.${index}.name` as const)} />
              <input className={inputClass} placeholder="Display label" {...register(`configOptions.${index}.label` as const)} />
              <button type="button" className={btnDanger} onClick={() => remove(index)}>
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-ingredient"
            onClick={() =>
              append({
                name: `option_${fields.length + 1}`,
                label: '',
                options: [
                  { description: 'On', data: true },
                  { description: 'Off', data: false },
                ],
                defaultIndex: 0,
              })
            }
          >
            + Add option
          </button>
        </Fieldset>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <button type="submit" className={btnPrimary}>
          Save metadata
        </button>
        {!isDirty && <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>No pending changes</span>}
      </div>
    </form>
  )
}
