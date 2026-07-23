import type { ModProject } from '../src/types/modProject'

// Mod 8 (mods/README.md): a friendly counterpart to bogLurker — a passive
// creature that never fights (damage 0, no kiting: kiting requires
// neutral/hostile per the schema refine in creatureDefSchema). No animation
// field at all, so it reuses the tool's default build ("pigman" — see
// creatureAnimation.ts), no custom art required. Demonstrates the companion
// feature end-to-end: it always follows the nearest player, and chops nearby
// trees / collects nearby loose items on top of that (simplified from the
// real leader-assist system — see COMPANION_TASKS in modProject.ts for what's
// dropped). Also still forms herds in the wild (patterns.md#27) and keeps a
// soothing sanityAura + flees if set on fire, from the original version of
// this mod.
export const meadowHopper: ModProject = {
  meta: {
    name: 'Meadow Hopper',
    description: 'A gentle, harmless critter that follows you around, chopping trees and collecting items.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [],
  structures: [],
  characters: [],
  creatures: [
    {
      id: 'meadowhopper',
      displayName: 'Meadow Hopper',
      description: 'A gentle critter that loves to help out around camp.',
      stats: { health: 20, damage: 0, attackPeriod: 3, walkSpeed: 3 },
      loot: [{ prefab: 'poop', chance: 1 }],
      behavior: 'passive',
      tags: [],
      sanityAura: 3,
      flammable: true,
      panicCauses: ['onFire'],
      herd: { maxSize: 6, gatherRange: 20, spawnIntervalDays: { min: 3, max: 5 } },
      companion: { followDistance: 5, tasks: ['chopTrees', 'collectItems'] },
    },
  ],
  rooms: [],
  tasks: [],
  staticLayouts: [],
}
