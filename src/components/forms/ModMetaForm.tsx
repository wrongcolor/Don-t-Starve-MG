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
      <FormHeader icon="📋" title="Metadados do mod" />

      <div style={{ marginTop: 12 }} className="grid-2">
        <Fieldset legend="Identidade" step={1}>
          <FormField label="Nome do mod" error={errors.name?.message}>
            <input className={inputClass} {...register('name')} placeholder="Meu Mod Incrível" />
          </FormField>

          <FormField label="Descrição" error={errors.description?.message}>
            <textarea className={inputClass} rows={2} {...register('description')} />
          </FormField>

          <div className="row-2">
            <FormField label="Autor" error={errors.author?.message}>
              <input className={inputClass} {...register('author')} />
            </FormField>
            <FormField label="Versão" error={errors.version?.message}>
              <input className={inputClass} {...register('version')} placeholder="1.0.0" />
            </FormField>
          </div>

          <div className="checks">
            <label>
              <input type="checkbox" {...register('allClientsRequireMod')} />
              Todos os clientes precisam ter o mod instalado
            </label>
          </div>
        </Fieldset>

        <Fieldset legend="Opções de configuração (opcional)" step={2}>
          {fields.map((field, index) => (
            <div key={field.id} className="ingredient-row">
              <input className={inputClass} placeholder="nome_interno" {...register(`configOptions.${index}.name` as const)} />
              <input className={inputClass} placeholder="Rótulo exibido" {...register(`configOptions.${index}.label` as const)} />
              <button type="button" className={btnDanger} onClick={() => remove(index)}>
                Remover
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
                  { description: 'Ligado', data: true },
                  { description: 'Desligado', data: false },
                ],
                defaultIndex: 0,
              })
            }
          >
            + Adicionar opção
          </button>
        </Fieldset>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <button type="submit" className={btnPrimary}>
          Salvar metadados
        </button>
        {!isDirty && <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Sem alterações pendentes</span>}
      </div>
    </form>
  )
}
