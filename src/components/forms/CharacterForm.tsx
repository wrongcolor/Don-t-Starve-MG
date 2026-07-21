import { useForm, useFieldArray, type Control, type UseFormRegister, type UseFormSetValue } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { characterDefSchema, CHARACTER_GENDERS, CHARACTER_PERKS, FOOD_TYPES, type CharacterDef } from '../../types/modProject'
import { FormField, Fieldset, FormHeader, FormFooter, inputClass, btnDanger } from './FormField'
import { CharacterPreview } from './CharacterPreview'

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

const PERK_LABELS: Record<(typeof CHARACTER_PERKS)[number], string> = {
  no_sanity_drain: 'Sanity doesn\'t drain naturally',
  fire_immune: 'Fire immune',
  freeze_immune: 'Freeze immune',
  night_vision: 'Sees in the dark',
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
  const watched = watch()
  const enableDamageMultiplier = watched.damageMultiplier !== undefined
  const enableHungerRateMultiplier = watched.hungerRateMultiplier !== undefined
  const enableWalkSpeedMultiplier = watched.walkSpeedMultiplier !== undefined
  const enableSkillTree = watched.skillTree !== undefined

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

          <div className="grid-3">
            <Fieldset legend="Stats" step={3}>
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

            <Fieldset legend="Perks" step={4}>
              <div className="tag-grid">
                {CHARACTER_PERKS.map((perk) => (
                  <label key={perk} className={`tag-opt ${watched.perks?.includes(perk) ? 'selected' : ''}`}>
                    <input type="checkbox" value={perk} className="sr-only" {...register('perks')} />
                    {PERK_LABELS[perk]}
                  </label>
                ))}
              </div>
            </Fieldset>

            <Fieldset legend="Starting inventory" step={5}>
              {inventory.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="prefab id (e.g. torch)" {...register(`startingInventory.${index}` as const)} />
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

          <Fieldset legend="Stat multipliers (optional)" step={6}>
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

          <Fieldset legend="Skill tree (optional)" step={7}>
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
              <SkillTreeEditor
                control={control}
                register={register}
                setValue={setValue}
                watchedBranches={watched.skillTree?.branches ?? []}
              />
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
