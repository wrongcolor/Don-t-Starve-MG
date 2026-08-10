import { useState } from 'react'
import { useForm, useFieldArray, type Control, type UseFormRegister, type UseFormSetValue } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  characterDefSchema,
  CHARACTER_GENDERS,
  CHARACTER_PERKS,
  FOOD_TYPES,
  VANILLA_CHARACTER_BUILDS,
  type CharacterDef,
} from '../../types/modProject'
import { FormField, Fieldset, FormHeader, FormFooter, inputClass, btnDanger } from './FormField'
import { CharacterPreview } from './CharacterPreview'
import { PrefabPickerButton } from './PrefabPicker'

interface SkillTreeNodeFieldsProps {
  control: Control<CharacterDef>
  register: UseFormRegister<CharacterDef>
  setValue: UseFormSetValue<CharacterDef>
  branchIndex: number
  nodeIndex: number
  isFirstInBranch: boolean
  gatedAfterBranchSkills: number | undefined
  onRemove: () => void
}

function SkillTreeNodeFields({
  register,
  setValue,
  branchIndex,
  nodeIndex,
  isFirstInBranch,
  gatedAfterBranchSkills,
  onRemove,
}: SkillTreeNodeFieldsProps) {
  const base = `skillTree.branches.${branchIndex}.nodes.${nodeIndex}` as const
  const gateEnabled = gatedAfterBranchSkills !== undefined

  return (
    <div className="card panel" style={{ marginBottom: 8 }}>
      <div className="row-2">
        <FormField label="Skill id">
          <input className={inputClass} {...register(`${base}.id` as const)} placeholder="skill_1" />
        </FormField>
        <FormField label="Title">
          <input className={inputClass} {...register(`${base}.title` as const)} />
        </FormField>
      </div>
      <FormField label="Description">
        <textarea className={inputClass} rows={2} {...register(`${base}.desc` as const)} />
      </FormField>
      <div className="row-2">
        <FormField label="Tag added while active (optional)" hint='Check it elsewhere in your mod with inst:HasTag("...")'>
          <input className={inputClass} {...register(`${base}.addsTag` as const)} placeholder="fast_chopping" />
        </FormField>
        {!isFirstInBranch && (
          <div>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={gateEnabled}
                  onChange={(e) => setValue(`${base}.gatedAfterBranchSkills` as const, e.target.checked ? 1 : undefined)}
                />
                Locked until earlier skills unlocked
              </label>
            </div>
            {gateEnabled && (
              <FormField label="How many earlier skills in this branch">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  {...register(`${base}.gatedAfterBranchSkills` as const, { valueAsNumber: true })}
                />
              </FormField>
            )}
          </div>
        )}
      </div>
      <button type="button" className={btnDanger} onClick={onRemove}>
        Remove skill
      </button>
    </div>
  )
}

interface SkillTreeBranchFieldsProps {
  control: Control<CharacterDef>
  register: UseFormRegister<CharacterDef>
  setValue: UseFormSetValue<CharacterDef>
  branchIndex: number
  watchedGates: (number | undefined)[]
  onRemoveBranch: () => void
}

function SkillTreeBranchFields({
  control,
  register,
  setValue,
  branchIndex,
  watchedGates,
  onRemoveBranch,
}: SkillTreeBranchFieldsProps) {
  const nodes = useFieldArray({ control, name: `skillTree.branches.${branchIndex}.nodes` as const })

  return (
    <div className="card panel" style={{ marginBottom: 12 }}>
      <div className="row-2">
        <FormField label="Branch name (internal id)">
          <input
            className={inputClass}
            {...register(`skillTree.branches.${branchIndex}.name` as const)}
            placeholder="alchemy"
          />
        </FormField>
        <button type="button" className={btnDanger} onClick={onRemoveBranch}>
          Remove branch
        </button>
      </div>

      {nodes.fields.map((field, nodeIndex) => (
        <SkillTreeNodeFields
          key={field.id}
          control={control}
          register={register}
          setValue={setValue}
          branchIndex={branchIndex}
          nodeIndex={nodeIndex}
          isFirstInBranch={nodeIndex === 0}
          gatedAfterBranchSkills={watchedGates[nodeIndex]}
          onRemove={() => nodes.remove(nodeIndex)}
        />
      ))}
      <button
        type="button"
        className="add-ingredient"
        onClick={() => nodes.append({ id: '', title: '', desc: '' })}
      >
        + Add skill
      </button>
    </div>
  )
}

interface SkillTreeEditorProps {
  control: Control<CharacterDef>
  register: UseFormRegister<CharacterDef>
  setValue: UseFormSetValue<CharacterDef>
  watchedBranches: { nodes: { gatedAfterBranchSkills?: number }[] }[]
}

// Owns the branches field array itself, mounted only while the tree is enabled
// — a useFieldArray started before its value exists won't pick up a plain
// setValue() write to that same path (RHF tracks array mutations through its
// own append/remove/replace, not generic setValue), so this can't live in the
// parent alongside the enable checkbox.
function SkillTreeEditor({ control, register, setValue, watchedBranches }: SkillTreeEditorProps) {
  const branches = useFieldArray({ control, name: 'skillTree.branches' as const })

  return (
    <div style={{ marginTop: 8 }}>
      {branches.fields.map((field, branchIndex) => (
        <SkillTreeBranchFields
          key={field.id}
          control={control}
          register={register}
          setValue={setValue}
          branchIndex={branchIndex}
          watchedGates={(watchedBranches[branchIndex]?.nodes ?? []).map((n) => n.gatedAfterBranchSkills)}
          onRemoveBranch={() => branches.remove(branchIndex)}
        />
      ))}
      <button
        type="button"
        className="add-ingredient"
        onClick={() => branches.append({ name: '', nodes: [{ id: '', title: '', desc: '' }] })}
      >
        + Add branch
      </button>
    </div>
  )
}

interface CharacterFormProps {
  initialCharacter?: CharacterDef
  onSave: (character: CharacterDef) => void
  onCancel?: () => void
}

const emptyCharacter: CharacterDef = {
  id: '',
  gender: 'NEUTRAL',
  title: 'the original character',
  name: '',
  description: '',
  quote: '',
  stats: { health: 150, hunger: 150, sanity: 200 },
  startingInventory: ['torch'],
  speechOverrides: {},
  perks: [],
  foodTypeAffinities: [],
}

function tintToHex(tint?: [number, number, number, number]): string {
  const [r, g, b] = tint ?? [0.3, 0.5, 1, 1]
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hexToTint(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b, 1]
}

const PERK_LABELS: Record<(typeof CHARACTER_PERKS)[number], string> = {
  no_sanity_drain: 'Sanity doesn\'t drain naturally',
  fire_immune: 'Fire immune',
  freeze_immune: 'Freeze immune',
  night_vision: 'Sees in the dark',
  can_read_books: 'Can read any book',
}

export function CharacterForm({ initialCharacter, onSave, onCancel }: CharacterFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CharacterDef>({
    resolver: zodResolver(characterDefSchema),
    defaultValues: initialCharacter ?? emptyCharacter,
  })

  const inventory = useFieldArray({ control, name: 'startingInventory' as never })
  const affinities = useFieldArray({ control, name: 'foodTypeAffinities' })
  const [animationSource, setAnimationSource] = useState<'custom' | 'vanilla'>(
    (initialCharacter ?? emptyCharacter).animation?.source ?? 'custom',
  )
  const watched = watch()
  const enableDamageMultiplier = watched.damageMultiplier !== undefined
  const enableHungerRateMultiplier = watched.hungerRateMultiplier !== undefined
  const enableWalkSpeedMultiplier = watched.walkSpeedMultiplier !== undefined
  const enableSanityDayGain = watched.sanityDayGain !== undefined
  const enableSanityNightDrainMultiplier = watched.sanityNightDrainMultiplier !== undefined
  const enableHungerNightMultiplier = watched.hungerNightMultiplier !== undefined
  const enableWetnessSanityPenalty = watched.wetnessSanityPenalty !== undefined
  const enableSummerStatBonus = watched.summerStatBonus !== undefined
  const enableSummerWalkSpeedBonusPercent = watched.summerWalkSpeedBonusPercent !== undefined
  const enableWinterStatPenalty = watched.winterStatPenalty !== undefined
  const enableShadowAffinity = watched.shadowAffinity !== undefined
  const enableSkillTree = watched.skillTree !== undefined
  const enableMana = watched.mana !== undefined
  const enableManaRegen = watched.mana?.regenPerSecond !== undefined
  const enableOverheat = watched.overheat !== undefined

  const onSubmit = (data: CharacterDef) => onSave(data)

  return (
    <>
      <form className="main" onSubmit={handleSubmit(onSubmit)}>
        <FormHeader icon="🧑" title={initialCharacter ? initialCharacter.name : 'New Character'} />

        <div className="main-scroll">
          <div className="grid-2">
            <Fieldset legend="Identity" step={1}>
              <div className="row-2">
                <FormField label="Id (internal identifier)" error={errors.id?.message}>
                  <input className={inputClass} {...register('id')} disabled={!!initialCharacter} placeholder="my_char" />
                </FormField>
                <FormField label="Gender">
                  <select className={inputClass} {...register('gender')}>
                    {CHARACTER_GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Display name" error={errors.name?.message}>
                <input className={inputClass} {...register('name')} />
              </FormField>

              <FormField label='Title (e.g. "the wanderer", "the inventor")' error={errors.title?.message}>
                <input className={inputClass} {...register('title')} />
              </FormField>
            </Fieldset>

            <Fieldset legend="Presentation" step={2}>
              <FormField label="Description (selection screen)" error={errors.description?.message}>
                <textarea className={inputClass} rows={2} {...register('description')} />
              </FormField>

              <FormField label="Catchphrase" error={errors.quote?.message}>
                <input className={inputClass} {...register('quote')} />
              </FormField>
            </Fieldset>
          </div>

          <Fieldset legend="Appearance" step={3}>
            <div className="checks">
              <label>
                <input
                  type="radio"
                  name="character-animation-source"
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
                  name="character-animation-source"
                  checked={animationSource === 'vanilla'}
                  onChange={() => {
                    setAnimationSource('vanilla')
                    setValue('animation', { source: 'vanilla', build: VANILLA_CHARACTER_BUILDS[0].build })
                  }}
                />
                Reuse an existing character's build
              </label>
            </div>

            {animationSource === 'vanilla' && (
              <FormField
                label="Build"
                error={(errors.animation as { build?: { message?: string } } | undefined)?.build?.message}
              >
                <select className={inputClass} {...register('animation.build' as const)}>
                  {VANILLA_CHARACTER_BUILDS.map((b) => (
                    <option key={b.build} value={b.build}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </Fieldset>

          <div className="grid-3">
            <Fieldset legend="Stats" step={4}>
              <div className="row-2">
                <FormField label="Health">
                  <input type="number" className={inputClass} {...register('stats.health', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Hunger">
                  <input type="number" className={inputClass} {...register('stats.hunger', { valueAsNumber: true })} />
                </FormField>
              </div>
              <FormField label="Sanity">
                <input type="number" className={inputClass} {...register('stats.sanity', { valueAsNumber: true })} />
              </FormField>
            </Fieldset>

            <Fieldset legend="Perks" step={5}>
              <div className="tag-grid">
                {CHARACTER_PERKS.map((perk) => (
                  <label key={perk} className={`tag-opt ${watched.perks?.includes(perk) ? 'selected' : ''}`}>
                    <input type="checkbox" value={perk} className="sr-only" {...register('perks')} />
                    {PERK_LABELS[perk]}
                  </label>
                ))}
              </div>
            </Fieldset>

            <Fieldset legend="Starting inventory" step={6}>
              {inventory.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="prefab id (e.g. torch)" {...register(`startingInventory.${index}` as const)} />
                  <PrefabPickerButton onSelect={(id) => setValue(`startingInventory.${index}` as const, id, { shouldDirty: true })} />
                  <button type="button" className={btnDanger} onClick={() => inventory.remove(index)}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient" onClick={() => inventory.append('')}>
                + Add item
              </button>
            </Fieldset>
          </div>

          <Fieldset legend="Stat multipliers (optional)" step={7}>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: -4, marginBottom: 8 }}>
              Sourced from a real character mod's master_postinit (see docs/dst-knowledge/patterns.md#21) — a static
              multiplier applied once at spawn, independent of any skill tree.
            </p>
            <div className="row-2">
              <div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableDamageMultiplier}
                      onChange={(e) => setValue('damageMultiplier', e.target.checked ? 1 : undefined)}
                    />
                    Damage dealt
                  </label>
                </div>
                {enableDamageMultiplier && (
                  <FormField label="Multiplier (1 = normal)">
                    <input type="number" step="0.05" className={inputClass} {...register('damageMultiplier', { valueAsNumber: true })} />
                  </FormField>
                )}
              </div>
              <div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableHungerRateMultiplier}
                      onChange={(e) => setValue('hungerRateMultiplier', e.target.checked ? 1 : undefined)}
                    />
                    Hunger rate
                  </label>
                </div>
                {enableHungerRateMultiplier && (
                  <FormField label="Multiplier (1 = normal, 0 = never hungry)">
                    <input type="number" step="0.05" className={inputClass} {...register('hungerRateMultiplier', { valueAsNumber: true })} />
                  </FormField>
                )}
              </div>
              <div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableWalkSpeedMultiplier}
                      onChange={(e) => setValue('walkSpeedMultiplier', e.target.checked ? 1.25 : undefined)}
                    />
                    Walk speed
                  </label>
                </div>
                {enableWalkSpeedMultiplier && (
                  <FormField label="Multiplier (1 = normal)">
                    <input type="number" step="0.05" className={inputClass} {...register('walkSpeedMultiplier', { valueAsNumber: true })} />
                  </FormField>
                )}
              </div>
            </div>

            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', margin: '12px 0 8px' }}>
              Food type affinities (extra hunger/health/sanity from a whole food category)
            </span>
            {affinities.fields.map((field, index) => (
              <div key={field.id} className="ingredient-row">
                <select className={inputClass} {...register(`foodTypeAffinities.${index}.foodType` as const)}>
                  {FOOD_TYPES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  className="qty-input"
                  {...register(`foodTypeAffinities.${index}.multiplier` as const, { valueAsNumber: true })}
                />
                <button type="button" className={btnDanger} onClick={() => affinities.remove(index)}>
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="add-ingredient"
              onClick={() => affinities.append({ foodType: 'VEGGIE', multiplier: 1.33 })}
            >
              + Add affinity
            </button>
          </Fieldset>

          <Fieldset legend="Day/night & weather habits (optional)" step={8}>
            <div className="row-2">
              <div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableSanityDayGain}
                      onChange={(e) => setValue('sanityDayGain', e.target.checked ? 1 : undefined)}
                    />
                    Recovers sanity during the day
                  </label>
                </div>
                {enableSanityDayGain && (
                  <FormField label="Sanity gained per second while it's day">
                    <input type="number" step="0.1" min="0" className={inputClass} {...register('sanityDayGain', { valueAsNumber: true })} />
                  </FormField>
                )}
              </div>
              <div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableSanityNightDrainMultiplier}
                      onChange={(e) => setValue('sanityNightDrainMultiplier', e.target.checked ? 2 : undefined)}
                    />
                    Loses more sanity at night
                  </label>
                </div>
                {enableSanityNightDrainMultiplier && (
                  <FormField label="Night sanity loss multiplier (1 = normal)">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      className={inputClass}
                      {...register('sanityNightDrainMultiplier', { valueAsNumber: true })}
                    />
                  </FormField>
                )}
              </div>
              <div>
                <div className="checks">
                  <label>
                    <input type="checkbox" {...register('pauseHungerDuringDay')} />
                    Doesn't lose hunger during the day
                  </label>
                </div>
              </div>
              <div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableHungerNightMultiplier}
                      onChange={(e) => setValue('hungerNightMultiplier', e.target.checked ? 2 : undefined)}
                    />
                    Loses more hunger at night
                  </label>
                </div>
                {enableHungerNightMultiplier && (
                  <FormField label="Night hunger rate multiplier (1 = normal)">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      className={inputClass}
                      {...register('hungerNightMultiplier', { valueAsNumber: true })}
                    />
                  </FormField>
                )}
              </div>
            </div>

            <div>
              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableWetnessSanityPenalty}
                    onChange={(e) => setValue('wetnessSanityPenalty', e.target.checked ? 3 : undefined)}
                  />
                  Hates being wet
                </label>
              </div>
              {enableWetnessSanityPenalty && (
                <FormField label="Extra sanity lost per second at max wetness">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className={inputClass}
                    {...register('wetnessSanityPenalty', { valueAsNumber: true })}
                  />
                </FormField>
              )}
            </div>
          </Fieldset>

          <Fieldset legend="Seasons (optional)" step={9}>
            <div className="row-2">
              <div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableSummerStatBonus}
                      onChange={(e) => setValue('summerStatBonus', e.target.checked ? 75 : undefined)}
                    />
                    Gains max health/hunger/sanity in summer
                  </label>
                </div>
                {enableSummerStatBonus && (
                  <FormField label="Summer stat bonus">
                    <input type="number" min="0" className={inputClass} {...register('summerStatBonus', { valueAsNumber: true })} />
                  </FormField>
                )}
              </div>
              <div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableSummerWalkSpeedBonusPercent}
                      onChange={(e) => setValue('summerWalkSpeedBonusPercent', e.target.checked ? 15 : undefined)}
                    />
                    Walks faster in summer
                  </label>
                </div>
                {enableSummerWalkSpeedBonusPercent && (
                  <FormField label="Summer walk speed bonus (%)">
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      {...register('summerWalkSpeedBonusPercent', { valueAsNumber: true })}
                    />
                  </FormField>
                )}
              </div>
              <div>
                <div className="checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={enableWinterStatPenalty}
                      onChange={(e) => setValue('winterStatPenalty', e.target.checked ? 50 : undefined)}
                    />
                    Loses max health/hunger/sanity in winter
                  </label>
                </div>
                {enableWinterStatPenalty && (
                  <FormField label="Winter stat penalty">
                    <input type="number" min="0" className={inputClass} {...register('winterStatPenalty', { valueAsNumber: true })} />
                  </FormField>
                )}
              </div>
            </div>
          </Fieldset>

          <Fieldset legend="Shadow affinity (optional)" step={10}>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: -4, marginBottom: 8 }}>
              Real vanilla tag (Original/prefabs/shadowcreature.lua and friends) — insanity-spawned Shadow Creatures,
              Terrorbeaks, and similar all carry the "shadowcreature" tag. This multiplies damage against targets
              with that tag, and damage taken from attackers with that tag.
            </p>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableShadowAffinity}
                  onChange={(e) =>
                    setValue('shadowAffinity', e.target.checked ? { damageDealtMultiplier: 1.5, damageTakenMultiplier: 1.5 } : undefined)
                  }
                />
                Deals and takes extra damage from shadow creatures
              </label>
            </div>
            {enableShadowAffinity && (
              <div className="row-2">
                <FormField label="Damage dealt multiplier">
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    className={inputClass}
                    {...register('shadowAffinity.damageDealtMultiplier', { valueAsNumber: true })}
                  />
                </FormField>
                <FormField label="Damage taken multiplier">
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    className={inputClass}
                    {...register('shadowAffinity.damageTakenMultiplier', { valueAsNumber: true })}
                  />
                </FormField>
              </div>
            )}
          </Fieldset>

          <Fieldset legend="Mana (optional)" step={11}>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: -4, marginBottom: 8 }}>
              Sourced from a real published character mod's own from-scratch resource bar (see
              docs/dst-knowledge/patterns.md#61) — same spirit as Wigfrid's Inspiration, but far simpler: no shared
              game file is patched, just a custom "mana" component and a badge next to health/hunger/sanity that
              reuses the game's own generic bar (a color tint, no art required). Spellbook spells can each cost mana
              (set per spell in an item's Spellbook section) — a caster without this component always casts for free.
            </p>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableMana}
                  onChange={(e) => setValue('mana', e.target.checked ? { max: 100 } : undefined)}
                />
                This character has a mana pool
              </label>
            </div>
            {enableMana && (
              <>
                <div className="row-2">
                  <FormField label="Max mana">
                    <input type="number" min="1" className={inputClass} {...register('mana.max', { valueAsNumber: true })} />
                  </FormField>
                  <div>
                    <div className="checks">
                      <label>
                        <input
                          type="checkbox"
                          checked={enableManaRegen}
                          onChange={(e) => setValue('mana.regenPerSecond', e.target.checked ? 1 : undefined)}
                        />
                        Regenerates over time
                      </label>
                    </div>
                    {enableManaRegen && (
                      <FormField label="Mana per second">
                        <input type="number" step="0.1" min="0" className={inputClass} {...register('mana.regenPerSecond', { valueAsNumber: true })} />
                      </FormField>
                    )}
                  </div>
                </div>
                <div className="row-2">
                  <FormField label="Resource name (shown in this tool's preview only)">
                    <input className={inputClass} placeholder="Mana" {...register('mana.label')} />
                  </FormField>
                  <FormField label="Badge color">
                    <input
                      type="color"
                      className={inputClass}
                      value={tintToHex(watched.mana?.badgeTint)}
                      onChange={(e) => setValue('mana.badgeTint', hexToTint(e.target.value))}
                    />
                  </FormField>
                </div>
              </>
            )}
          </Fieldset>

          <Fieldset legend="Overheat (optional)" step={12}>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: -4, marginBottom: 8 }}>
              Sourced from real vanilla APIs (see Original/components/temperature.lua and heater.lua) — a
              "temperaturedelta" listener compares the character's own body temperature against a trigger point of
              your choosing, independent of the base game's own 70°C hyperthermia. While active: extra outgoing
              damage, a personal light and heat aura (the same heater component campfires use), a steady sanity
              drain, and a chance each tick to set nearby flammable things smoldering.
            </p>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableOverheat}
                  onChange={(e) =>
                    setValue(
                      'overheat',
                      e.target.checked
                        ? { triggerTemp: 65, damageMultiplier: 1.5, sanityDrainPerSecond: 5, igniteChance: 0.15 }
                        : undefined,
                    )
                  }
                />
                Enters an overheat mode above a body temperature threshold
              </label>
            </div>
            {enableOverheat && (
              <div className="row-2">
                <FormField label="Trigger temperature (°C)">
                  <input type="number" className={inputClass} {...register('overheat.triggerTemp', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Damage multiplier while overheated">
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    className={inputClass}
                    {...register('overheat.damageMultiplier', { valueAsNumber: true })}
                  />
                </FormField>
                <FormField label="Extra sanity lost per second">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className={inputClass}
                    {...register('overheat.sanityDrainPerSecond', { valueAsNumber: true })}
                  />
                </FormField>
                <FormField label="Chance per tick to ignite nearby flammable things">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    className={inputClass}
                    {...register('overheat.igniteChance', { valueAsNumber: true })}
                  />
                </FormField>
              </div>
            )}
          </Fieldset>

          <Fieldset legend="Skill tree (optional)" step={13}>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: -4, marginBottom: 8 }}>
              Sourced from the base game's own skilltree_defs.lua and skilltree_wilson.lua (see
              docs/dst-knowledge/patterns.md#28) — skilltreeupdater is already on every character, this just registers
              the tree. Each branch is a chain of skills; a skill can optionally add a tag while active, and can be
              locked until earlier skills in its branch are unlocked.
            </p>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={enableSkillTree}
                  onChange={(e) =>
                    setValue(
                      'skillTree',
                      e.target.checked
                        ? { branches: [{ name: 'branch1', nodes: [{ id: 'skill_1', title: '', desc: '' }] }] }
                        : undefined,
                    )
                  }
                />
                This character has a skill tree
              </label>
            </div>

            {enableSkillTree && (
              <>
                <SkillTreeEditor
                  control={control}
                  register={register}
                  setValue={setValue}
                  watchedBranches={watched.skillTree?.branches ?? []}
                />
                {errors.skillTree?.branches?.message && (
                  <p className="field error">{errors.skillTree.branches.message}</p>
                )}
              </>
            )}
          </Fieldset>

          <p style={{ fontSize: 15, color: 'var(--ink-soft)', padding: '0 4px' }}>
            Custom speech: by default the character inherits all of Wilson's speech (speech_wilson). You can adjust
            specific lines after generating the mod, by editing <code>speech_{'{id}'}.lua</code>.
          </p>
        </div>

        <FormFooter itemName={watched.name || 'New character'} saveLabel={initialCharacter ? 'Save changes' : 'Add character'} onCancel={onCancel} />
      </form>

      <CharacterPreview character={watched} />
    </>
  )
}
