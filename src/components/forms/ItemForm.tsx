import { useState } from 'react'
import { useForm, useFieldArray, type Control, type UseFormRegister, type UseFormSetValue } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  itemDefSchema,
  TECH_LEVELS,
  RECIPE_FILTERS,
  VANILLA_ITEM_BUILDS,
  VANILLA_HAT_BUILDS,
  TOOL_ACTIONS,
  ON_HIT_EFFECTS,
  SPELL_EFFECTS,
  FOOD_TYPES,
  POCKET_DIMENSIONS,
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
  recipe: { ingredients: [{ prefab: 'twigs', amount: 1 }], techLevel: 'NONE', filters: ['TOOLS'] },
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

interface SpellFieldsRowProps {
  namePrefix: 'spellDef' | `spellbook.spells.${number}`
  labelPlaceholder: string
  register: UseFormRegister<ItemDef>
  setValue: UseFormSetValue<ItemDef>
  beamEnabled: boolean
  novaEnabled: boolean
}

function SpellFieldsRow({ namePrefix, labelPlaceholder, register, setValue, beamEnabled, novaEnabled }: SpellFieldsRowProps) {
  return (
    <>
      <input className={inputClass} placeholder={labelPlaceholder} {...register(`${namePrefix}.label` as const)} />
      <input
        className={inputClass}
        placeholder="prefab to spawn (e.g. stafflight)"
        {...register(`${namePrefix}.summonPrefab` as const)}
      />
      <PrefabPickerButton
        onSelect={(id) => setValue(`${namePrefix}.summonPrefab` as const, id, { shouldDirty: true })}
      />
      <input
        type="number"
        min="0"
        step="1"
        className="qty-input"
        placeholder="Mana cost"
        title="Mana cost (only matters for a caster with a mana pool — see the character's Mana section)"
        {...register(`${namePrefix}.manaCost` as const, { valueAsNumber: true })}
      />
      <input
        type="number"
        step="1"
        className="qty-input"
        placeholder="Health"
        title="Instant health change on the caster (negative drains) — leave blank for none"
        {...register(`${namePrefix}.healthDelta` as const, { valueAsNumber: true })}
      />
      <input
        type="number"
        step="1"
        className="qty-input"
        placeholder="Sanity"
        title="Instant sanity change on the caster (negative drains) — leave blank for none"
        {...register(`${namePrefix}.sanityDelta` as const, { valueAsNumber: true })}
      />
      <input
        type="number"
        step="1"
        className="qty-input"
        placeholder="Hunger"
        title="Instant hunger change on the caster (negative drains) — leave blank for none"
        {...register(`${namePrefix}.hungerDelta` as const, { valueAsNumber: true })}
      />
      <div style={{ flexBasis: '100%', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" {...register(`${namePrefix}.aimed` as const)} />
          Aim where it summons (instead of always at her feet)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={beamEnabled}
            onChange={(e) =>
              setValue(
                `${namePrefix}.beam` as const,
                e.target.checked ? { damagePerTick: 20, tickIntervalSeconds: 0.5, range: 10, durationSeconds: 3 } : undefined,
                { shouldDirty: true },
              )
            }
          />
          Channels a damaging beam
        </label>
        {beamEnabled && (
          <>
            <input
              type="number"
              step="1"
              min="1"
              className="qty-input"
              placeholder="Dmg/tick"
              title="Damage dealt to everything in the beam, per tick"
              {...register(`${namePrefix}.beam.damagePerTick` as const, { valueAsNumber: true })}
            />
            <input
              type="number"
              step="0.1"
              min="0.1"
              className="qty-input"
              placeholder="Tick sec"
              title="Seconds between damage ticks"
              {...register(`${namePrefix}.beam.tickIntervalSeconds` as const, { valueAsNumber: true })}
            />
            <input
              type="number"
              step="1"
              min="1"
              className="qty-input"
              placeholder="Range"
              title="How far the beam reaches"
              {...register(`${namePrefix}.beam.range` as const, { valueAsNumber: true })}
            />
            <input
              type="number"
              step="0.5"
              min="0.5"
              className="qty-input"
              placeholder="Duration"
              title="How many seconds the beam channels for"
              {...register(`${namePrefix}.beam.durationSeconds` as const, { valueAsNumber: true })}
            />
            <input
              type="number"
              step="0.1"
              min="0.1"
              className="qty-input"
              placeholder="Telegraph sec (optional)"
              title="Shows a reticule marker at the beam's starting point for this many seconds before damage begins — leave blank to skip the warning"
              {...register(`${namePrefix}.beam.telegraphSeconds` as const, { valueAsNumber: true })}
            />
          </>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={novaEnabled}
            onChange={(e) =>
              setValue(`${namePrefix}.nova` as const, e.target.checked ? { damage: 40, radius: 5, stunSeconds: 3 } : undefined, {
                shouldDirty: true,
              })
            }
          />
          Explodes in an aimed area (damages and freezes everything hostile caught in it)
        </label>
        {novaEnabled && (
          <>
            <input
              type="number"
              step="1"
              min="1"
              className="qty-input"
              placeholder="Damage"
              title="Damage dealt once to everything hostile in the blast"
              {...register(`${namePrefix}.nova.damage` as const, { valueAsNumber: true })}
            />
            <input
              type="number"
              step="1"
              min="1"
              className="qty-input"
              placeholder="Radius"
              title="How far from the aimed point the blast reaches"
              {...register(`${namePrefix}.nova.radius` as const, { valueAsNumber: true })}
            />
            <input
              type="number"
              step="0.5"
              min="0.5"
              className="qty-input"
              placeholder="Stun sec"
              title="How many seconds everything caught in the blast is frozen in place for"
              {...register(`${namePrefix}.nova.stunSeconds` as const, { valueAsNumber: true })}
            />
          </>
        )}
      </div>
    </>
  )
}

interface SpellbookEditorProps {
  control: Control<ItemDef>
  register: UseFormRegister<ItemDef>
  setValue: UseFormSetValue<ItemDef>
  errorMessage?: string
  watchedBeamFlags: boolean[]
  watchedNovaFlags: boolean[]
}

// Owns the spells field array itself, mounted only while the spellbook is
// enabled — same dodge as CharacterForm's SkillTreeEditor. A useFieldArray
// started before its value exists won't pick up a plain setValue() write to
// that same path (RHF tracks array mutations through its own append/remove/
// replace, not generic setValue): mounted unconditionally at the top of
// ItemForm, the checkbox's setValue('spellbook', {spells: [...]})} silently
// left `.fields` empty — the 2 default spells existed in the raw form value
// but never rendered as rows, and the first "+ Add spell" click produced 3
// rows (2 phantom + 1 appended) instead of 1. Mounting fresh here means
// useFieldArray reads the already-updated value at construction time instead.
function SpellbookEditor({ control, register, setValue, errorMessage, watchedBeamFlags, watchedNovaFlags }: SpellbookEditorProps) {
  const spells = useFieldArray({ control, name: 'spellbook.spells' as never })

  return (
    <>
      {spells.fields.map((field, index) => (
        <div key={field.id} className="ingredient-row">
          <SpellFieldsRow
            namePrefix={`spellbook.spells.${index}`}
            labelPlaceholder="Spell label (e.g. Summon Light)"
            register={register}
            setValue={setValue}
            beamEnabled={watchedBeamFlags[index] ?? false}
            novaEnabled={watchedNovaFlags[index] ?? false}
          />
          <button type="button" className={btnDanger} onClick={() => spells.remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="add-ingredient" onClick={() => spells.append({ label: '', summonPrefab: '' })}>
        + Add spell
      </button>
      {errorMessage && <p className="field error">{errorMessage}</p>}
    </>
  )
}

export function ItemForm({ initialItem, onSave, onCancel }: ItemFormProps) {
  const [enableSpellbook, setEnableSpellbook] = useState((initialItem ?? emptyItem).spellbook !== undefined)

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

  const [animationSource, setAnimationSource] = useState<'custom' | 'vanilla' | 'vanillaHat'>(
    (initialItem ?? emptyItem).animation?.source ?? 'custom',
  )
  const [templateKey, setTemplateKey] = useState<string | null>(null)
  const watched = watch()

  // A template's patch only ever sets the fields ITS OWN archetype cares about
  // (e.g. the Armor template never mentions `weapon`) — applying one after a
  // DIFFERENT template used to leave the previous template's weapon/armor/
  // toolAction lingering underneath, invisible once the UI moved on to a new
  // fieldset. Nothing in the schema forbids weapon+armor coexisting, so that
  // stale data passed validation silently while corrupting the generated equip
  // logic (isHandheld wins over isWearableArmor whenever a stale `weapon` is
  // still set). Resetting exactly these three archetype fields before applying
  // the new patch keeps every template application a clean slate.
  const applyTemplate = (key: string, patch: Partial<ItemDef>) => {
    setTemplateKey(key)
    const reset: Partial<ItemDef> = { toolAction: undefined, weapon: undefined, armor: undefined }
    Object.entries({ ...reset, ...patch }).forEach(([field, value]) => {
      setValue(field as keyof ItemDef, value as never, { shouldDirty: true })
    })
  }
  const category = watched.category
  const enableStackable = watched.stackable !== undefined
  const enablePerishable = watched.perishable !== undefined
  const enableWeapon = watched.weapon !== undefined
  const enableFiniteuses = watched.finiteuses !== undefined
  const enableArmor = watched.armor !== undefined
  const enableSolarLantern = watched.solarLantern !== undefined
  const enableSummonTotem = watched.summonTotem !== undefined
  const enableSolarBattery = watched.solarBattery !== undefined
  const enableRanged = watched.weapon?.ranged !== undefined
  const enableMeleeRange = watched.weapon?.meleeRange !== undefined
  const enableChainReturn = watched.weapon?.chainReturn !== undefined
  const enableSanityCost = watched.weapon?.sanityCostOnUse !== undefined
  const enableWalkSpeedMult = watched.equipWalkSpeedMult !== undefined
  const enableSpellEffect = watched.spellEffect !== undefined
  const enableTameBomb = watched.tameBomb !== undefined
  const enableGroundAttack = watched.groundAttack !== undefined
  const enableRechargeable = watched.rechargeable !== undefined
  const canRecharge = enableWeapon || enableSpellEffect
  const enableDapperness = watched.armor?.dapperness !== undefined
  const enableWeakness = watched.armor?.weakness !== undefined
  const enableSanityLossOnHit = watched.armor?.sanityLossOnHitPercent !== undefined
  const enableOnEatBuff = watched.onEatBuff !== undefined
  const hasDurabilityModel = enableFiniteuses || enableArmor || enablePerishable
  const enableCombinable = watched.combinable === true
  const enableContainer = watched.container !== undefined
  const containerSource = watched.container?.source === 'pocketDimension' ? 'pocketDimension' : 'own'
  const containerDimension = watched.container?.source === 'pocketDimension' ? watched.container.dimension : undefined
  const containerWidgetSource = watched.container?.source === 'own' ? (watched.container.widget?.source ?? 'vanilla') : 'vanilla'
  const enableAcceptsTag = watched.container?.source === 'own' && watched.container.acceptsTag !== undefined
  const enablePreservation = watched.container?.source === 'own' && watched.container.preservation !== undefined
  const containerAcceptsPrefabs = watched.container?.source === 'own' ? (watched.container.acceptsPrefabs ?? []) : []
  const spellbookSource = watched.spellbook?.source ?? 'static'
  const enableSpellDef = watched.spellDef !== undefined
  const handheld = category === 'tool' || enableWeapon
  const isHeadArmor = watched.armor?.equipSlot === 'head'

  const onCategoryChange = (nextCategory: ItemDef['category']) => {
    if (nextCategory === 'food' && !watched.edible) {
      setValue('edible', { foodType: 'GENERIC', healthValue: 1, hungerValue: 12.5, sanityValue: 0 })
    } else if (nextCategory !== 'food' && watched.edible) {
      setValue('edible', undefined)
      setValue('onEatBuff', undefined)
    }
  }

  // Football Helmet is this tool's default reused visual for anything worn on the
  // head — switching to the head slot auto-picks it (if the user hasn't already
  // chosen an animation of their own), and switching away resets to custom, since a
  // vanillaHat build only makes sense on a head-slot item.
  const onEquipSlotChange = (nextSlot: 'body' | 'head') => {
    if (nextSlot === 'head' && animationSource === 'custom') {
      setAnimationSource('vanillaHat')
      setValue('animation', { source: 'vanillaHat', hatName: VANILLA_HAT_BUILDS[0].name })
    } else if (nextSlot === 'body' && animationSource === 'vanillaHat') {
      setAnimationSource('custom')
      setValue('animation', { source: 'custom' })
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
                {isHeadArmor && (
                  <label>
                    <input
                      type="radio"
                      name="item-animation-source"
                      checked={animationSource === 'vanillaHat'}
                      onChange={() => {
                        setAnimationSource('vanillaHat')
                        setValue('animation', { source: 'vanillaHat', hatName: VANILLA_HAT_BUILDS[0].name })
                      }}
                    />
                    Reuse a vanilla hat build (head slot)
                  </label>
                )}
              </div>

              {animationSource === 'vanilla' && (
                <>
                  <FormField
                    label="Animation build"
                    error={(errors.animation as { build?: { message?: string } } | undefined)?.build?.message}
                  >
                    <input className={inputClass} list="vanilla-item-build-options" {...register('animation.build' as const)} />
                    <datalist id="vanilla-item-build-options">
                      {VANILLA_ITEM_BUILDS.map((b) => (
                        <option key={b.build} value={b.build}>
                          {b.label}
                        </option>
                      ))}
                    </datalist>
                  </FormField>
                  <FormField
                    label='Idle animation clip (leave blank for "idle")'
                    hint='Only needed for a build shared across several variants (e.g. "staffs", "books", "gems", "amulets", "trinkets") that plays its own clip name instead of a plain "idle" — check the real prefab source before picking one.'
                  >
                    <input className={inputClass} placeholder="idle" {...register('animation.idleClip' as const)} />
                  </FormField>
                </>
              )}

              {animationSource === 'vanillaHat' && (
                <FormField
                  label="Hat"
                  error={(errors.animation as { hatName?: { message?: string } } | undefined)?.hatName?.message}
                >
                  <select className={inputClass} {...register('animation.hatName' as const)}>
                    {VANILLA_HAT_BUILDS.map((h) => (
                      <option key={h.name} value={h.name}>
                        {h.label}
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
                      className={`icon-toggle ${!enableRanged && !enableChainReturn ? 'active' : ''}`}
                      onClick={() => {
                        setValue('weapon.ranged', undefined)
                        setValue('weapon.chainReturn', undefined)
                      }}
                    >
                      🪓 Melee
                    </div>
                    <div
                      className={`icon-toggle ${enableRanged ? 'active' : ''}`}
                      onClick={() => {
                        setValue('weapon.meleeRange', undefined)
                        setValue('weapon.chainReturn', undefined)
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
                    <div
                      className={`icon-toggle ${enableChainReturn ? 'active' : ''}`}
                      onClick={() => {
                        setValue('weapon.meleeRange', undefined)
                        setValue('weapon.ranged', undefined)
                        setValue('weapon.chainReturn', { range: 15, speed: 20, maxChainHits: 5, searchRadius: 8 })
                      }}
                    >
                      🪃 Chain-return
                    </div>
                  </div>

                  {enableChainReturn && (
                    <div className="row-2">
                      <FormField label="Throw range">
                        <input type="number" className={inputClass} {...register('weapon.chainReturn.range', { valueAsNumber: true })} />
                      </FormField>
                      <FormField label="Flight speed">
                        <input type="number" className={inputClass} {...register('weapon.chainReturn.speed', { valueAsNumber: true })} />
                      </FormField>
                      <FormField label="Max enemies chained">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          className={inputClass}
                          {...register('weapon.chainReturn.maxChainHits', { valueAsNumber: true })}
                        />
                      </FormField>
                      <FormField label="Radius to find the next enemy">
                        <input
                          type="number"
                          className={inputClass}
                          {...register('weapon.chainReturn.searchRadius', { valueAsNumber: true })}
                        />
                      </FormField>
                      <FormField label="Projectile animation clip (blank = idle)">
                        <input className={inputClass} {...register('weapon.chainReturn.projectileClip')} />
                      </FormField>
                    </div>
                  )}

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
                  ) : !enableChainReturn ? (
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
                  ) : null}

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
                    disabled={enableSpellbook || enableTameBomb || enableGroundAttack}
                    onChange={(e) => {
                      setValue('spellEffect', e.target.checked ? SPELL_EFFECTS[0] : undefined)
                      if (!e.target.checked && !enableWeapon) setValue('rechargeable', undefined)
                    }}
                  />
                  Magic effect (use on a map point)
                  {enableSpellbook && ' (turn off spellbook first)'}
                  {(enableTameBomb || enableGroundAttack) && ' (turn off tame cloud/ground attack first)'}
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
                    checked={enableTameBomb}
                    disabled={enableSpellEffect || enableGroundAttack}
                    onChange={(e) =>
                      setValue('tameBomb', e.target.checked ? { radius: 4, cloudDurationSeconds: 10, tameDurationSeconds: 60 } : undefined)
                    }
                  />
                  Tame cloud (thrown at a point, temporarily tames nearby hostile creatures)
                  {enableSpellEffect && ' (turn off magic effect first)'}
                  {enableGroundAttack && ' (turn off ground attack first)'}
                  <InfoTip text="Only affects hostile creatures whose own AI already respects a follower leader — true for tameable-style mobs (and any hostile creature you make with this tool), but not bosses or other uniquely-scripted hostiles." />
                </label>
              </div>
              {enableTameBomb && (
                <div className="row-2">
                  <FormField label="Radius">
                    <input type="number" min="1" max="20" className={inputClass} {...register('tameBomb.radius', { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Cloud lasts (seconds)">
                    <input type="number" step="1" min="1" className={inputClass} {...register('tameBomb.cloudDurationSeconds', { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Tamed for (seconds)">
                    <input type="number" step="1" min="1" className={inputClass} {...register('tameBomb.tameDurationSeconds', { valueAsNumber: true })} />
                  </FormField>
                </div>
              )}

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableGroundAttack}
                    disabled={enableSpellEffect || enableTameBomb}
                    onChange={(e) =>
                      setValue('groundAttack', e.target.checked ? { spikeCount: 5, wallCount: 0, radius: 6 } : undefined)
                    }
                  />
                  Ground attack (thrown at a point, erupts sand spikes/walls — like the Antlion)
                  {enableSpellEffect && ' (turn off magic effect first)'}
                  {enableTameBomb && ' (turn off tame cloud first)'}
                </label>
              </div>
              {enableGroundAttack && (
                <div className="row-2">
                  <FormField label="Spikes">
                    <input type="number" min="1" max="20" className={inputClass} {...register('groundAttack.spikeCount', { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Walls (0 = none)">
                    <input type="number" min="0" max="20" className={inputClass} {...register('groundAttack.wallCount', { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Radius">
                    <input type="number" min="1" max="20" className={inputClass} {...register('groundAttack.radius', { valueAsNumber: true })} />
                  </FormField>
                </div>
              )}

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableSpellbook}
                    disabled={enableSpellEffect || enableSpellDef}
                    onChange={(e) => {
                      setEnableSpellbook(e.target.checked)
                      setValue(
                        'spellbook',
                        e.target.checked
                          ? { source: 'static', spells: [{ label: '', summonPrefab: '' }, { label: '', summonPrefab: '' }] }
                          : undefined,
                      )
                    }}
                  />
                  Spellbook (menu of spells to pick from)
                  {enableSpellEffect && ' (turn off magic effect first)'}
                  {enableSpellDef && " (this item is itself a spell — turn that off first)"}
                  <InfoTip text="Opens a wheel of spells when used. Each spell just spawns a prefab at the caster — no map targeting (that would need aoetargeting, not modeled here)." />
                </label>
              </div>
              {enableSpellbook && (
                <>
                  <div className="icon-toggle-row" style={{ marginBottom: 12 }}>
                    <div
                      className={`icon-toggle ${spellbookSource === 'static' ? 'active' : ''}`}
                      onClick={() =>
                        setValue('spellbook', {
                          source: 'static',
                          spells: [{ label: '', summonPrefab: '' }, { label: '', summonPrefab: '' }],
                        })
                      }
                    >
                      Fixed list of spells
                    </div>
                    <div
                      className={`icon-toggle ${spellbookSource === 'linkedContainer' ? 'active' : ''}`}
                      onClick={() => setValue('spellbook', { source: 'linkedContainer', containerItemId: '' })}
                    >
                      Read from a container item (e.g. a codex)
                    </div>
                  </div>

                  {spellbookSource === 'static' ? (
                    <SpellbookEditor
                      control={control}
                      register={register}
                      setValue={setValue}
                      errorMessage={(errors.spellbook as { spells?: { message?: string } } | undefined)?.spells?.message}
                      watchedBeamFlags={(watched.spellbook?.source === 'static' ? watched.spellbook.spells : []).map(
                        (s) => s.beam !== undefined,
                      )}
                      watchedNovaFlags={(watched.spellbook?.source === 'static' ? watched.spellbook.spells : []).map(
                        (s) => s.nova !== undefined,
                      )}
                    />
                  ) : (
                    <FormField
                      label="Container item id"
                      hint="The id of another item in this mod with a container that accepts spell items (acceptsTag: spell) — see its Container section."
                    >
                      <input
                        className={inputClass}
                        placeholder="suncodex"
                        {...register('spellbook.containerItemId' as const)}
                      />
                    </FormField>
                  )}
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
                <FormField label="Equip slot">
                  <select
                    className={inputClass}
                    {...register('armor.equipSlot', { onChange: (e) => onEquipSlotChange(e.target.value) })}
                  >
                    <option value="body">Body (chestplate/suit)</option>
                    <option value="head">Head (helmet/hat)</option>
                  </select>
                </FormField>
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

          <Fieldset legend="Solar Lantern" step={7}>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: -4, marginBottom: 8 }}>
              Sourced from the real Miner Hat (Original/prefabs/mininglantern.lua) — a head-slot fueled light, but set
              to FUELTYPE.MAGIC ("use this one if u don't want there to be any associated fuel", per the component's
              own source comment) so no fuel item can ever refill it. A periodic task refills it instead, but only
              while it's out in daylight above ground.
            </p>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableSolarLantern}
                  onChange={(e) =>
                    setValue(
                      'solarLantern',
                      e.target.checked ? { maxFuel: 100, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3, radius: 4 } : undefined,
                    )
                  }
                />
                A head-slot lantern that only recharges in sunlight
              </label>
            </div>
            {enableSolarLantern && (
              <div className="row-2">
                <FormField label="Max fuel">
                  <input type="number" min="1" className={inputClass} {...register('solarLantern.maxFuel', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Fuel drained per second while worn">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={inputClass}
                    {...register('solarLantern.drainPerSecond', { valueAsNumber: true })}
                  />
                </FormField>
                <FormField label="Fuel recharged per second in sunlight">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={inputClass}
                    {...register('solarLantern.rechargePerSecondInSunlight', { valueAsNumber: true })}
                  />
                </FormField>
                <FormField label="Light radius">
                  <input type="number" min="1" max="20" className={inputClass} {...register('solarLantern.radius', { valueAsNumber: true })} />
                </FormField>
              </div>
            )}
          </Fieldset>

          <Fieldset legend="Summon Totem" step={8}>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: -4, marginBottom: 8 }}>
              A held item that casts itself at a fixed point in front of you (the same spellcaster mechanism as a
              magic effect) to summon/dismiss a creature, tracked on the totem itself. Durability drains like the
              Solar Lantern's fuel while the creature is alive, and only recharges in daylight — when it hits zero,
              the creature disappears.
            </p>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableSummonTotem}
                  onChange={(e) =>
                    setValue(
                      'summonTotem',
                      e.target.checked
                        ? { summonPrefab: '', maxDurability: 100, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3 }
                        : undefined,
                    )
                  }
                />
                Summons a creature companion when used
              </label>
            </div>
            {enableSummonTotem && (
              <>
                <FormField label="Creature to summon (prefab id)">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className={inputClass} {...register('summonTotem.summonPrefab')} />
                    <PrefabPickerButton onSelect={(id) => setValue('summonTotem.summonPrefab', id, { shouldDirty: true })} />
                  </div>
                </FormField>
                <div className="row-2">
                  <FormField label="Max durability">
                    <input type="number" min="1" className={inputClass} {...register('summonTotem.maxDurability', { valueAsNumber: true })} />
                  </FormField>
                  <FormField label="Durability drained per second while summoned">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className={inputClass}
                      {...register('summonTotem.drainPerSecond', { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label="Durability recharged per second in sunlight">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className={inputClass}
                      {...register('summonTotem.rechargePerSecondInSunlight', { valueAsNumber: true })}
                    />
                  </FormField>
                </div>
              </>
            )}
          </Fieldset>

          <Fieldset legend="Solar Battery" step={9}>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: -4, marginBottom: 8 }}>
              A ground-placed, toggle-activated battery (the same activatable component/on-off pattern the real
              Terrarium item uses) — charges only while active, in daylight, and sitting on the ground, unheld.
              Right-click it on a Solar Lantern or Sun Totem to top off their charge, or right-click it with no
              target to feed your own Solar Energy instead — either way it drains what it stores into the target.
            </p>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableSolarBattery}
                  onChange={(e) =>
                    setValue('solarBattery', e.target.checked ? { maxCharge: 200, chargePerSecondInSunlight: 0.5 } : undefined)
                  }
                />
                Stores solar charge that can recharge other solar items or Solar Energy
              </label>
            </div>
            {enableSolarBattery && (
              <div className="row-2">
                <FormField label="Max charge">
                  <input type="number" min="1" className={inputClass} {...register('solarBattery.maxCharge', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Charge gained per second in sunlight">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={inputClass}
                    {...register('solarBattery.chargePerSecondInSunlight', { valueAsNumber: true })}
                  />
                </FormField>
              </div>
            )}
          </Fieldset>

          {category === 'food' && (
            <Fieldset legend="Food (Edible)" step={10}>
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

          <Fieldset legend="Container" step={11}>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableContainer}
                  onChange={(e) =>
                    setValue(
                      'container',
                      e.target.checked
                        ? { source: 'own', widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: true }
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
                    className={`icon-toggle ${containerSource === 'own' ? 'active' : ''}`}
                    onClick={() =>
                      setValue('container', { source: 'own', widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: true })
                    }
                  >
                    Own slots
                  </div>
                  {POCKET_DIMENSIONS.map((d) => (
                    <div
                      key={d.value}
                      className={`icon-toggle ${containerDimension === d.value ? 'active' : ''}`}
                      onClick={() => setValue('container', { source: 'pocketDimension', dimension: d.value })}
                    >
                      Share {d.label}
                    </div>
                  ))}
                </div>

                {containerSource === 'pocketDimension' ? (
                  <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '0 0 12px' }}>
                    Its slots are shared with any other container linked to the same vanilla pocket dimension — including the
                    base game's own Chester (shadow skin), the Magician's Top Hat, and the Magician Chest. No UI art needed;
                    the game already defines this widget.
                  </p>
                ) : containerWidgetSource === 'vanilla' ? (
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

                {containerSource === 'own' && (
                  <>
                    <div className="checks">
                      <label>
                        <input type="checkbox" {...register('container.sideWidget' as const)} />
                        Auto-opens as a side panel while carried (like a backpack)
                      </label>
                    </div>

                    <div className="checks">
                      <label>
                        <input
                          type="checkbox"
                          checked={enableAcceptsTag}
                          onChange={(e) => setValue('container.acceptsTag' as const, e.target.checked ? '' : undefined)}
                        />
                        Only accepts items with a specific tag
                      </label>
                    </div>
                    {enableAcceptsTag && (
                      <FormField label="Required tag (e.g. pocketwatch)">
                        <input className={inputClass} {...register('container.acceptsTag' as const)} />
                      </FormField>
                    )}

                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', margin: '12px 0 8px' }}>
                      Or accept a specific list of prefabs (OR'd with the tag above)
                    </span>
                    {containerAcceptsPrefabs.map((prefab, index) => {
                      const updatePrefabAt = (value: string) => {
                        const next = [...containerAcceptsPrefabs]
                        next[index] = value
                        setValue('container.acceptsPrefabs' as const, next, { shouldDirty: true })
                      }
                      return (
                        <div key={index} className="ingredient-row">
                          <input
                            className={inputClass}
                            placeholder="prefab id (e.g. sewing_tape)"
                            value={prefab}
                            onChange={(e) => updatePrefabAt(e.target.value)}
                          />
                          <PrefabPickerButton onSelect={updatePrefabAt} />
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() =>
                              setValue(
                                'container.acceptsPrefabs' as const,
                                containerAcceptsPrefabs.filter((_, i) => i !== index),
                                { shouldDirty: true },
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                    <button
                      type="button"
                      className="add-ingredient"
                      onClick={() => setValue('container.acceptsPrefabs' as const, [...containerAcceptsPrefabs, ''], { shouldDirty: true })}
                    >
                      + Add accepted prefab
                    </button>

                    <div className="checks" style={{ marginTop: 12 }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={enablePreservation}
                          onChange={(e) =>
                            setValue('container.preservation' as const, e.target.checked ? { perishRateMultiplier: 0.25 } : undefined)
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
                            {...register('container.preservation.perishRateMultiplier' as const, { valueAsNumber: true })}
                          />
                        </FormField>
                        <FormField label="Temperature effect rate (optional, 1 = normal)">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="1"
                            className={inputClass}
                            {...register('container.preservation.temperatureRateMultiplier' as const, { valueAsNumber: true })}
                          />
                        </FormField>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </Fieldset>

          <Fieldset legend="Special mechanics" step={12}>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableSpellDef}
                  disabled={enableSpellbook}
                  onChange={(e) => setValue('spellDef', e.target.checked ? { label: '', summonPrefab: '' } : undefined)}
                />
                It's a spell (goes inside another item's linked-container spellbook)
                {enableSpellbook && ' (turn off this item\'s own spellbook first)'}
              </label>
            </div>
            {enableSpellDef && (
              <div className="ingredient-row">
                <SpellFieldsRow
                  namePrefix="spellDef"
                  labelPlaceholder="Spell label (e.g. Sunbeam)"
                  register={register}
                  setValue={setValue}
                  beamEnabled={watched.spellDef?.beam !== undefined}
                  novaEnabled={watched.spellDef?.nova !== undefined}
                />
              </div>
            )}

            <div className="checks">
              <label>
                <input type="checkbox" {...register('nameable')} />
                Player can rename it (like signs/gravestones)
              </label>
            </div>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: 8, marginBottom: 8 }}>
              This sets up the item itself (named + writeable). Triggering the rename prompt with the vanilla feather
              pencil needs a manual check in-game — see the generated README.
            </p>

            <div className="checks">
              <label>
                <input type="checkbox" {...register('moonrelic')} />
                Can be given to the Celestial Portal (character-switch idol)
              </label>
            </div>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: 8 }}>
              Confirmed straight from the base game (moonrockidol.lua): this is the entire mechanic behind "give an
              idol to the portal to pick a new survivor" — no matter what else the item does, holding it lets the
              player GIVE it to the Celestial Portal.
            </p>
          </Fieldset>
        </div>

        <FormFooter itemName={watched.displayName || 'New item'} saveLabel={initialItem ? 'Save changes' : 'Add item'} onCancel={onCancel} />
      </form>

      <ItemPreview item={watched} />
    </>
  )
}
