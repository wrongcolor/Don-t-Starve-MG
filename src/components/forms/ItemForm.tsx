import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  itemDefSchema,
  TECH_LEVELS,
  RECIPE_FILTERS,
  VANILLA_ITEM_BUILDS,
  TOOL_ACTIONS,
  ON_HIT_EFFECTS,
  SPELL_EFFECTS,
  type ItemDef,
} from '../../types/modProject'
import { FormField, Fieldset, FormHeader, FormFooter, inputClass, btnDanger } from './FormField'
import { categoryVisual } from '../panels/entityVisuals'
import { ItemPreview } from './ItemPreview'

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

// Quick presets that prefill category + the fields that matter most for that
// archetype — a shortcut, not a distinct schema concept (patterns.md has no
// "weapon subtype"; a sword and a spear are both just `category: 'weapon'`).
const ITEM_TEMPLATES: { key: string; label: string; icon: string; patch: Partial<ItemDef> }[] = [
  { key: 'axe', label: 'Machado', icon: '🪓', patch: { category: 'tool', toolAction: 'CHOP' } },
  { key: 'pickaxe', label: 'Picareta', icon: '⛏️', patch: { category: 'tool', toolAction: 'MINE' } },
  { key: 'shovel', label: 'Pá', icon: '🕳️', patch: { category: 'tool', toolAction: 'DIG' } },
  { key: 'sword', label: 'Espada', icon: '🗡️', patch: { category: 'weapon', weapon: { damage: 34 } } },
  {
    key: 'bow',
    label: 'Arco',
    icon: '🏹',
    patch: { category: 'weapon', weapon: { damage: 0, ranged: { minRange: 6, maxRange: 12, projectilePrefab: 'arrow', onHitEffect: 'none' } } },
  },
  { key: 'armor', label: 'Armadura', icon: '🛡️', patch: { category: 'armor', armor: { absorption: 0.8 } } },
  { key: 'other', label: 'Outro', icon: '✨', patch: { category: 'generic' } },
]

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
  const [templateKey, setTemplateKey] = useState<string | null>(null)
  const watched = watch()

  const applyTemplate = (key: string, patch: Partial<ItemDef>) => {
    setTemplateKey(key)
    Object.entries(patch).forEach(([field, value]) => {
      setValue(field as keyof ItemDef, value as never, { shouldDirty: true })
    })
  }
  const category = watched.category
  const enableStackable = watched.stackable !== undefined
  const enablePerishable = watched.perishable !== undefined
  const enableWeapon = watched.weapon !== undefined
  const enableFiniteuses = watched.finiteuses !== undefined
  const enableArmor = watched.armor !== undefined
  const enableRanged = watched.weapon?.ranged !== undefined
  const enableSanityCost = watched.weapon?.sanityCostOnUse !== undefined
  const enableWalkSpeedMult = watched.equipWalkSpeedMult !== undefined
  const enableSpellEffect = watched.spellEffect !== undefined
  const enableDapperness = watched.armor?.dapperness !== undefined
  const enableWeakness = watched.armor?.weakness !== undefined
  const enableSanityLossOnHit = watched.armor?.sanityLossOnHitPercent !== undefined
  const handheld = category === 'tool' || enableWeapon

  const onSubmit = (data: ItemDef) => {
    onSave(data)
  }

  return (
    <>
      <form className="main" onSubmit={handleSubmit(onSubmit)}>
        <FormHeader icon="📖" title={initialItem ? initialItem.displayName : 'Novo Item'} />

        <div className="main-scroll">
          <div className="panel">
            <div className="templates">
              <div className="tpl-search">Ou escolha um modelo:</div>
              {ITEM_TEMPLATES.map((t) => (
                <div
                  key={t.key}
                  className={`tpl-card ${templateKey === t.key ? 'active' : ''}`}
                  onClick={() => applyTemplate(t.key, t.patch)}
                >
                  <div className="tpl-ic">{t.icon}</div>
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <Fieldset legend="Identidade" step={1}>
              <div className="row-2">
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
            </Fieldset>

            <Fieldset legend="Aparência" step={2}>
              <div className="sprite-row">
                <div className="sprite-box">{categoryVisual(category)}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Ícone gerado a partir da categoria — a arte final (inventoryimages) é fornecida à parte.
                </div>
              </div>

              <div className="checks">
                <label>
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
                <label>
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
              </div>

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
            </Fieldset>
          </div>

          <div className="grid-3">
            <Fieldset legend="Durabilidade" step={3}>
              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableStackable}
                    onChange={(e) => setValue('stackable', e.target.checked ? { maxSize: 20 } : undefined)}
                  />
                  Empilhável
                </label>
              </div>
              {enableStackable && (
                <FormField label="Tamanho máx. da pilha">
                  <input type="number" className={inputClass} {...register('stackable.maxSize', { valueAsNumber: true })} />
                </FormField>
              )}

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enablePerishable}
                    disabled={enableFiniteuses}
                    onChange={(e) => setValue('perishable', e.target.checked ? { perishTimeDays: 3 } : undefined)}
                  />
                  Perecível {enableFiniteuses && '(desative "usos máximos" primeiro)'}
                </label>
              </div>
              {enablePerishable && (
                <FormField label="Tempo até estragar (dias)" hint="A durabilidade do item é esse tempo.">
                  <input type="number" step="0.1" className={inputClass} {...register('perishable.perishTimeDays', { valueAsNumber: true })} />
                </FormField>
              )}

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableFiniteuses}
                    disabled={enablePerishable}
                    onChange={(e) => setValue('finiteuses', e.target.checked ? { maxUses: 100 } : undefined)}
                  />
                  Usos máximos {enablePerishable && '(desative "perecível" primeiro)'}
                </label>
              </div>
              {enableFiniteuses && (
                <>
                  <FormField label="Usos máximos">
                    <input type="number" className={inputClass} {...register('finiteuses.maxUses', { valueAsNumber: true })} />
                  </FormField>
                  <div className="checks">
                    <label>
                      <input type="checkbox" {...register('finiteuses.ignoreCombatDurabilityLoss')} />
                      Não perde uso ao atacar
                    </label>
                  </div>
                </>
              )}
            </Fieldset>

            <Fieldset legend="Combate" step={4}>
              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableWeapon}
                    onChange={(e) => setValue('weapon', e.target.checked ? { damage: 20 } : undefined)}
                  />
                  Arma (dano ao atacar)
                </label>
              </div>
              {enableWeapon && (
                <>
                  <FormField label="Dano (0 se à distância)">
                    <input type="number" className={inputClass} {...register('weapon.damage', { valueAsNumber: true })} />
                  </FormField>

                  <div className="icon-toggle-row" style={{ marginBottom: 12 }}>
                    <div
                      className={`icon-toggle ${!enableRanged ? 'active' : ''}`}
                      onClick={() => setValue('weapon.ranged', undefined)}
                    >
                      🪓 Corpo a corpo
                    </div>
                    <div
                      className={`icon-toggle ${enableRanged ? 'active' : ''}`}
                      onClick={() =>
                        setValue('weapon.ranged', {
                          minRange: 6,
                          maxRange: 10,
                          projectilePrefab: 'fire_projectile',
                          onHitEffect: 'none',
                        })
                      }
                    >
                      🏹 À distância
                    </div>
                  </div>

                  {enableRanged && (
                    <div className="row-2">
                      <FormField label="Alcance mínimo">
                        <input type="number" className={inputClass} {...register('weapon.ranged.minRange', { valueAsNumber: true })} />
                      </FormField>
                      <FormField label="Alcance máximo" error={(errors.weapon?.ranged as { maxRange?: { message?: string } } | undefined)?.maxRange?.message}>
                        <input type="number" className={inputClass} {...register('weapon.ranged.maxRange', { valueAsNumber: true })} />
                      </FormField>
                      <FormField label="Prefab do projétil">
                        <input className={inputClass} {...register('weapon.ranged.projectilePrefab')} />
                      </FormField>
                      <FormField label="Efeito ao acertar">
                        <select className={inputClass} {...register('weapon.ranged.onHitEffect')}>
                          {ON_HIT_EFFECTS.map((e) => (
                            <option key={e} value={e}>
                              {e === 'none' ? 'Nenhum' : e === 'ignite' ? 'Incendiar' : 'Congelar'}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                  )}

                  <div className="checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={enableSanityCost}
                        onChange={(e) => setValue('weapon.sanityCostOnUse', e.target.checked ? 3 : undefined)}
                      />
                      Custa sanidade ao atacar
                    </label>
                  </div>
                  {enableSanityCost && (
                    <FormField label="Sanidade perdida por ataque">
                      <input type="number" step="0.1" className={inputClass} {...register('weapon.sanityCostOnUse', { valueAsNumber: true })} />
                    </FormField>
                  )}
                </>
              )}

              {(handheld || enableArmor) && (
                <>
                  <div className="checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={enableWalkSpeedMult}
                        onChange={(e) => setValue('equipWalkSpeedMult', e.target.checked ? 1.25 : undefined)}
                      />
                      Muda velocidade ao equipar
                    </label>
                  </div>
                  {enableWalkSpeedMult && (
                    <FormField label="Multiplicador (1 = normal)">
                      <input type="number" step="0.05" className={inputClass} {...register('equipWalkSpeedMult', { valueAsNumber: true })} />
                    </FormField>
                  )}
                </>
              )}

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableSpellEffect}
                    onChange={(e) => setValue('spellEffect', e.target.checked ? SPELL_EFFECTS[0] : undefined)}
                  />
                  Efeito mágico (usar sobre um ponto)
                </label>
              </div>
              {enableSpellEffect && (
                <FormField label="Efeito">
                  <select className={inputClass} {...register('spellEffect')}>
                    <option value="createLight">Criar luz no ponto</option>
                  </select>
                </FormField>
              )}
            </Fieldset>

            <Fieldset legend="Receita (Crafting)" step={5}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', marginBottom: 8 }}>
                Ingredientes
              </span>
              {fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="id do prefab (ex: twigs)" {...register(`recipe.ingredients.${index}.prefab` as const)} />
                  <input type="number" className="qty-input" {...register(`recipe.ingredients.${index}.amount` as const, { valueAsNumber: true })} />
                  <button type="button" className={btnDanger} onClick={() => remove(index)}>
                    Remover
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient" onClick={() => append({ prefab: '', amount: 1 })}>
                + Adicionar ingrediente
              </button>
              {errors.recipe?.ingredients?.message && <p className="field error">{errors.recipe.ingredients.message}</p>}

              <FormField label="Nível de tecnologia">
                <select className={inputClass} {...register('recipe.techLevel')}>
                  {TECH_LEVELS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormField>

              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', marginBottom: 8 }}>
                Abas de crafting
              </span>
              <div className="tag-grid">
                {RECIPE_FILTERS.map((f) => (
                  <label key={f} className={`tag-opt ${watched.recipe?.filters?.includes(f) ? 'selected' : ''}`}>
                    <input type="checkbox" value={f} className="sr-only" {...register('recipe.filters')} />
                    {f}
                  </label>
                ))}
              </div>
              {errors.recipe?.filters?.message && <p className="field error">{errors.recipe.filters.message}</p>}

              <div className="checks">
                <label>
                  <input type="checkbox" {...register('recipe.placer')} />
                  É uma estrutura (gera placer)
                </label>
              </div>
            </Fieldset>
          </div>

          <Fieldset legend="Armadura" step={6}>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableArmor}
                  onChange={(e) => setValue('armor', e.target.checked ? { absorption: 0.8 } : undefined)}
                />
                É uma armadura (absorção de dano)
              </label>
            </div>
            {enableArmor && (
              <>
                <div className="row-2">
                  <FormField label="Absorção (0 a 1)">
                    <input type="number" step="0.01" min="0.01" max="1" className={inputClass} {...register('armor.absorption', { valueAsNumber: true })} />
                  </FormField>
                </div>
                <div className="checks">
                  <label>
                    <input type="checkbox" {...register('armor.flammable')} />
                    Material inflamável
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={enableDapperness}
                      onChange={(e) => setValue('armor.dapperness', e.target.checked ? 0.5 : undefined)}
                    />
                    Afeta sanidade enquanto equipada
                  </label>
                </div>
                {enableDapperness && (
                  <FormField label="Sanidade por minuto (negativo = perde)">
                    <input type="number" step="0.1" className={inputClass} {...register('armor.dapperness', { valueAsNumber: true })} />
                  </FormField>
                )}

                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableWeakness}
                      onChange={(e) => setValue('armor.weakness', e.target.checked ? { tag: '', extraDamage: 1 } : undefined)}
                    />
                    Fraqueza contra um tipo de atacante
                  </label>
                </div>
                {enableWeakness && (
                  <div className="row-2">
                    <FormField label="Tag do atacante (ex: beaver)">
                      <input className={inputClass} {...register('armor.weakness.tag')} />
                    </FormField>
                    <FormField label="Dano extra">
                      <input type="number" className={inputClass} {...register('armor.weakness.extraDamage', { valueAsNumber: true })} />
                    </FormField>
                  </div>
                )}

                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableSanityLossOnHit}
                      onChange={(e) => setValue('armor.sanityLossOnHitPercent', e.target.checked ? 0.5 : undefined)}
                    />
                    Perde sanidade ao tomar dano
                  </label>
                </div>
                {enableSanityLossOnHit && (
                  <FormField label="Proporção do dano convertida em sanidade (0 a 1)">
                    <input type="number" step="0.01" min="0" max="1" className={inputClass} {...register('armor.sanityLossOnHitPercent', { valueAsNumber: true })} />
                  </FormField>
                )}
              </>
            )}
          </Fieldset>
        </div>

        <FormFooter itemName={watched.displayName || 'Novo item'} saveLabel={initialItem ? 'Salvar alterações' : 'Adicionar item'} onCancel={onCancel} />
      </form>

      <ItemPreview item={watched} />
    </>
  )
}
