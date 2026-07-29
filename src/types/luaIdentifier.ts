import { z } from 'zod'

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

// Shared by every entity kind that generates its own Lua prefab/local function
// names off its id (items, structures, characters, creatures, world events) —
// pulled out of modProject.ts so worldEvent.ts (and any future sibling type file)
// can reuse it without importing back from modProject.ts and creating a cycle.
export const luaIdentifier = z
  .string()
  .min(2, 'Use at least 2 characters')
  .max(32, 'Use at most 32 characters')
  .regex(/^[a-z][a-z0-9_]*$/, 'Use only lowercase letters, numbers, and "_", starting with a letter')
  .refine((id) => !RESERVED_PREFAB_IDS.has(id), {
    message: 'This id collides with a base-game prefab — choose another one',
  })
