import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const teleportGate: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Teleport Gate',
    description: 'A pair of stone gates that link to each other — walk into one, step out the other.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  structures: [
    {
      id: 'teleportgate',
      displayName: 'Teleport Gate',
      description: 'Carved with symbols that seem to shift when you look away.',
      animation: { source: 'vanilla', build: 'wormhole' },
      loot: [],
      teleportPair: true,
      recipe: {
        ingredients: [
          { prefab: 'purplegem', amount: 2 },
          { prefab: 'boards', amount: 4 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC', 'STRUCTURES'],
      },
    },
  ],
}
