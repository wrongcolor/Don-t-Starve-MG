import { z } from 'zod'

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

export const CREATURE_BEHAVIORS = ['passive', 'neutral', 'hostile'] as const

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
  .min(2, 'Use pelo menos 2 caracteres')
  .max(32, 'Use no máximo 32 caracteres')
  .regex(/^[a-z][a-z0-9_]*$/, 'Use apenas minúsculas, números e "_", começando por letra')
  .refine((id) => !RESERVED_PREFAB_IDS.has(id), {
    message: 'Esse id colide com um prefab do jogo base — escolha outro',
  })

export const configOptionSchema = z.object({
  name: luaIdentifier,
  label: z.string().min(1),
  options: z
    .array(z.object({ description: z.string().min(1), data: z.union([z.string(), z.boolean(), z.number()]) }))
    .min(2, 'Uma config option precisa de pelo menos 2 alternativas'),
  defaultIndex: z.number().int().min(0),
})

export const modMetaSchema = z.object({
  name: z.string().min(1, 'Obrigatório'),
  description: z.string().min(1, 'Obrigatório'),
  author: z.string().min(1, 'Obrigatório'),
  version: z.string().min(1),
  allClientsRequireMod: z.boolean(),
  configOptions: z.array(configOptionSchema),
})

export const ingredientSchema = z.object({
  prefab: z.string().min(1, 'Obrigatório'),
  amount: z.number().int().min(1),
})

export const itemDefSchema = z.object({
  id: luaIdentifier,
  displayName: z.string().min(1, 'Obrigatório'),
  description: z.string().min(1, 'Obrigatório'),
  category: z.enum(['tool', 'weapon', 'armor', 'food', 'generic']),
  stackable: z.object({ maxSize: z.number().int().min(2).max(99) }).optional(),
  perishable: z.object({ perishTimeDays: z.number().min(0.1) }).optional(),
  weapon: z.object({ damage: z.number().min(1) }).optional(),
  finiteuses: z.object({ maxUses: z.number().int().min(1) }).optional(),
  armor: z.object({ absorption: z.number().min(0.01).max(1) }).optional(),
  recipe: z.object({
    ingredients: z.array(ingredientSchema).min(1, 'Adicione pelo menos 1 ingrediente'),
    techLevel: z.enum(TECH_LEVELS),
    filters: z.array(z.enum(RECIPE_FILTERS)).min(1, 'Selecione pelo menos uma aba'),
    placer: z.boolean(),
  }),
})

export const characterDefSchema = z.object({
  id: luaIdentifier,
  gender: z.enum(CHARACTER_GENDERS),
  title: z.string().min(1, 'Obrigatório'),
  name: z.string().min(1, 'Obrigatório'),
  description: z.string().min(1, 'Obrigatório'),
  quote: z.string().min(1, 'Obrigatório'),
  stats: z.object({
    health: z.number().int().min(1),
    hunger: z.number().int().min(1),
    sanity: z.number().int().min(1),
  }),
  startingInventory: z.array(z.string().min(1)),
  speechOverrides: z.record(z.string(), z.string()),
  perks: z.array(z.enum(CHARACTER_PERKS)),
})

export const creatureDefSchema = z.object({
  id: luaIdentifier,
  displayName: z.string().min(1, 'Obrigatório'),
  description: z.string().min(1, 'Obrigatório'),
  stats: z.object({
    health: z.number().int().min(1),
    damage: z.number().min(0),
    attackPeriod: z.number().min(0.1),
    walkSpeed: z.number().min(0.1),
  }),
  loot: z.array(z.object({ prefab: z.string().min(1), chance: z.number().min(0.01).max(1) })),
  behavior: z.enum(CREATURE_BEHAVIORS),
  tags: z.array(z.string().min(1)),
})

export const modProjectSchema = z.object({
  meta: modMetaSchema,
  items: z.array(itemDefSchema),
  characters: z.array(characterDefSchema),
  creatures: z.array(creatureDefSchema),
})

export type TechLevel = (typeof TECH_LEVELS)[number]
export type RecipeFilter = (typeof RECIPE_FILTERS)[number]
export type CharacterGender = (typeof CHARACTER_GENDERS)[number]
export type CreatureBehavior = (typeof CREATURE_BEHAVIORS)[number]
export type CharacterPerk = (typeof CHARACTER_PERKS)[number]

export type ConfigOption = z.infer<typeof configOptionSchema>
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
  }
}
