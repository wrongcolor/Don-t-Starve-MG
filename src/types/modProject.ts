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

export const CHARACTER_PERKS = [
  'no_hunger',
  'no_sanity_drain',
  'fire_immune',
  'freeze_immune',
  'night_vision',
  'faster_walk',
] as const

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

// Keys of the game's FOODTYPE table (constants.lua) — used by the "edible" component
// to gate which characters/creatures will eat an item (e.g. Wormwood only eats VEGGIE).
export const FOOD_TYPES = ['GENERIC', 'MEAT', 'VEGGIE', 'GOODIES', 'ELEMENTAL', 'SEEDS'] as const

export const edibleSchema = z.object({
  foodType: z.enum(FOOD_TYPES),
  healthValue: z.number(),
  hungerValue: z.number(),
  sanityValue: z.number(),
})

// NOT confirmed against a local copy of the game scripts (see docs/dst-knowledge/README.md —
// this sandbox has no game install to grep). Based on the publicly documented modding API:
// edible.oneatenfn as an eat-time callback, and combat.externaldamagemultipliers (a
// SourceModifierList) for a stacking, removable damage bonus. Verify in-game before shipping.
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
      .optional(),
    finiteuses: z
      .object({
        maxUses: z.number().int().min(1),
        ignoreCombatDurabilityLoss: z.boolean().optional(),
      })
      .optional(),
    armor: z
      .object({
        absorption: z.number().min(0.01).max(1),
        flammable: z.boolean().optional(),
        dapperness: z.number().optional(),
        weakness: z.object({ tag: z.string().min(1), extraDamage: z.number().min(0) }).optional(),
        sanityLossOnHitPercent: z.number().min(0).max(1).optional(),
      })
      .optional(),
    equipWalkSpeedMult: z.number().min(0.1).max(3).optional(),
    spellEffect: z.enum(SPELL_EFFECTS).optional(),
    edible: edibleSchema.optional(),
    onEatBuff: onEatBuffSchema.optional(),
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
