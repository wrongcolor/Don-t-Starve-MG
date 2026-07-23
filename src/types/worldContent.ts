import { z } from 'zod'

// World-generation content (Rooms/Tasks) is a different modding surface than
// items/characters/creatures — see docs/dst-knowledge/patterns.md#16 for the
// research behind this file. Room/Task ids are free-form strings used as Lua
// table keys (the real game uses ids like "Make a pick"), NOT lua-identifier
// constrained like item/creature ids — always escape them via luaString().
const worldContentId = z.string().min(1, 'Required').max(64, 'Use at most 64 characters')

// Ground tile types confirmed by reading real room/task definitions
// (rooms.lua, rooms/forest/pigs.lua, tasks/forest.lua, ocean_gen_config.lua).
// This is a curated subset, not the full WORLD_TILES enum (which we don't have
// a complete reference for) — covers the common land + ocean tiles seen in use.
export const WORLD_TILES = [
  { value: 'GRASS', label: 'Grass' },
  { value: 'FOREST', label: 'Forest' },
  { value: 'ROCKY', label: 'Rocky' },
  { value: 'SAVANNA', label: 'Savanna' },
  { value: 'IMPASSABLE', label: 'Impassable' },
  { value: 'PEBBLEBEACH', label: 'Pebble beach' },
  { value: 'METEOR', label: 'Meteor (Lunar Island)' },
  { value: 'OCEAN_COASTAL', label: 'Ocean — coastal' },
  { value: 'OCEAN_SWELL', label: 'Ocean — swell' },
  { value: 'OCEAN_ROUGH', label: 'Ocean — rough' },
  { value: 'OCEAN_HAZARDOUS', label: 'Ocean — hazardous' },
  { value: 'OCEAN_BRINEPOOL', label: 'Brine pool' },
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
  'BLUE', 'RED', 'GREEN', 'MOONMUSH', 'ARCHIVE', 'CENTIPEDE', 'QUAGMIRE_GATEWAY',
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
  'MOONMUSH', 'ARCHIVE', 'CENTIPEDE', 'QUAGMIRE_GATEWAY', 'QUAGMIRE_PARK_L1',
  'QUAGMIRE_FOOD_L1', 'QUAGMIRE_TRIBE', 'QUAGMIRE_GIANT', 'ISLAND_TIER1',
  'ISLAND_TIER2', 'ISLAND_TIER3', 'ISLAND_TIER4',
] as const

const countRangeSchema = z
  .object({ min: z.number().int().min(0), max: z.number().int().min(0) })
  .refine((r) => r.max >= r.min, { message: 'Max must be greater than or equal to the min', path: ['max'] })

// Closed enum, not free text: storygen.lua indexes each Room tag directly into
// maptags.lua's Tag dictionary and calls the result as a function with no nil
// check — a tag outside this real list crashes world generation entirely
// (attempt to call a nil value), not just silently no-ops. See
// docs/dst-knowledge/patterns.md#53. Excludes ~9 maptags.lua keys tied to
// unique base-game spawns (Chester_Eyebone, Astral_1/2, etc.) that don't make
// sense as a generic form option.
export const ROOM_TAGS = [
  { value: 'Maze', label: 'Maze' },
  { value: 'MazeEntrance', label: 'Maze entrance' },
  { value: 'Labyrinth', label: 'Labyrinth' },
  { value: 'LabyrinthEntrance', label: 'Labyrinth entrance' },
  { value: 'OverrideCentroid', label: 'Override centroid' },
  { value: 'RoadPoison', label: 'Road poison (no roads through here)' },
  { value: 'ForceConnected', label: 'Force connected' },
  { value: 'ForceDisconnected', label: 'Force disconnected' },
  { value: 'OneshotWormhole', label: 'One-shot wormhole' },
  { value: 'ExitPiece', label: 'Exit piece' },
  { value: 'Town', label: 'Town' },
  { value: 'Nightmare', label: 'Nightmare' },
  { value: 'Atrium', label: 'Atrium' },
  { value: 'Mist', label: 'Mist' },
  { value: 'sandstorm', label: 'Sandstorm' },
  { value: 'nohunt', label: 'No hunt' },
  { value: 'moonhunt', label: 'Moon hunt' },
  { value: 'nohasslers', label: 'No hasslers' },
  { value: 'not_mainland', label: 'Not mainland' },
  { value: 'lunacyarea', label: 'Lunacy area' },
  { value: 'GrottoWarEntrance', label: 'Grotto war entrance' },
  { value: 'fumarolearea', label: 'Fumarole area' },
] as const

// Real fixed order from Original/map/map/static_layout.lua's GROUND_TYPES table —
// position (1-based) is the literal value a static layout's tile grid must use to
// mean that terrain; never reorder. IMPASSABLE legitimately repeats 3x in the real
// array; kept as-is (not deduped) so index arithmetic matches the source exactly.
// See docs/dst-knowledge/patterns.md#55.
export const GROUND_TYPES = [
  'IMPASSABLE', 'ROAD', 'ROCKY', 'DIRT', 'SAVANNA', 'GRASS', 'FOREST', 'MARSH',
  'WOODFLOOR', 'CARPET', 'CHECKER', 'CAVE', 'FUNGUS', 'SINKHOLE', 'QUAGMIRE_GATEWAY', 'QUAGMIRE_SOIL',
  'OCEAN_COASTAL_SHORE', 'OCEAN_COASTAL', 'OCEAN_ROUGH', 'OCEAN_BRINEPOOL', 'UNDERROCK', 'MUD', 'QUAGMIRE_PEATFOREST', 'IMPASSABLE',
  'BRICK', 'OCEAN_SWELL', 'TILES', 'OCEAN_HAZARDOUS', 'TRIM', 'IMPASSABLE', 'QUAGMIRE_PARKSTONE', 'QUAGMIRE_PARKFIELD',
  'PEBBLEBEACH', 'METEOR', 'FUNGUSRED', 'FUNGUSGREEN', 'FAKE_GROUND', 'LAVAARENA_FLOOR', 'LAVAARENA_TRIM', 'QUAGMIRE_CITYSTONE',
  'SHELLBEACH', 'ARCHIVE', 'FUNGUSMOON', 'OCEAN_WATERLOG', 'MONKEY_DOCK', 'MONKEY_GROUND', 'MOSAIC_GREY', 'MOSAIC_RED',
  'MOSAIC_BLUE', 'CARPET2', 'VAULT', 'VENT',
] as const

// Curated paintable palette for the static-layout grid editor (same curation spirit
// as WORLD_TILES/ROOM_TAGS above) — a small common subset of the 52 GROUND_TYPES.
// `index` is derived from the real array instead of hardcoded so it can never drift.
export const LAYOUT_TILE_PALETTE = (
  [
    ['GRASS', 'Grass'], ['FOREST', 'Forest'], ['ROCKY', 'Rocky'], ['SAVANNA', 'Savanna'],
    ['DIRT', 'Dirt'], ['MARSH', 'Marsh'], ['CAVE', 'Cave'], ['FUNGUS', 'Fungus'],
    ['WOODFLOOR', 'Wood floor'], ['CARPET', 'Carpet'], ['CHECKER', 'Checker floor'], ['MUD', 'Mud'],
    ['SINKHOLE', 'Sinkhole'], ['PEBBLEBEACH', 'Pebble beach'], ['IMPASSABLE', 'Impassable'],
    ['OCEAN_COASTAL', 'Ocean — coastal'],
  ] as const
).map(([value, label]) => ({ value, label, index: GROUND_TYPES.indexOf(value) + 1 }))

// LAYOUT_POSITION / PLACE_MASK real enums confirmed in Original/scripts/constants.lua.
export const LAYOUT_POSITIONS = [
  { value: 'CENTER', label: 'Centered in the room' },
  { value: 'RANDOM', label: 'Random position in the room' },
] as const

export const PLACE_MASKS = [
  { value: 'NORMAL', label: 'Normal (no exceptions)' },
  { value: 'IGNORE_IMPASSABLE', label: 'Ignore impassable ground' },
  { value: 'IGNORE_BARREN', label: 'Ignore barren ground' },
  { value: 'IGNORE_IMPASSABLE_BARREN', label: 'Ignore impassable + barren ground' },
  { value: 'IGNORE_RESERVED', label: 'Ignore reserved space' },
  { value: 'IGNORE_IMPASSABLE_RESERVED', label: 'Ignore impassable + reserved space' },
  { value: 'IGNORE_BARREN_RESERVED', label: 'Ignore barren + reserved space' },
  { value: 'IGNORE_IMPASSABLE_BARREN_RESERVED', label: 'Ignore impassable + barren + reserved space' },
] as const

export const LAYOUT_GRID_SIZE = { min: 4, max: 24 }

// A static layout is a small hand-placed arrangement of ground tiles + fixed
// prefabs a Room can embed (Room.contents.countstaticlayouts) — confirmed by
// reading a real published mod ("Graveyard Island") end-to-end plus the actual
// engine loader (Original/map/map/static_layout.lua). See patterns.md#55.
export const staticLayoutObjectSchema = z.object({
  prefab: z.string().min(1),
  col: z.number().int().min(0),
  row: z.number().int().min(0),
  // Matches the real dotted-key convention (e.g. properties["data.setepitaph"] =
  // "Bryce") seen in the source mod — stored as flat key/value pairs here and
  // exploded into nested Lua tables by the generator.
  properties: z.array(z.object({ key: z.string().min(1), value: z.string().min(1) })),
})

export const staticLayoutDefSchema = z
  .object({
    id: worldContentId,
    width: z.number().int().min(LAYOUT_GRID_SIZE.min).max(LAYOUT_GRID_SIZE.max),
    height: z.number().int().min(LAYOUT_GRID_SIZE.min).max(LAYOUT_GRID_SIZE.max),
    // Rows of columns; each cell is 0 (no override — the room's own terrain shows
    // through) or a 1-based index into GROUND_TYPES.
    tiles: z.array(z.array(z.number().int().min(0).max(GROUND_TYPES.length))),
    objects: z.array(staticLayoutObjectSchema),
    layoutPosition: z.enum(LAYOUT_POSITIONS.map((p) => p.value) as [string, ...string[]]),
    startMask: z.enum(PLACE_MASKS.map((m) => m.value) as [string, ...string[]]),
    fillMask: z.enum(PLACE_MASKS.map((m) => m.value) as [string, ...string[]]),
  })
  .refine((layout) => layout.tiles.length === layout.height && layout.tiles.every((row) => row.length === layout.width), {
    message: 'Tile grid size does not match width/height',
    path: ['tiles'],
  })

export const roomDefSchema = z.object({
  id: worldContentId,
  terrain: z.enum(WORLD_TILES.map((t) => t.value) as [string, ...string[]]),
  tags: z.array(z.enum(ROOM_TAGS.map((t) => t.value) as [string, ...string[]])),
  requiredPrefabs: z.array(z.string().min(1)),
  fixedPrefabs: z.array(z.object({ prefab: z.string().min(1), count: countRangeSchema })),
  scatter: z
    .object({
      percent: z.number().min(0).max(1),
      prefabs: z.array(z.object({ prefab: z.string().min(1), weight: z.number().min(0.001) })).min(1),
    })
    .optional(),
  // References StaticLayoutDef.id — a Room can embed one or more hand-placed
  // micro-layouts (e.g. a small graveyard clearing) alongside its normal
  // fixedPrefabs/scatter content. See patterns.md#55.
  staticLayouts: z.array(z.object({ layoutId: z.string().min(1), count: countRangeSchema })),
})

// Confirmed in a real published Workshop mod ("Graveyard Island", see
// docs/dst-knowledge/patterns.md#22) — this is the missing piece patterns.md#16
// flagged as unconfirmed: a Task only actually shows up in a generated world if
// something inserts its id into a TaskSet's `self.tasks` for a matching
// `self.location`. The source mod only used "forest"; "cave" is the other
// location the base game's own map/tasksets.lua distinguishes between.
export const TASK_LOCATIONS = [
  { value: 'forest', label: 'Surface (forest)' },
  { value: 'cave', label: 'Caves' },
] as const

// Confirmed in every real AddTask call across scripts/map/tasks/*.lua (e.g.
// forest.lua: colour={r=0,g=1,b=0,a=1}) — storygen.lua:GenerateNodesFromTask
// unconditionally reads task.colour.r/g/b/a with no nil check, so a Task
// without this field crashes world generation outright (attempt to index
// field 'colour' (a nil value)) rather than just missing a debug color.
// Values are 0-1 floats, not 0-255.
export const taskColourSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
  a: z.number().min(0).max(1),
})

export const taskDefSchema = z.object({
  id: worldContentId,
  locks: z.array(z.enum(LOCKS.map((l) => l) as [string, ...string[]])),
  keysGiven: z.array(z.enum(KEYS.map((k) => k) as [string, ...string[]])),
  roomChoices: z.array(z.object({ roomId: z.string().min(1), count: countRangeSchema })).min(1, 'Add at least 1 room'),
  backgroundTerrain: z.enum(WORLD_TILES.map((t) => t.value) as [string, ...string[]]),
  colour: taskColourSchema,
  locations: z
    .array(z.enum(TASK_LOCATIONS.map((l) => l.value) as [string, ...string[]]))
    .min(1, 'Select at least one location, or this Task will never appear in a generated world'),
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
export type TaskColour = z.infer<typeof taskColourSchema>
export type TaskDef = z.infer<typeof taskDefSchema>
export type StaticLayoutObject = z.infer<typeof staticLayoutObjectSchema>
export type StaticLayoutDef = z.infer<typeof staticLayoutDefSchema>

export function createEmptyRoom(): RoomDef {
  return {
    id: '',
    terrain: 'GRASS',
    tags: [],
    requiredPrefabs: [],
    fixedPrefabs: [],
    staticLayouts: [],
  }
}

const DEFAULT_LAYOUT_SIZE = 12

export function createEmptyTileGrid(width: number, height: number): number[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => 0))
}

export function createEmptyStaticLayout(): StaticLayoutDef {
  return {
    id: '',
    width: DEFAULT_LAYOUT_SIZE,
    height: DEFAULT_LAYOUT_SIZE,
    tiles: createEmptyTileGrid(DEFAULT_LAYOUT_SIZE, DEFAULT_LAYOUT_SIZE),
    objects: [],
    layoutPosition: 'CENTER',
    startMask: 'IGNORE_IMPASSABLE_BARREN_RESERVED',
    fillMask: 'IGNORE_IMPASSABLE_BARREN_RESERVED',
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
    locations: ['forest'],
    colour: { r: 0, g: 1, b: 0, a: 1 },
  }
}
