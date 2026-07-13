import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  itemDefSchema,
  TECH_LEVELS,
  RECIPE_FILTERS,
  VANILLA_ITEM_BUILDS,
  TOOL_ACTIONS,
  type ItemDef,
} from '../../types/modProject'
import { FormField, inputClass, btnPrimary, btnSecondary, btnDanger } from './FormField'

interface ItemFormProps {
  initialItem?: ItemDef
  onSave: (item: ItemDef) => void
  onCancel?: () => void
}

const emptyItem: ItemDef = {
  id: '',
  displayName: '',
  description: '',
  category: 'generic',
  animation: { source: 'custom' },
  recipe: { ingredients: [{ prefab: 'twigs', amount: 1 }], techLevel: 'NONE', filters: ['TOOLS'], placer: false },
}

export function ItemForm({ initialItem, onSave, onCancel }: ItemFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ItemDef>({
    resolver: zodResolver(itemDefSchema),
    defaultValues: initialItem ?? emptyItem,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'recipe.ingredients' })

  const [animationSource, setAnimationSource] = useState<'custom' | 'vanilla'>(
    (initialItem ?? emptyItem).animation?.source ?? 'custom',
  )
  const category = watch('category')
  const enableStackable = watch('stackable') !== undefined
  const enablePerishable = watch('perishable') !== undefined
  const enableWeapon = watch('weapon') !== undefined
  const enableFiniteuses = watch('finiteuses') !== undefined
  const enableArmor = watch('armor') !== undefined

  const onSubmit = (data: ItemDef) => {
    onSave(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Id (identificador interno)" error={errors.id?.message}>
          <input className={inputClass} {...register('id')} disabled={!!initialItem} placeholder="meu_item" />
        </FormField>
        <FormField label="Categoria">
          <select className={inputClass} {...register('category')}>
            <option value="generic">Genérico</option>
            <option value="tool">Ferramenta</option>
            <option value="weapon">Arma</option>
            <option value="armor">Armadura</option>
            <option value="food">Comida</option>
          </select>
        </FormField>
      </div>

      {category === 'tool' && (
        <FormField label="Ação da ferramenta" error={errors.toolAction?.message}>
          <select className={inputClass} {...register('toolAction')} defaultValue="">
            <option value="" disabled>
              Selecione...
            </option>
            {TOOL_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a === 'CHOP' ? 'Cortar (árvores)' : a === 'MINE' ? 'Minerar (pedras)' : 'Cavar (buracos/troncos)'}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField label="Nome exibido" error={errors.displayName?.message}>
        <input className={inputClass} {...register('displayName')} />
      </FormField>

      <FormField label="Descrição (crafting + inspect)" error={errors.description?.message}>
        <textarea className={inputClass} rows={2} {...register('description')} />
      </FormField>

      <fieldset className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Animação</legend>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="item-animation-source"
            checked={animationSource === 'custom'}
            onChange={() => {
              setAnimationSource('custom')
              setValue('animation', { source: 'custom' })
            }}
          />
          Vou criar minha própria animação (build próprio, anim/&lt;id&gt;.zip)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="item-animation-source"
            checked={animationSource === 'vanilla'}
            onChange={() => {
              setAnimationSource('vanilla')
              setValue('animation', { source: 'vanilla', build: VANILLA_ITEM_BUILDS[0].build })
            }}
          />
          Usar uma animação já existente no jogo
        </label>

        {animationSource === 'vanilla' && (
          <FormField
            label="Animação"
            error={(errors.animation as { build?: { message?: string } } | undefined)?.build?.message}
          >
            <select className={inputClass} {...register('animation.build' as const)}>
              {VANILLA_ITEM_BUILDS.map((b) => (
                <option key={b.build} value={b.build}>
                  {b.label}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Reaproveitar uma animação do jogo dispensa o build próprio — mas o ícone de inventário
          (images/inventoryimages) ainda precisa ser fornecido em ambos os casos.
        </p>
      </fieldset>

      <fieldset className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Componentes</legend>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enableStackable}
            onChange={(e) => setValue('stackable', e.target.checked ? { maxSize: 20 } : undefined)}
          />
          Empilhável
        </label>
        {enableStackable && (
          <FormField label="Tamanho máx. da pilha">
            <input type="number" className={inputClass} {...register('stackable.maxSize', { valueAsNumber: true })} />
          </FormField>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enablePerishable}
            onChange={(e) => setValue('perishable', e.target.checked ? { perishTimeDays: 3 } : undefined)}
          />
          Perecível
        </label>
        {enablePerishable && (
          <FormField label="Tempo até estragar (dias)">
            <input type="number" step="0.1" className={inputClass} {...register('perishable.perishTimeDays', { valueAsNumber: true })} />
          </FormField>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enableWeapon}
            onChange={(e) => setValue('weapon', e.target.checked ? { damage: 20 } : undefined)}
          />
          Arma (dano ao atacar)
        </label>
        {enableWeapon && (
          <FormField label="Dano">
            <input type="number" className={inputClass} {...register('weapon.damage', { valueAsNumber: true })} />
          </FormField>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enableFiniteuses}
            onChange={(e) => setValue('finiteuses', e.target.checked ? { maxUses: 100 } : undefined)}
          />
          Durabilidade limitada (finiteuses)
        </label>
        {enableFiniteuses && (
          <FormField label="Usos máximos">
            <input type="number" className={inputClass} {...register('finiteuses.maxUses', { valueAsNumber: true })} />
          </FormField>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enableArmor}
            onChange={(e) => setValue('armor', e.target.checked ? { absorption: 0.8 } : undefined)}
          />
          Armadura (absorção de dano)
        </label>
        {enableArmor && (
          <FormField label="Absorção (0 a 1)">
            <input type="number" step="0.01" min="0.01" max="1" className={inputClass} {...register('armor.absorption', { valueAsNumber: true })} />
          </FormField>
        )}
      </fieldset>

      <fieldset className="rounded-md border border-slate-200 dark:border-slate-700 p-3 space-y-3">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">Receita</legend>

        <div>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ingredientes</span>
          <div className="mt-1 space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="id do prefab (ex: twigs)"
                  {...register(`recipe.ingredients.${index}.prefab` as const)}
                />
                <input
                  type="number"
                  className={`${inputClass} w-24`}
                  {...register(`recipe.ingredients.${index}.amount` as const, { valueAsNumber: true })}
                />
                <button type="button" className={btnDanger} onClick={() => remove(index)}>
                  Remover
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={`${btnSecondary} mt-2`}
            onClick={() => append({ prefab: '', amount: 1 })}
          >
            + Ingrediente
          </button>
          {errors.recipe?.ingredients?.message && (
            <p className="mt-1 text-xs text-red-600">{errors.recipe.ingredients.message}</p>
          )}
        </div>

        <FormField label="Nível de tecnologia">
          <select className={inputClass} {...register('recipe.techLevel')}>
            {TECH_LEVELS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FormField>

        <div>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Abas de crafting (CRAFTING_FILTERS)
          </span>
          <div className="mt-1 grid grid-cols-3 gap-1">
            {RECIPE_FILTERS.map((f) => (
              <label key={f} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" value={f} {...register('recipe.filters')} />
                {f}
              </label>
            ))}
          </div>
          {errors.recipe?.filters?.message && (
            <p className="mt-1 text-xs text-red-600">{errors.recipe.filters.message}</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('recipe.placer')} />
          É uma estrutura (gera prefab de placer)
        </label>
      </fieldset>

      <div className="flex gap-2">
        <button type="submit" className={btnPrimary}>
          {initialItem ? 'Salvar alterações' : 'Adicionar item'}
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
