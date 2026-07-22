import { useEffect, useRef, useState } from 'react'
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
  FOOD_TYPES,
  type ItemDef,
} from '../../types/modProject'
import { FormField, Fieldset, FormHeader, FormFooter, InfoTip, inputClass, btnDanger } from './FormField'
import { categoryVisual } from '../panels/entityVisuals'
import { ItemPreview } from './ItemPreview'
import { PrefabPickerButton } from './PrefabPicker'

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
  { key: 'axe', label: 'Axe', icon: '🪓', patch: { category: 'tool', toolAction: 'CHOP' } },
  { key: 'pickaxe', label: 'Pickaxe', icon: '⛏️', patch: { category: 'tool', toolAction: 'MINE' } },
  { key: 'shovel', label: 'Shovel', icon: '🕳️', patch: { category: 'tool', toolAction: 'DIG' } },
  { key: 'sword', label: 'Sword', icon: '🗡️', patch: { category: 'weapon', weapon: { damage: 34 } } },
  {
    key: 'bow',
    label: 'Bow',
    icon: '🏹',
    patch: { category: 'weapon', weapon: { damage: 0, ranged: { minRange: 6, maxRange: 12, projectilePrefab: 'arrow', onHitEffect: 'none' } } },
  },
  { key: 'armor', label: 'Armor', icon: '🛡️', patch: { category: 'armor', armor: { condition: 100, absorption: 0.8 } } },
  { key: 'other', label: 'Other', icon: '✨', patch: { category: 'generic' } },
]

export function ItemForm({ initialItem, onSave, onCancel }: ItemFormProps) {
  // useFieldArray for spellbook.spells must run unconditionally (rules of hooks), which
  // makes react-hook-form materialize `spellbook: { spells: [] }` in the form's raw
  // values even when the "Spellbook" checkbox is off — including in `watch()`, so this
  // can't be tracked with a value derived from `watched` (that's equally corrupted).
  // A plain state toggle, driven only by the checkbox itself, is the actual signal;
  // zodResolver validates RAW values before onSubmit ever runs, so a submit-time fix is
  // too late — stripping `spellbook` here, inside the resolver, fixes it at the point
  // that matters (same pattern as RoomForm's `scatter`).
  const [enableSpellbook, setEnableSpellbook] = useState((initialItem ?? emptyItem).spellbook !== undefined)
  const enableSpellbookRef = useRef(enableSpellbook)
  useEffect(() => {
    enableSpellbookRef.current = enableSpellbook
  }, [enableSpellbook])

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ItemDef>({
    resolver: (values, context, options) =>
      zodResolver(itemDefSchema)(enableSpellbookRef.current ? values : { ...values, spellbook: undefined }, context, options),
    defaultValues: initialItem ?? emptyItem,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'recipe.ingredients' })
  const spellbookSpells = useFieldArray({ control, name: 'spellbook.spells' as never })

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
  const enableMeleeRange = watched.weapon?.meleeRange !== undefined
  const enableSanityCost = watched.weapon?.sanityCostOnUse !== undefined
  const enableWalkSpeedMult = watched.equipWalkSpeedMult !== undefined
  const enableSpellEffect = watched.spellEffect !== undefined
  const enableRechargeable = watched.rechargeable !== undefined
  const canRecharge = enableWeapon || enableSpellEffect
  const enableDapperness = watched.armor?.dapperness !== undefined
  const enableWeakness = watched.armor?.weakness !== undefined
  const enableSanityLossOnHit = watched.armor?.sanityLossOnHitPercent !== undefined
  const enableOnEatBuff = watched.onEatBuff !== undefined
  const hasDurabilityModel = enableFiniteuses || enableArmor || enablePerishable
  const enableCombinable = watched.combinable === true
  const enableContainer = watched.container !== undefined
  const containerWidgetSource = watched.container?.widget?.source ?? 'vanilla'
  const enableAcceptsTag = watched.container?.acceptsTag !== undefined
  const enablePreservation = watched.container?.preservation !== undefined
  const isPlacer = watched.recipe?.placer === true
  const enableTeleportPair = watched.teleportPair === true
  const handheld = category === 'tool' || enableWeapon

  const onCategoryChange = (nextCategory: ItemDef['category']) => {
    if (nextCategory === 'food' && !watched.edible) {
      setValue('edible', { foodType: 'GENERIC', healthValue: 1, hungerValue: 12.5, sanityValue: 0 })
    } else if (nextCategory !== 'food' && watched.edible) {
      setValue('edible', undefined)
      setValue('onEatBuff', undefined)
    }
  }

  const onSubmit = (data: ItemDef) => {
    onSave(data)
  }

  return (
    <>
      <form className="main" onSubmit={handleSubmit(onSubmit)}>
        <FormHeader icon="📖" title={initialItem ? initialItem.displayName : 'New Item'} />

        <div className="main-scroll">
          <div className="panel">
            <div className="templates">
              <div className="tpl-search">Or pick a template:</div>
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
            <Fieldset legend="Identity" step={1}>
              <div className="row-2">
                <FormField label="Id (internal identifier)" error={errors.id?.message}>
                  <input className={inputClass} {...register('id')} disabled={!!initialItem} placeholder="my_item" />
                </FormField>
                <FormField label="Category">
                  <select
                    className={inputClass}
                    {...register('category', { onChange: (e) => onCategoryChange(e.target.value) })}
                  >
                    <option value="generic">Generic</option>
                    <option value="tool">Tool</option>
                    <option value="weapon">Weapon</option>
                    <option value="armor">Armor</option>
                    <option value="food">Food</option>
                  </select>
                </FormField>
              </div>

              {category === 'tool' && (
                <FormField label="Tool action" error={errors.toolAction?.message}>
                  <select className={inputClass} {...register('toolAction')} defaultValue="">
                    <option value="" disabled>
                      Select...
                    </option>
                    {TOOL_ACTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a === 'CHOP' ? 'Chop (trees)' : a === 'MINE' ? 'Mine (rocks)' : 'Dig (holes/stumps)'}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              <FormField label="Display name" error={errors.displayName?.message}>
                <input className={inputClass} {...register('displayName')} />
              </FormField>

              <FormField label="Description (crafting + inspect)" error={errors.description?.message}>
                <textarea className={inputClass} rows={2} {...register('description')} />
              </FormField>
            </Fieldset>

            <Fieldset legend="Appearance" step={2}>
              <div className="sprite-row">
                <div className="sprite-box">{categoryVisual(category)}</div>
                <div style={{ fontSize: 15, color: 'var(--ink-soft)' }}>
                  Icon generated from the category — the final art (inventoryimages) is supplied separately.
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
                  I'll create my own animation (own build, anim/&lt;id&gt;.zip)
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
                  Reuse an existing in-game animation
                </label>
              </div>

              {animationSource === 'vanilla' && (
                <FormField
                  label="Animation"
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
            <Fieldset legend="Durability" step={3}>
              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableStackable}
                    onChange={(e) => setValue('stackable', e.target.checked ? { maxSize: 20 } : undefined)}
                  />
                  Stackable
                </label>
              </div>
              {enableStackable && (
                <FormField label="Max stack size">
                  <input type="number" className={inputClass} {...register('stackable.maxSize', { valueAsNumber: true })} />
                </FormField>
              )}

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enablePerishable}
                    disabled={enableFiniteuses}
                    onChange={(e) => {
                      setValue('perishable', e.target.checked ? { perishTimeDays: 3 } : undefined)
                      if (!e.target.checked && !enableArmor) setValue('combinable', undefined)
                      if (e.target.checked) setValue('rechargeable', undefined)
                    }}
                  />
                  Perishable {enableFiniteuses && '(turn off "max uses" first)'}
                </label>
              </div>
              {enablePerishable && (
                <FormField label="Time to spoil (days)" hint="The item's durability is this amount of time.">
                  <input type="number" step="0.1" className={inputClass} {...register('perishable.perishTimeDays', { valueAsNumber: true })} />
                </FormField>
              )}

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableFiniteuses}
                    disabled={enablePerishable}
                    onChange={(e) => {
                      setValue('finiteuses', e.target.checked ? { maxUses: 100 } : undefined)
                      if (!e.target.checked && !enableArmor) setValue('combinable', undefined)
                      if (e.target.checked) setValue('rechargeable', undefined)
                    }}
                  />
                  Max uses {enablePerishable && '(turn off "perishable" first)'}
                </label>
              </div>
              {enableFiniteuses && (
                <>
                  <FormField label="Max uses">
                    <input type="number" className={inputClass} {...register('finiteuses.maxUses', { valueAsNumber: true })} />
                  </FormField>
                  <div className="checks">
                    <label>
                      <input type="checkbox" {...register('finiteuses.ignoreCombatDurabilityLoss')} />
                      Doesn't lose a use when attacking
                    </label>
                  </div>
                </>
              )}

              {hasDurabilityModel && (
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableCombinable}
                      onChange={(e) => setValue('combinable', e.target.checked)}
                    />
                    Combinable (use two together to merge remaining durability)
                  </label>
                </div>
              )}
            </Fieldset>

            <Fieldset legend="Combat" step={4}>
              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableWeapon}
                    onChange={(e) => {
                      setValue('weapon', e.target.checked ? { damage: 20 } : undefined)
                      if (!e.target.checked && !enableSpellEffect) setValue('rechargeable', undefined)
                    }}
                  />
                  Weapon (damage on attack)
                </label>
              </div>
              {enableWeapon && (
                <>
                  <FormField label="Damage (0 if ranged)">
                    <input type="number" className={inputClass} {...register('weapon.damage', { valueAsNumber: true })} />
                  </FormField>

                  <div className="icon-toggle-row" style={{ marginBottom: 12 }}>
                    <div
                      className={`icon-toggle ${!enableRanged ? 'active' : ''}`}
                      onClick={() => setValue('weapon.ranged', undefined)}
                    >
                      🪓 Melee
                    </div>
                    <div
                      className={`icon-toggle ${enableRanged ? 'active' : ''}`}
                      onClick={() => {
                        setValue('weapon.meleeRange', undefined)
                        setValue('weapon.ranged', {
                          minRange: 6,
                          maxRange: 10,
                          projectilePrefab: 'fire_projectile',
                          onHitEffect: 'none',
                        })
                      }}
                    >
                      🏹 Ranged
                    </div>
                  </div>

                  {enableRanged ? (
                    <div className="row-2">
                      <FormField label="Min range">
                        <input type="number" className={inputClass} {...register('weapon.ranged.minRange', { valueAsNumber: true })} />
                      </FormField>
                      <FormField label="Max range" error={(errors.weapon?.ranged as { maxRange?: { message?: string } } | undefined)?.maxRange?.message}>
                        <input type="number" className={inputClass} {...register('weapon.ranged.maxRange', { valueAsNumber: true })} />
                      </FormField>
                      <FormField label="Projectile prefab">
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input className={inputClass} {...register('weapon.ranged.projectilePrefab')} />
                          <PrefabPickerButton onSelect={(id) => setValue('weapon.ranged.projectilePrefab', id, { shouldDirty: true })} />
                        </div>
                      </FormField>
                      <FormField label="Effect on hit">
                        <select className={inputClass} {...register('weapon.ranged.onHitEffect')}>
                          {ON_HIT_EFFECTS.map((e) => (
                            <option key={e} value={e}>
                              {e === 'none' ? 'None' : e === 'ignite' ? 'Ignite' : 'Freeze'}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                  ) : (
                    <>
                      <div className="checks">
                        <label>
                          <input
                            type="checkbox"
                            checked={enableMeleeRange}
                            onChange={(e) => setValue('weapon.meleeRange', e.target.checked ? 3 : undefined)}
                          />
                          Custom melee range (default: ~2)
                        </label>
                      </div>
                      {enableMeleeRange && (
                        <FormField label="Range">
                          <input type="number" step="0.1" className={inputClass} {...register('weapon.meleeRange', { valueAsNumber: true })} />
                        </FormField>
                      )}
                    </>
                  )}

                  <div className="checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={enableSanityCost}
                        onChange={(e) => setValue('weapon.sanityCostOnUse', e.target.checked ? 3 : undefined)}
                      />
                      Costs sanity on attack
                    </label>
                  </div>
                  {enableSanityCost && (
                    <FormField label="Sanity lost per attack">
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
                      Changes walk speed while equipped
                    </label>
                  </div>
                  {enableWalkSpeedMult && (
                    <FormField label="Multiplier (1 = normal)">
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
                    disabled={enableSpellbook}
                    onChange={(e) => {
                      setValue('spellEffect', e.target.checked ? SPELL_EFFECTS[0] : undefined)
                      if (!e.target.checked && !enableWeapon) setValue('rechargeable', undefined)
                    }}
                  />
                  Magic effect (use on a map point)
                  {enableSpellbook && ' (turn off spellbook first)'}
                </label>
              </div>
              {enableSpellEffect && (
                <FormField label="Effect">
                  <select className={inputClass} {...register('spellEffect')}>
                    <option value="createLight">Create light at the point</option>
                  </select>
                </FormField>
              )}

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableSpellbook}
                    disabled={enableSpellEffect}
                    onChange={(e) => {
                      setEnableSpellbook(e.target.checked)
                      setValue(
                        'spellbook',
                        e.target.checked
                          ? { spells: [{ label: '', summonPrefab: '' }, { label: '', summonPrefab: '' }] }
                          : undefined,
                      )
                    }}
                  />
                  Spellbook (menu of spells to pick from)
                  {enableSpellEffect && ' (turn off magic effect first)'}
                  <InfoTip text="Opens a wheel of spells when used. Each spell just spawns a prefab at the caster — no map targeting (that would need aoetargeting, not modeled here)." />
                </label>
              </div>
              {enableSpellbook && (
                <>
                  {spellbookSpells.fields.map((field, index) => (
                    <div key={field.id} className="ingredient-row">
                      <input
                        className={inputClass}
                        placeholder="Spell label (e.g. Summon Light)"
                        {...register(`spellbook.spells.${index}.label` as const)}
                      />
                      <input
                        className={inputClass}
                        placeholder="prefab to spawn (e.g. stafflight)"
                        {...register(`spellbook.spells.${index}.summonPrefab` as const)}
                      />
                      <PrefabPickerButton
                        onSelect={(id) => setValue(`spellbook.spells.${index}.summonPrefab` as const, id, { shouldDirty: true })}
                      />
                      <button type="button" className={btnDanger} onClick={() => spellbookSpells.remove(index)}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-ingredient"
                    onClick={() => spellbookSpells.append({ label: '', summonPrefab: '' })}
                  >
                    + Add spell
                  </button>
                  {errors.spellbook?.spells?.message && <p className="field error">{errors.spellbook.spells.message}</p>}
                </>
              )}

              {canRecharge && (
                <>
                  <div className="checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={enableRechargeable}
                        disabled={enableFiniteuses || enablePerishable}
                        onChange={(e) => setValue('rechargeable', e.target.checked ? { cooldownSeconds: 30 } : undefined)}
                      />
                      Rechargeable (cooldown instead of durability)
                      {(enableFiniteuses || enablePerishable) && ' (turn off max uses/perishable first)'}
                    </label>
                  </div>
                  {enableRechargeable && (
                    <FormField label="Cooldown after use (seconds)">
                      <input
                        type="number"
                        min="1"
                        className={inputClass}
                        {...register('rechargeable.cooldownSeconds', { valueAsNumber: true })}
                      />
                    </FormField>
                  )}
                </>
              )}
            </Fieldset>

            <Fieldset legend="Recipe (Crafting)" step={5}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', marginBottom: 8 }}>
                Ingredients
              </span>
              {fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="prefab id (e.g. twigs)" {...register(`recipe.ingredients.${index}.prefab` as const)} />
                  <PrefabPickerButton onSelect={(id) => setValue(`recipe.ingredients.${index}.prefab` as const, id, { shouldDirty: true })} />
                  <input type="number" className="qty-input" {...register(`recipe.ingredients.${index}.amount` as const, { valueAsNumber: true })} />
                  <button type="button" className={btnDanger} onClick={() => remove(index)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient" onClick={() => append({ prefab: '', amount: 1 })}>
                + Add ingredient
              </button>
              {errors.recipe?.ingredients?.message && <p className="field error">{errors.recipe.ingredients.message}</p>}

              <FormField label="Tech level">
                <select className={inputClass} {...register('recipe.techLevel')}>
                  {TECH_LEVELS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormField>

              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', marginBottom: 8 }}>
                Crafting tabs
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
                  <input
                    type="checkbox"
                    {...register('recipe.placer', {
                      onChange: (e) => {
                        if (!e.target.checked) setValue('teleportPair', undefined)
                      },
                    })}
                  />
                  It's a structure (generates a placer)
                </label>
              </div>
              {isPlacer && (
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableTeleportPair}
                      onChange={(e) => setValue('teleportPair', e.target.checked || undefined)}
                    />
                    Teleporter pair (every 2 built link to each other)
                  </label>
                </div>
              )}
            </Fieldset>
          </div>

          <Fieldset legend="Armor" step={6}>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableArmor}
                  onChange={(e) => {
                    setValue('armor', e.target.checked ? { condition: 100, absorption: 0.8 } : undefined)
                    if (!e.target.checked && !enableFiniteuses && !enablePerishable) setValue('combinable', undefined)
                  }}
                />
                It's armor (damage absorption)
              </label>
            </div>
            {enableArmor && (
              <>
                <div className="row-2">
                  <FormField
                    label="Condition (total damage it can absorb)"
                    info="Its own durability budget — separate from 'max uses'. Vanilla armor is in the hundreds (e.g. wood armor: 450)."
                  >
                    <input type="number" min="1" className={inputClass} {...register('armor.condition', { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Absorption (0 to 1)">
                    <input type="number" step="0.01" min="0.01" max="1" className={inputClass} {...register('armor.absorption', { valueAsNumber: true })} />
                  </FormField>
                </div>
                <div className="checks">
                  <label>
                    <input type="checkbox" {...register('armor.flammable')} />
                    Flammable material
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={enableDapperness}
                      onChange={(e) => setValue('armor.dapperness', e.target.checked ? 0.5 : undefined)}
                    />
                    Affects sanity while equipped
                  </label>
                </div>
                {enableDapperness && (
                  <FormField label="Sanity per minute (negative = drains)">
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
                    Weak against one attacker type
                  </label>
                </div>
                {enableWeakness && (
                  <div className="row-2">
                    <FormField label="Attacker tag (e.g. beaver)">
                      <input className={inputClass} {...register('armor.weakness.tag')} />
                    </FormField>
                    <FormField label="Extra damage">
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
                    Loses sanity when hit
                  </label>
                </div>
                {enableSanityLossOnHit && (
                  <FormField label="Fraction of damage converted to sanity loss (0 to 1)">
                    <input type="number" step="0.01" min="0" max="1" className={inputClass} {...register('armor.sanityLossOnHitPercent', { valueAsNumber: true })} />
                  </FormField>
                )}
              </>
            )}
          </Fieldset>

          {category === 'food' && (
            <Fieldset legend="Food (Edible)" step={7}>
              <div className="row-2">
                <FormField label="Food type">
                  <select className={inputClass} {...register('edible.foodType')}>
                    {FOOD_TYPES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="row-2">
                <FormField label="Hunger restored">
                  <input type="number" step="0.5" className={inputClass} {...register('edible.hungerValue', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Health restored">
                  <input type="number" step="0.5" className={inputClass} {...register('edible.healthValue', { valueAsNumber: true })} />
                </FormField>
              </div>
              <FormField label="Sanity restored (negative drains)">
                <input type="number" step="0.5" className={inputClass} {...register('edible.sanityValue', { valueAsNumber: true })} />
              </FormField>

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableOnEatBuff}
                    onChange={(e) =>
                      setValue('onEatBuff', e.target.checked ? { damageMultiplier: 0.25, durationSeconds: 120 } : undefined)
                    }
                  />
                  Grants a temporary combat buff when eaten
                </label>
              </div>
              {enableOnEatBuff && (
                <div className="row-2">
                  <FormField label="Damage bonus (0 to 5, e.g. 0.25 = +25%)">
                    <input
                      type="number"
                      step="0.05"
                      max="5"
                      className={inputClass}
                      {...register('onEatBuff.damageMultiplier', { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label="Duration (seconds)">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      className={inputClass}
                      {...register('onEatBuff.durationSeconds', { valueAsNumber: true })}
                    />
                  </FormField>
                </div>
              )}
            </Fieldset>
          )}

          <Fieldset legend="Container" step={8}>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableContainer}
                  onChange={(e) =>
                    setValue(
                      'container',
                      e.target.checked
                        ? { widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: true }
                        : undefined,
                    )
                  }
                />
                It's a container (bag/box with slots)
              </label>
            </div>
            {enableContainer && (
              <>
                <div className="icon-toggle-row" style={{ marginBottom: 12 }}>
                  <div
                    className={`icon-toggle ${containerWidgetSource === 'vanilla' ? 'active' : ''}`}
                    onClick={() => setValue('container.widget', { source: 'vanilla', reusePrefab: 'sacred_chest' })}
                  >
                    Reuse a vanilla widget
                  </div>
                  <div
                    className={`icon-toggle ${containerWidgetSource === 'custom' ? 'active' : ''}`}
                    onClick={() => setValue('container.widget', { source: 'custom', slots: 8, columns: 2 })}
                  >
                    Custom widget (own UI art)
                  </div>
                </div>

                {containerWidgetSource === 'vanilla' ? (
                  <FormField
                    label="Reuse this container's widget (prefab id)"
                    hint='Clones its exact skin and slot grid at runtime — no UI art needed. e.g. "sacred_chest", "icebox", "treasurechest". Must be a real container-having prefab.'
                  >
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className={inputClass} {...register('container.widget.reusePrefab' as const)} placeholder="sacred_chest" />
                      <PrefabPickerButton onSelect={(id) => setValue('container.widget.reusePrefab' as const, id, { shouldDirty: true })} />
                    </div>
                  </FormField>
                ) : (
                  <div className="row-2">
                    <FormField label="Slots" hint="Needs a matching ui_<id> build supplied by you — see README.">
                      <input
                        type="number"
                        min={2}
                        max={16}
                        className={inputClass}
                        {...register('container.widget.slots' as const, { valueAsNumber: true })}
                      />
                    </FormField>
                    <FormField label="Columns">
                      <input
                        type="number"
                        min={1}
                        max={8}
                        className={inputClass}
                        {...register('container.widget.columns' as const, { valueAsNumber: true })}
                      />
                    </FormField>
                  </div>
                )}

                <div className="checks">
                  <label>
                    <input type="checkbox" {...register('container.sideWidget')} />
                    Auto-opens as a side panel while carried (like a backpack)
                  </label>
                </div>

                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableAcceptsTag}
                      onChange={(e) => setValue('container.acceptsTag', e.target.checked ? '' : undefined)}
                    />
                    Only accepts items with a specific tag
                  </label>
                </div>
                {enableAcceptsTag && (
                  <FormField label="Required tag (e.g. pocketwatch)">
                    <input className={inputClass} {...register('container.acceptsTag')} />
                  </FormField>
                )}

                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', margin: '12px 0 8px' }}>
                  Or accept a specific list of prefabs (OR'd with the tag above)
                </span>
                {(watched.container?.acceptsPrefabs ?? []).map((prefab, index) => {
                  const list = watched.container?.acceptsPrefabs ?? []
                  return (
                    <div key={index} className="ingredient-row">
                      <input
                        className={inputClass}
                        placeholder="prefab id (e.g. sewing_tape)"
                        value={prefab}
                        onChange={(e) => {
                          const next = [...list]
                          next[index] = e.target.value
                          setValue('container.acceptsPrefabs', next)
                        }}
                      />
                      <PrefabPickerButton
                        onSelect={(id) => {
                          const next = [...list]
                          next[index] = id
                          setValue('container.acceptsPrefabs', next, { shouldDirty: true })
                        }}
                      />
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => setValue('container.acceptsPrefabs', list.filter((_, i) => i !== index))}
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
                <button
                  type="button"
                  className="add-ingredient"
                  onClick={() => setValue('container.acceptsPrefabs', [...(watched.container?.acceptsPrefabs ?? []), ''])}
                >
                  + Add accepted prefab
                </button>

                <div className="checks" style={{ marginTop: 12 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={enablePreservation}
                      onChange={(e) =>
                        setValue('container.preservation', e.target.checked ? { perishRateMultiplier: 0.25 } : undefined)
                      }
                    />
                    Preserves contents (like an icebox)
                  </label>
                </div>
                {enablePreservation && (
                  <div className="row-2">
                    <FormField label="Spoilage rate (0 = never spoils, 1 = normal)">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className={inputClass}
                        {...register('container.preservation.perishRateMultiplier', { valueAsNumber: true })}
                      />
                    </FormField>
                    <FormField label="Temperature effect rate (optional, 1 = normal)">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className={inputClass}
                        {...register('container.preservation.temperatureRateMultiplier', { valueAsNumber: true })}
                      />
                    </FormField>
                  </div>
                )}
              </>
            )}
          </Fieldset>

          <Fieldset legend="Naming" step={9}>
            <div className="checks">
              <label>
                <input type="checkbox" {...register('nameable')} />
                Player can rename it (like signs/gravestones)
              </label>
            </div>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: 8 }}>
              This sets up the item itself (named + writeable). Triggering the rename prompt with the vanilla feather
              pencil needs a manual check in-game — see the generated README.
            </p>
          </Fieldset>
        </div>

        <FormFooter itemName={watched.displayName || 'New item'} saveLabel={initialItem ? 'Save changes' : 'Add item'} onCancel={onCancel} />
      </form>

      <ItemPreview item={watched} />
    </>
  )
}
