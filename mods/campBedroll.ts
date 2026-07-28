import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const campBedroll: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Camp Bedroll',
    description: 'Sleep in it at night to recover health, hunger and sanity — wears out after a few uses.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  structures: [
    {
      id: 'campbedroll',
      displayName: 'Camp Bedroll',
      description: 'A worn-in bedroll. Better than the cold ground.',
      animation: { source: 'vanilla', build: 'tent' },
      loot: [{ prefab: 'silk', chance: 0.3 }],
      restStation: { sleepPhase: 'night', healthPerTick: 2, hungerPerTick: -1, sanityPerTick: 3, maxUses: 5 },
      recipe: {
        ingredients: [
          { prefab: 'silk', amount: 6 },
          { prefab: 'twigs', amount: 4 },
        ],
        techLevel: 'NONE',
        filters: ['STRUCTURES'],
      },
    },
  ],
}
