import { z } from 'zod'
import { roomDefSchema, taskDefSchema } from './worldContent'

// Validated against the live DST game-scripts (recipe.lua, modutil.lua, techtree.lua,
// constants.lua, recipes_filter.lua) — see plan notes for sources.

export const TECH_LEVELS = [
  'NONE',
  'SCIENCE_ONE',
  'SCIENCE_TWO',
  'SCIENCE_THREE',
  'MAGIC_TWO',
  'MAGIC_THREE',
  'ANCIENT_TWO',
  'ANCIENT_THREE',
  'ANCIENT_FOUR',
  'CELESTIAL_ONE',
  'CELESTIAL_THREE',
  'SHADOW_TWO',
  'CARTOGRAPHY_TWO',
  'SEAFARING_ONE',
  'SEAFARING_TWO',
  'SCULPTING_ONE',
  'SCULPTING_TWO',
] as const

export const RECIPE_FILTERS = [
  'TOOLS',
  'LIGHT',
  'REFINE',
  'WEAPONS',
  'ARMOUR',
  'CLOTHING',
  'RESTORATION',
  'MAGIC',
  'DECOR',
  'STRUCTURES',
  'CONTAINERS',
  'COOKING',
  'GARDENING',
  'FISHING',
  'SEAFARING',
  'RIDING',
] as const

export const CHARACTER_GENDERS = ['MALE', 'FEMALE', 'ROBOT', 'NEUTRAL', 'PLURAL'] as const

// Confirmed against real game prefabs (axe.lua/pickaxe.lua/shovel.lua) — see
// docs/dst-knowledge/patterns.md#1. The `tool` component + SetAction(ACTIONS.X)
// is what actually lets an item chop/mine/dig; category alone does nothing.
export const TOOL_ACTIONS = ['CHOP', 'MINE', 'DIG'] as const

export const CREATURE_BEHAVIORS = ['passive', 'neutral', 'hostile'] as const

// Simple pickup-item builds bundled with the base game — safe to reuse via SetBank/SetBuild
// without shipping an anim/*.zip, since the game already has this animation data loaded.
export const VANILLA_ITEM_BUILDS = [
  { build: 'trinket_1', label: 'Odd trinket 1 (generic shape)' },
  { build: 'trinket_2', label: 'Odd trinket 2 (generic shape)' },
  { build: 'trinket_3', label: 'Odd trinket 3 (generic shape)' },
  { build: 'trinket_4', label: 'Odd trinket 4 (generic shape)' },
  { build: 'trinket_5', label: 'Odd trinket 5 (generic shape)' },
  { build: 'rocks', label: 'Rock' },
  { build: 'flint', label: 'Flint' },
  { build: 'log', label: 'Log' },
  { build: 'twigs', label: 'Twigs' },
  { build: 'cutgrass', label: 'Cut grass' },
  { build: 'goldnugget', label: 'Gold nugget' },
  { build: 'nightmarefuel', label: 'Nightmare fuel' },
] as const

// "no_hunger" and "faster_walk" used to live here as fixed on/off perks
// (hungerrate = 0, speed multiplier = 1.25). Removed in favor of the general
// damageMultiplier/hungerRateMultiplier/walkSpeedMultiplier fields below
// (patterns.md#21) — a fixed perk is just one specific value of the same
// mechanism, no need for two ways to express it.
export const CHARACTER_PERKS = ['no_sanity_drain', 'fire_immune', 'freeze_immune', 'night_vision'] as const

// Prefab names from the base game — used to stop users from generating an id that
// silently overwrites/collides with a vanilla prefab.
export const RESERVED_PREFAB_IDS = new Set([
  'wilson', 'willow', 'wolfgang', 'wendy', 'wx78', 'wickerbottom', 'woodie',
  'wes', 'waxwell', 'wathgrithr', 'webber', 'winona', 'warly', 'wortox',
  'wormwood', 'wurt', 'walter', 'wanda',
  'log', 'twigs', 'flint', 'rocks', 'cutgrass', 'grass', 'poop', 'gears',
  'goldnugget', 'nightmarefuel', 'silk', 'spidergland', 'monstermeat',
  'boneshard', 'ash', 'boards', 'ropes', 'rope', 'papyrus', 'transistor',
])

const luaIdentifier = z
  .string()
  .min(2, 'Use at least 2 characters')
  .max(32, 'Use at most 32 characters')
  .regex(/^[a-z][a-z0-9_]*$/, 'Use only lowercase letters, numbers, and "_", starting with a letter')
  .refine((id) => !RESERVED_PREFAB_IDS.has(id), {
    message: 'This id collides with a base-game prefab — choose another one',
  })

export const configOptionSchema = z.object({
  name: luaIdentifier,
  label: z.string().min(1),
  options: z
    .array(z.object({ description: z.string().min(1), data: z.union([z.string(), z.boolean(), z.number()]) }))
    .min(2, 'A config option needs at least 2 alternatives'),
  defaultIndex: z.number().int().min(0),
})

export const modMetaSchema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  author: z.string().min(1, 'Required'),
  version: z.string().min(1),
  allClientsRequireMod: z.boolean(),
  configOptions: z.array(configOptionSchema),
})

export const ingredientSchema = z.object({
  prefab: z.string().min(1, 'Required'),
  amount: z.number().int().min(1),
})

// 'vanilla' reuses an existing base-game build (no art required from the user).
// 'custom' keeps the previous behavior: bank/build named after the item's own id,
// which the user must supply as anim/<id>.zip (see README).
export const itemAnimationSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('custom') }),
  z.object({ source: z.literal('vanilla'), build: z.string().min(1, 'Choose an animation') }),
])

// Confirmed in staff.lua (firestaff/icestaff): a "magic" weapon deals 0 contact
// damage, has range, and fires a projectile — the actual on-hit effect (ignite,
// freeze) is a callback on the target, not the projectile itself. We only offer
// a curated, simplified subset of that callback, not the exact game logic (which
// also handles fuel conversion, waking sleepers, etc. — see patterns.md#6).
export const ON_HIT_EFFECTS = ['none', 'ignite', 'freeze'] as const

// Confirmed in staff.lua (yellowstaff/opalstaff): spellcaster + SpawnPrefab of an
// existing vanilla light prefab at a target point. Only one concrete effect for
// now — spellcaster in general is too open-ended to generalize (patterns.md#7).
export const SPELL_EFFECTS = ['createLight'] as const

// Confirmed against the real game scripts (components/spellbook.lua,
// prefabs/waxwelljournal.lua/willow_ember.lua/winona_remote.lua — see
// docs/dst-knowledge/patterns.md#29): a "spellbook" opens a radial menu of
// spells the player picks from — all action wiring (open/close/cast) is
// built into the base game, a mod only needs to list the spells. Simplified
// from the real thing (which aims at a point and is character-exclusive) to
// a self-cast SpawnPrefab, the same generalization already used for
// spellEffect/spellcaster above.
export const spellbookSpellSchema = z.object({
  label: z.string().min(1, 'Required'),
  summonPrefab: z.string().min(1, 'Enter the prefab to spawn (e.g. a light, creature, or projectile id)'),
})

export const spellbookSchema = z.object({
  spells: z.array(spellbookSpellSchema).min(2, 'Add at least 2 spells — with only 1, use the simpler magic effect field instead'),
})

// Sourced from TWO real published Workshop mods (see docs/dst-knowledge/
// patterns.md#20). Two different confirmed techniques for reusing a vanilla
// container's look without shipping UI art:
// 1. "Wanda's Watch Case" hand-builds the slot grid + reuses the vanilla
//    "ui_krampusbag_2x8" bank/build strings directly.
// 2. "Automation Farm" (simpler, more reliable — this is what we generate
//    now) does `containers.params.<id> = deepcopy(containers.params.<existing
//    container prefab id>)` — clones the ENTIRE widget config (skin + exact
//    slot grid) from any existing container-having prefab by its id, no
//    manual grid math needed. Works for any valid container prefab, not just
//    one curated preset.
export const containerWidgetSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('vanilla'), reusePrefab: z.string().min(1, 'Enter an existing container prefab id') }),
  // 'custom': a purely formulaic even grid (75px spacing) — NOT confirmed
  // against a working custom-art example, since every container mod we read
  // reused a vanilla skin. Needs a matching UI build (ui_<id>) supplied by
  // the user; see the generated README.
  z.object({
    source: z.literal('custom'),
    slots: z.number().int().min(2).max(16),
    columns: z.number().int().min(1).max(8),
  }),
])

export const containerSchema = z.object({
  widget: containerWidgetSchema,
  // Confirmed in the source mod: containers you simply carry (not equipped to
  // a body slot) still auto-open as a side panel while in your inventory when
  // this is true — no equippable component involved.
  sideWidget: z.boolean(),
  // Confirmed in the source mod (itemtestfn): optional filter so only items
  // with this tag can go inside — otherwise any item is accepted.
  acceptsTag: z.string().min(1).optional(),
  // Confirmed in a SECOND real mod ("Winona Toolbox", patterns.md#20): the
  // same itemtestfn can instead (or additionally) list specific accepted
  // prefab ids directly (item.prefab == "x" or ...) — useful when there's no
  // shared tag among the allowed items. OR'd together with acceptsTag if both are set.
  acceptsPrefabs: z.array(z.string().min(1)).optional(),
  // Confirmed in a THIRD real mod ("Automation Farm", see patterns.md#20) —
  // icebox/icepack both use exactly this component to slow decay of whatever
  // is stored inside them. Self-contained: no modmain.lua wiring needed,
  // just AddComponent("preserver") on the same prefab as the container itself.
  preservation: z
    .object({
      perishRateMultiplier: z.number().min(0).max(1),
      temperatureRateMultiplier: z.number().min(0).max(1).optional(),
    })
    .optional(),
})

// Keys of the game's FOODTYPE table (constants.lua) — used by the "edible" component
// to gate which characters/creatures will eat an item (e.g. Wormwood only eats VEGGIE).
export const FOOD_TYPES = ['GENERIC', 'MEAT', 'VEGGIE', 'GOODIES', 'ELEMENTAL', 'SEEDS'] as const

export const edibleSchema = z.object({
  foodType: z.enum(FOOD_TYPES),
  healthValue: z.number(),
  hungerValue: z.number(),
  sanityValue: z.number(),
})

// Confirmed via real published Workshop mods (docs/dst-knowledge/patterns.md#18):
// edible:SetOnEatenFn(fn) as an eat-time callback, and combat.externaldamagemultipliers
// (a SourceModifierList) for a stacking, removable damage bonus.
export const onEatBuffSchema = z.object({
  damageMultiplier: z.number().min(0.01).max(5),
  durationSeconds: z.number().min(1),
})

export const itemDefSchema = z
  .object({
    id: luaIdentifier,
    displayName: z.string().min(1, 'Required'),
    description: z.string().min(1, 'Required'),
    category: z.enum(['tool', 'weapon', 'armor', 'food', 'generic']),
    toolAction: z.enum(TOOL_ACTIONS).optional(),
    animation: itemAnimationSchema.optional(),
    stackable: z.object({ maxSize: z.number().int().min(2).max(99) }).optional(),
    perishable: z.object({ perishTimeDays: z.number().min(0.1) }).optional(),
    weapon: z
      .object({
        damage: z.number().min(0),
        sanityCostOnUse: z.number().min(0).optional(),
        // Confirmed in dryad_thornspear.lua (a real published character mod's melee
        // weapon): weapon:SetRange(range) — a single-argument call — is the real API
        // for extending a MELEE weapon's reach (vanilla default is ~2). Distinct from
        // the two-argument SetRange(minRange, maxRange) used below for a ranged/
        // projectile weapon, so the two are mutually exclusive.
        meleeRange: z.number().min(0.1).max(10).optional(),
        ranged: z
          .object({
            minRange: z.number().min(1),
            maxRange: z.number().min(1),
            projectilePrefab: z.string().min(1, 'Enter the projectile id (e.g. fire_projectile)'),
            onHitEffect: z.enum(ON_HIT_EFFECTS).optional(),
          })
          .refine((r) => r.maxRange >= r.minRange, {
            message: 'Max range must be greater than or equal to the min range',
            path: ['maxRange'],
          })
          .optional(),
      })
      .refine((w) => w.meleeRange === undefined || w.ranged === undefined, {
        message: 'Melee range only applies to a melee weapon — turn off ranged mode first',
        path: ['meleeRange'],
      })
      .optional(),
    finiteuses: z
      .object({
        maxUses: z.number().int().min(1),
        ignoreCombatDurabilityLoss: z.boolean().optional(),
      })
      .optional(),
    armor: z
      .object({
        // Confirmed in armor_grass.lua/armor_wood.lua/armor_marble.lua (docs/dst-knowledge/
        // patterns.md#11): InitCondition's FIRST argument is a separate "total damage
        // absorbed before breaking" budget (vanilla values are in the hundreds), not the
        // small "N uses" count finiteuses models — a durability model of its own, always
        // required, never borrowed from finiteuses.
        condition: z.number().int().min(1),
        absorption: z.number().min(0.01).max(1),
        flammable: z.boolean().optional(),
        dapperness: z.number().optional(),
        weakness: z.object({ tag: z.string().min(1), extraDamage: z.number().min(0) }).optional(),
        sanityLossOnHitPercent: z.number().min(0).max(1).optional(),
      })
      .optional(),
    equipWalkSpeedMult: z.number().min(0.1).max(3).optional(),
    spellEffect: z.enum(SPELL_EFFECTS).optional(),
    spellbook: spellbookSchema.optional(),
    edible: edibleSchema.optional(),
    onEatBuff: onEatBuffSchema.optional(),
    // Sourced from a real published Workshop mod ("Repair Combine"), not a vanilla
    // game script — simplified from its full logic (drops the config-driven bonus%
    // and "raise the max" mode) to just: sum both items' remaining durability %,
    // cap at 100%, consume the second item.
    combinable: z.boolean().optional(),
    container: containerSchema.optional(),
    // Adapted from a real published Workshop mod ("Craftable Wormholes", see
    // docs/dst-knowledge/patterns.md#23) — confirmed real API:
    // teleporter:Target(otherEntity) links two entities one-way (set on both
    // sides for a two-way pair). The source mod's own auto-pairing is a whole
    // event-driven queue with admin restrictions, custom naming, and minimap
    // RPC sync — too bespoke to generalize. Kept just the core idea: built
    // structures of this type link up two at a time, in build order.
    teleportPair: z.boolean().optional(),
    // Adapted from a real published Workshop mod ("Renameable Watches", see
    // docs/dst-knowledge/patterns.md#24) — confirmed real API: named + writeable
    // is the same system signs/gravestones use to let a player type a custom
    // name. The mod's OTHER half (teaching the vanilla feather pencil to
    // recognize a new writeable target) isn't included — we can't confirm from
    // source whether that risks breaking the pencil's existing sign-writing
    // behavior, so it's left as a manual, documented step (see README).
    nameable: z.boolean().optional(),
    // Adapted from a real published Workshop mod ("Wanda Extended: The
    // Shifting Watch", see docs/dst-knowledge/patterns.md#26) — confirmed
    // real API: rechargeable is a THIRD durability model alongside
    // finiteuses/perishable, but instead of being consumed the item goes on
    // a cooldown and becomes usable again on its own. SetChargeTime/Discharge
    // confirmed across two mods (this one, and "Renameable Watches").
    rechargeable: z.object({ cooldownSeconds: z.number().min(1) }).optional(),
    recipe: z.object({
      ingredients: z.array(ingredientSchema).min(1, 'Add at least 1 ingredient'),
      techLevel: z.enum(TECH_LEVELS),
      filters: z.array(z.enum(RECIPE_FILTERS)).min(1, 'Select at least one tab'),
      placer: z.boolean(),
    }),
  })
  .refine((item) => item.category !== 'tool' || item.toolAction !== undefined, {
    message: 'Select which action this tool performs (chop/mine/dig)',
    path: ['toolAction'],
  })
  .refine((item) => item.category !== 'food' || item.edible !== undefined, {
    message: 'Set the hunger/health/sanity values this food restores',
    path: ['edible'],
  })
  .refine((item) => item.onEatBuff === undefined || item.edible !== undefined, {
    message: 'A temporary buff on eat requires the item to be edible (category food)',
    path: ['onEatBuff'],
  })
  // Confirmed in hambat.lua (docs/dst-knowledge/patterns.md#3): the game uses EITHER
  // finiteuses (fixed use-count) OR perishable (time-based) as an item's durability
  // model, never both at once — so the two are mutually exclusive here too.
  .refine((item) => item.perishable === undefined || item.finiteuses === undefined, {
    message: 'Can\'t have both "max uses" and "perishable" at the same time — pick one as the durability model',
    path: ['finiteuses'],
  })
  .refine((item) => !item.combinable || item.finiteuses !== undefined || item.armor !== undefined || item.perishable !== undefined, {
    message: 'Combining requires a durability model — set max uses, perishable, or armor first',
    path: ['combinable'],
  })
  // A teleporter you carry around in your inventory doesn't make sense — the
  // source mod's own version is always a placed structure players walk into.
  .refine((item) => !item.teleportPair || item.recipe.placer, {
    message: 'A teleporter pair only makes sense as a structure — enable "It\'s a structure" first',
    path: ['teleportPair'],
  })
  .refine((item) => !item.rechargeable || item.weapon !== undefined || item.spellEffect !== undefined, {
    message: 'Rechargeable needs a way to be "used" — make it a weapon or give it a magic effect first',
    path: ['rechargeable'],
  })
  .refine((item) => !item.rechargeable || (item.finiteuses === undefined && item.perishable === undefined), {
    message: 'Rechargeable is an alternative durability model — turn off max uses/perishable first',
    path: ['rechargeable'],
  })
  .refine((item) => item.spellbook === undefined || item.spellEffect === undefined, {
    message: 'A spellbook already lets the item cast multiple spells — turn off the single magic effect first',
    path: ['spellbook'],
  })

// Confirmed in dryad.lua's master_postinit (docs/dst-knowledge/patterns.md#21) —
// stripped of Dryad's own (unmodeled) skill-tree conditionals, keeping just the
// underlying static multiplier calls: combat.damagemultiplier, hunger.hungerrate
// (as a multiple of TUNING.WILSON_HUNGER_RATE), and a permanent
// SetExternalSpeedMultiplier. foodaffinity:AddFoodtypeAffinity is the broader,
// whole-category sibling of the single-prefab AddPrefabAffinity already
// mentioned in patterns.md#15 (not modeled — no character in this project uses it).
export const foodTypeAffinitySchema = z.object({
  foodType: z.enum(FOOD_TYPES),
  multiplier: z.number().min(0.01).max(5),
})

// Confirmed against the base game's own scripts/prefabs/skilltree_defs.lua and
// scripts/prefabs/skilltree_wilson.lua (a local game-files copy — see
// docs/dst-knowledge/patterns.md#28). skilltreeupdater is already added to every
// player character by player_common.lua, so nothing extra is needed to enable
// the system itself — a tree is just a separate scripts/prefabs/skilltree_<id>.lua
// registered via skilltree_defs.CreateSkillTreeFor. We generalize every node's
// onactivate/ondeactivate to a single AddTag/RemoveTag pair — by far the most
// common real pattern (most of Wilson's own nodes, and most of a real
// custom-character mod's ("Dryad") nodes, do exactly this). Node positions and
// branch layout (ORDERS) are auto-computed as vertical chains — `pos` only
// affects on-screen placement, no gameplay effect. The one lock type modeled is
// the single generalizable one confirmed in skilltree_wilson.lua
// (wilson_torch_lock_1/wilson_beard_lock_1): "unlock after N skills activated in
// this same branch" via SkillTreeFns.CountTags. Vanilla's other lock types
// (boss-kill flags, lunar/shadow allegiance) are specific to base-game systems
// and don't generalize to a modded character.
export const skillTreeNodeSchema = z.object({
  id: luaIdentifier,
  title: z.string().min(1, 'Required'),
  desc: z.string().min(1, 'Required'),
  // An untouched <input> submits "" (react-hook-form reads the live DOM value,
  // not the missing default) — map that back to undefined so "left blank"
  // reads as "no tag" instead of failing validation. `.optional()` must wrap
  // the transform (not the other way around) to keep the property itself
  // optional in the inferred type.
  addsTag: z
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
  gatedAfterBranchSkills: z.number().int().min(1).optional(),
})

export const skillTreeBranchSchema = z.object({
  name: z
    .string()
    .min(1, 'Required')
    .regex(/^[a-z][a-z0-9_]*$/, 'Use only lowercase letters, numbers, and "_", starting with a letter'),
  nodes: z.array(skillTreeNodeSchema).min(1, 'Add at least one skill'),
})

// generateSkillTreeFile keys each Lua table entry as `${characterId}_${node.id}`,
// with no branch component in that key (see skillTree.ts) — two nodes sharing an
// id, even across different branches, collide into one Lua table entry and the
// second silently overwrites the first at runtime, with no build-time error.
export const skillTreeSchema = z
  .object({
    branches: z.array(skillTreeBranchSchema).min(1, 'Add at least one branch'),
  })
  .refine(
    (tree) => {
      const ids = tree.branches.flatMap((branch) => branch.nodes.map((node) => node.id))
      return new Set(ids).size === ids.length
    },
    {
      message: 'Two skills share the same id — each skill id must be unique across the whole tree, not just within its branch.',
      path: ['branches'],
    },
  )

export const characterDefSchema = z.object({
  id: luaIdentifier,
  gender: z.enum(CHARACTER_GENDERS),
  title: z.string().min(1, 'Required'),
  name: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  quote: z.string().min(1, 'Required'),
  stats: z.object({
    health: z.number().int().min(1),
    hunger: z.number().int().min(1),
    sanity: z.number().int().min(1),
  }),
  startingInventory: z.array(z.string().min(1)),
  speechOverrides: z.record(z.string(), z.string()),
  perks: z.array(z.enum(CHARACTER_PERKS)),
  damageMultiplier: z.number().min(0.01).max(5).optional(),
  hungerRateMultiplier: z.number().min(0).max(5).optional(),
  walkSpeedMultiplier: z.number().min(0.1).max(5).optional(),
  foodTypeAffinities: z.array(foodTypeAffinitySchema),
  skillTree: skillTreeSchema.optional(),
})

// Unlike items (where "idle" is near-universal across every inventory build), creature
// builds vary a lot in exactly which animation clip names they ship, and this tool has
// no way to verify that against the actual game files — so the clip names are always
// user-editable, defaulting to the same names the 'custom' stategraph already expects.
export const creatureAnimationClipsSchema = z.object({
  idle: z.string().min(1, 'Required'),
  walk: z.string().min(1, 'Required'),
  atk: z.string().min(1, 'Required'),
  hit: z.string().min(1, 'Required'),
  death: z.string().min(1, 'Required'),
})

export const creatureAnimationSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('custom') }),
  z.object({
    source: z.literal('vanilla'),
    build: z.string().min(1, 'Choose an animation'),
    clips: creatureAnimationClipsSchema,
  }),
])

// Builds commonly cited in the DST modding community as safe to reuse for a simple
// custom hostile mob (idle/walk/atk/hit/death). Not verified against the live game
// files — always confirm each clip plays correctly in-game before publishing.
export const VANILLA_CREATURE_BUILDS = [
  { build: 'spider', label: 'Spider' },
  { build: 'hound', label: 'Hound' },
] as const

export const creatureDefSchema = z.object({
  id: luaIdentifier,
  displayName: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  animation: creatureAnimationSchema.optional(),
  stats: z.object({
    health: z.number().int().min(1),
    damage: z.number().min(0),
    attackPeriod: z.number().min(0.1),
    walkSpeed: z.number().min(0.1),
    attackRange: z.number().min(0.5).max(20).optional(),
  }),
  loot: z.array(z.object({ prefab: z.string().min(1), chance: z.number().min(0.01).max(1) })),
  behavior: z.enum(CREATURE_BEHAVIORS),
  tags: z.array(z.string().min(1)),
  sanityAura: z.number().optional(),
  flammable: z.boolean().optional(),
  freezable: z.boolean().optional(),
  cookable: z.object({ product: z.string().min(1, 'Enter the resulting prefab (e.g. cookedsmallmeat)') }).optional(),
  // Adapted from a real published Workshop mod ("Seafellow", see
  // docs/dst-knowledge/patterns.md#27) — confirmed real API: herdmember (on
  // the creature) + a companion, non-networked "herd" manager prefab that
  // periodically spawns new members up to a max size (the same pattern
  // vanilla Beefalo/Lightning Goats use). Dropped the mating-season-specific
  // tuning from the source mod — just a plain min/max spawn interval.
  herd: z
    .object({
      maxSize: z.number().int().min(2).max(30),
      gatherRange: z.number().min(1).max(100),
      spawnIntervalDays: z
        .object({ min: z.number().min(0.05), max: z.number().min(0.05) })
        .refine((r) => r.max >= r.min, { message: 'Max must be greater than or equal to the min', path: ['max'] }),
    })
    .optional(),
})

export const modProjectSchema = z.object({
  meta: modMetaSchema,
  items: z.array(itemDefSchema),
  characters: z.array(characterDefSchema),
  creatures: z.array(creatureDefSchema),
  rooms: z.array(roomDefSchema),
  tasks: z.array(taskDefSchema),
})

export type TechLevel = (typeof TECH_LEVELS)[number]
export type RecipeFilter = (typeof RECIPE_FILTERS)[number]
export type FoodType = (typeof FOOD_TYPES)[number]
export type OnEatBuff = z.infer<typeof onEatBuffSchema>
export type CharacterGender = (typeof CHARACTER_GENDERS)[number]
export type CreatureBehavior = (typeof CREATURE_BEHAVIORS)[number]
export type CharacterPerk = (typeof CHARACTER_PERKS)[number]

export type ConfigOption = z.infer<typeof configOptionSchema>
export type ItemAnimation = z.infer<typeof itemAnimationSchema>
export type SpellbookSpell = z.infer<typeof spellbookSpellSchema>
export type Spellbook = z.infer<typeof spellbookSchema>
export type ContainerWidget = z.infer<typeof containerWidgetSchema>
export type Container = z.infer<typeof containerSchema>
export type FoodTypeAffinity = z.infer<typeof foodTypeAffinitySchema>
export type SkillTreeNode = z.infer<typeof skillTreeNodeSchema>
export type SkillTreeBranch = z.infer<typeof skillTreeBranchSchema>
export type SkillTree = z.infer<typeof skillTreeSchema>
export type CreatureAnimation = z.infer<typeof creatureAnimationSchema>
export type ModMeta = z.infer<typeof modMetaSchema>
export type Ingredient = z.infer<typeof ingredientSchema>
export type ItemDef = z.infer<typeof itemDefSchema>
export type CharacterDef = z.infer<typeof characterDefSchema>
export type CreatureDef = z.infer<typeof creatureDefSchema>
export type ModProject = z.infer<typeof modProjectSchema>

export function createEmptyModProject(): ModProject {
  return {
    meta: {
      name: '',
      description: '',
      author: '',
      version: '1.0.0',
      allClientsRequireMod: true,
      configOptions: [],
    },
    items: [],
    characters: [],
    creatures: [],
    rooms: [],
    tasks: [],
  }
}
