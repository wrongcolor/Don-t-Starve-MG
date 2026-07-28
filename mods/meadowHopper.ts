import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const meadowHopper: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Meadow Hopper',
    description: 'A gentle, harmless critter that follows you around, chopping trees and collecting items.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
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
}
