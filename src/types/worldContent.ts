import { z } from 'zod'

// World-generation content (Rooms/Tasks) is a different modding surface than
// items/characters/creatures — see docs/dst-knowledge/patterns.md#16 for the
// research behind this file. Room/Task ids are free-form strings used as Lua
// table keys (the real game uses ids like "Make a pick"), NOT lua-identifier
// constrained like item/creature ids — always escape them via luaString().
const worldContentId = z.string().min(1, 'Obrigatório').max(64, 'Use no máximo 64 caracteres')

// Ground tile types confirmed by reading real room/task definitions
// (rooms.lua, rooms/forest/pigs.lua, tasks/forest.lua, ocean_gen_config.lua).
// This is a curated subset, not the full WORLD_TILES enum (which we don't have
// a complete reference for) — covers the common land + ocean tiles seen in use.
export const WORLD_TILES = [
  { value: 'GRASS', label: 'Grama' },
  { value: 'FOREST', label: 'Floresta' },
  { value: 'ROCKY', label: 'Rochoso' },
  { value: 'SAVANNA', label: 'Savana' },
  { value: 'IMPASSABLE', label: 'Intransponível' },
  { value: 'PEBBLEBEACH', label: 'Praia de seixos' },
  { value: 'METEOR', label: 'Meteoro (Ilha da Lua)' },
  { value: 'OCEAN_COASTAL', label: 'Oceano costeiro' },
  { value: 'OCEAN_SWELL', label: 'Oceano — ondulação' },
  { value: 'OCEAN_ROUGH', label: 'Oceano agitado' },
  { value: 'OCEAN_HAZARDOUS', label: 'Oceano perigoso' },
  { value: 'OCEAN_BRINEPOOL', label: 'Poça salgada' },
] as const

// Full list confirmed in lockandkey.lua (LOCKS_ARRAY). Locks gate a Task behind
// needing specific Keys from already-unlocked tasks (see patterns.md#16).
export const LOCKS = [
  'NONE', 'PIGGIFTS', 'TREES', 'SPIDERDENS', 'ROCKS', 'FARM', 'MEAT', 'BEEHIVE',
  'KILLERBEES', 'PIGKING', 'MONSTERS_DEFEATED', 'HARD_MONSTERS_DEFEATED',
  'SPIDERS_DEFEATED', 'BASIC_COMBAT', 'ADVANCED_COMBAT', 'ONLYTIER1', 'TIER0',
  'TIER1', 'TIER2', 'TIER3', 'TIER4', 'TIER5', 'TIER6', 'ANYTIER', 'INNERTIER',
  'OUTERTIER', 'LIGHT', 'FUNGUS', 'CAVE', 'LABYRINTH', 'WILDS', 'RUINS', 'SACRED',
  'BADLANDS', 'HOUNDS', 'ENTRANCE_INNER', 'ENTRANCE_OUTER', 'MUSHROOM', 'RABBIT',
  'PASSAGE', 'AREA', 'CAVERN', 'SINKHOLE', 'BATS', 'EASY', 'MEDIUM', 'HARD',
  'BLUE', 'RED', 'GREEN', 'MOONMUSH', 'ARCHIVE', 'QUAGMIRE_GATEWAY',
  'QUAGMIRE_PARK_L1', 'QUAGMIRE_FOOD_L1', 'QUAGMIRE_TRIBE', 'QUAGMIRE_GIANT',
  'ISLAND_TIER1', 'ISLAND_TIER2', 'ISLAND_TIER3', 'ISLAND_TIER4',
] as const

// Full list confirmed in lockandkey.lua (KEYS_ARRAY). A task's keys_given become
// available to unlock OTHER tasks' locks once this task is generated.
export const KEYS = [
  'NONE', 'PICKAXE', 'AXE', 'GRASS', 'STONE', 'WOOD', 'MEAT', 'PIGS', 'FIRE',
  'POOP', 'WOOL', 'FARM', 'HONEY', 'GOLD', 'BEEHAT', 'TRINKETS', 'HARD_WALRUS',
  'HARD_SPIDERS', 'HARD_HOUNDS', 'HARD_MERMS', 'HARD_TENTACLES', 'WALRUS',
  'SPIDERS', 'HOUNDS', 'MERMS', 'GEARS', 'CHESSMEN', 'TENTACLES', 'TIER0',
  'TIER1', 'TIER2', 'TIER3', 'TIER4', 'TIER5', 'TIER6', 'LIGHT', 'FUNGUS',
  'CAVE', 'LABYRINTH', 'WILDS', 'RUINS', 'SACRED', 'BADLANDS', 'ENTRANCE_INNER',
  'ENTRANCE_OUTER', 'MUSHROOM', 'RABBIT', 'PASSAGE', 'AREA', 'CAVERN',
  'SINKHOLE', 'BATS', 'EASY', 'MEDIUM', 'HARD', 'BLUE', 'RED', 'GREEN',
  'MOONMUSH', 'ARCHIVE', 'QUAGMIRE_GATEWAY', 'QUAGMIRE_PARK_L1',
  'QUAGMIRE_FOOD_L1', 'QUAGMIRE_TRIBE', 'QUAGMIRE_GIANT', 'ISLAND_TIER1',
  'ISLAND_TIER2', 'ISLAND_TIER3', 'ISLAND_TIER4',
] as const

const countRangeSchema = z
  .object({ min: z.number().int().min(0), max: z.number().int().min(0) })
  .refine((r) => r.max >= r.min, { message: 'Máximo precisa ser maior ou igual ao mínimo', path: ['max'] })

export const roomDefSchema = z.object({
  id: worldContentId,
  terrain: z.enum(WORLD_TILES.map((t) => t.value) as [string, ...string[]]),
  tags: z.array(z.string().min(1)),
  requiredPrefabs: z.array(z.string().min(1)),
  fixedPrefabs: z.array(z.object({ prefab: z.string().min(1), count: countRangeSchema })),
  scatter: z
    .object({
      percent: z.number().min(0).max(1),
      prefabs: z.array(z.object({ prefab: z.string().min(1), weight: z.number().min(0.001) })).min(1),
    })
    .optional(),
})

export const taskDefSchema = z.object({
  id: worldContentId,
  locks: z.array(z.enum(LOCKS.map((l) => l) as [string, ...string[]])),
  keysGiven: z.array(z.enum(KEYS.map((k) => k) as [string, ...string[]])),
  roomChoices: z.array(z.object({ roomId: z.string().min(1), count: countRangeSchema })).min(1, 'Adicione pelo menos 1 sala'),
  backgroundTerrain: z.enum(WORLD_TILES.map((t) => t.value) as [string, ...string[]]),
  // No .min(1): an always-rendered, never-typed-in <input> submits '' (empty string),
  // not undefined, and a .transform() here would fight zodResolver's input/output
  // typing. The generator treats a falsy value ('' or undefined) as "not set".
  backgroundRoom: z.string().optional(),
  // Grouping multiple Tasks under the same regionId keeps them together as one
  // detached landmass connected to the mainland by a single crossing — this is
  // exactly how the vanilla Lunar Island is built (region_id = "island1" across
  // 5 tasks). See docs/dst-knowledge/patterns.md#17.
  regionId: z.string().min(1).optional(),
})

export type RoomDef = z.infer<typeof roomDefSchema>
export type TaskDef = z.infer<typeof taskDefSchema>

export function createEmptyRoom(): RoomDef {
  return {
    id: '',
    terrain: 'GRASS',
    tags: [],
    requiredPrefabs: [],
    fixedPrefabs: [],
  }
}

export function createEmptyTask(): TaskDef {
  return {
    id: '',
    locks: ['NONE'],
    keysGiven: [],
    roomChoices: [],
    backgroundTerrain: 'GRASS',
    backgroundRoom: undefined,
  }
}
