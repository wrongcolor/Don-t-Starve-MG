import { z } from 'zod'
import { luaIdentifier } from './luaIdentifier'

// Real, confirmed event: TheWorld:ListenForEvent("phasechanged", ...), data.newphase
// (already reused by StructureDef.daySpawner in structure.ts). "day"/"dusk"/"night"
// cover amanhecer/entardecer/anoitecer.
export const WORLD_EVENT_PHASES = ['day', 'dusk', 'night'] as const

// Real, confirmed event: TheWorld:ListenForEvent("moonphasechanged2", ...),
// data.moonphase (components/worldstate.lua). Only "full"/"new" are ever checked
// anywhere in the real game scripts — kept to just those two confirmed values.
export const WORLD_EVENT_MOON_PHASES = ['full', 'new'] as const

const countRangeSchema = z
  .object({ min: z.number().int().min(1), max: z.number().int().min(1) })
  .refine((r) => r.max >= r.min, { message: 'Max must be greater than or equal to the min', path: ['max'] })

// Every kind below is backed by a confirmed real event (checked directly against
// Original/ before adding it here — see docs/dst-knowledge/patterns.md conventions):
//  - phaseChange/moonPhase: world-scoped (TheWorld), not tied to any one player.
//  - the rest: player-scoped, confirmed real events pushed onto the player itself
//    (components/combat.lua's "killed", components/eater.lua's "oneat",
//    components/builder.lua's "makerecipe", components/pickable.lua's "picksomething",
//    and the standard "death" event every player fires via player_common.lua).
export const worldEventTriggerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('phaseChange'), phase: z.enum(WORLD_EVENT_PHASES) }),
  z.object({ kind: z.literal('moonPhase'), moonPhase: z.enum(WORLD_EVENT_MOON_PHASES) }),
  z.object({ kind: z.literal('playerDeath') }),
  z.object({ kind: z.literal('killCreature'), prefabId: z.string().min(1, 'Enter the creature prefab to watch for (e.g. spider)') }),
  // No .min(1): an omitted prefabId means "any food" (data.food is checked only when set).
  z.object({ kind: z.literal('eatItem'), prefabId: z.string().optional() }),
  z.object({ kind: z.literal('craftItem'), prefabId: z.string().min(1, 'Enter the item/structure prefab this recipe produces') }),
  z.object({ kind: z.literal('harvestItem'), prefabId: z.string().min(1, 'Enter the pickable prefab to watch for (e.g. sapling)') }),
])

export const worldEventSpawnEntrySchema = z.object({
  prefabId: z.string().min(1, 'Enter a prefab id (e.g. one of this mod\'s own creatures)'),
  count: countRangeSchema,
})

// A World Event has no structure of its own to be built — it's a standalone
// TheWorld/player-level trigger, same as the real piratespawner.lua (a
// TheWorld component, not anchored to any placed prefab) that a chance of
// spawning a group of prefabs together near a player, optionally with some
// loot dropped alongside them.
export const worldEventDefSchema = z.object({
  id: luaIdentifier,
  displayName: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  trigger: worldEventTriggerSchema,
  chance: z.number().min(0.01).max(1),
  spawnRadius: z.number().min(1).max(60),
  spawnGroup: z.array(worldEventSpawnEntrySchema).min(1, 'Add at least 1 prefab to spawn'),
  loot: z.array(z.object({ prefab: z.string().min(1), chance: z.number().min(0.01).max(1) })),
})

export type WorldEventPhase = (typeof WORLD_EVENT_PHASES)[number]
export type WorldEventMoonPhase = (typeof WORLD_EVENT_MOON_PHASES)[number]
export type WorldEventTrigger = z.infer<typeof worldEventTriggerSchema>
export type WorldEventSpawnEntry = z.infer<typeof worldEventSpawnEntrySchema>
export type WorldEventDef = z.infer<typeof worldEventDefSchema>

export function createEmptyWorldEvent(): WorldEventDef {
  return {
    id: '',
    displayName: '',
    description: '',
    trigger: { kind: 'phaseChange', phase: 'dusk' },
    chance: 0.3,
    spawnRadius: 20,
    spawnGroup: [],
    loot: [],
  }
}
