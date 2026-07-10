import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { modMetaSchema, type ModMeta } from '../../types/modProject'
import { useModProjectStore } from '../../store/modProjectStore'
import { FormField, inputClass, btnPrimary, btnSecondary, btnDanger } from './FormField'

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Metadados do mod</h2>

      <FormField label="Nome do mod" error={errors.name?.message}>
        <input className={inputClass} {...register('name')} placeholder="Meu Mod Incrível" />
      </FormField>

      <FormField label="Descrição" error={errors.description?.message}>
        <textarea className={inputClass} rows={2} {...register('description')} />
      </FormField>

      <FormField label="Autor" error={errors.author?.message}>
        <input className={inputClass} {...register('author')} />
      </FormField>

      <FormField label="Versão" error={errors.version?.message}>
        <input className={inputClass} {...register('version')} placeholder="1.0.0" />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input type="checkbox" {...register('allClientsRequireMod')} />
        Todos os clientes precisam ter o mod instalado (recomendado se afeta gameplay)
      </label>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Opções de configuração (opcional)
          </h3>
          <button
            type="button"
            className={btnSecondary}
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
            + Opção
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-md border border-slate-200 dark:border-slate-700 p-2 flex gap-2">
              <input
                className={inputClass}
                placeholder="nome_interno"
                {...register(`configOptions.${index}.name` as const)}
              />
              <input
                className={inputClass}
                placeholder="Rótulo exibido"
                {...register(`configOptions.${index}.label` as const)}
              />
              <button type="button" className={btnDanger} onClick={() => remove(index)}>
                Remover
              </button>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" className={btnPrimary}>
        Salvar metadados
      </button>
      {!isDirty && <span className="ml-2 text-xs text-slate-400">Sem alterações pendentes</span>}
    </form>
  )
}
