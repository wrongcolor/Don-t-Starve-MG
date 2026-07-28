import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const spikeRod: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Spike Rod',
    description: 'A rod that erupts a ring of hardened sand spikes and walls wherever it is aimed.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'spikerod',
      displayName: 'Spike Rod',
      description: 'Slam it into the ground to erupt a ring of hardened sand spikes.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'rocks' },
      finiteuses: { maxUses: 8 },
      groundAttack: { spikeCount: 6, wallCount: 3, radius: 5 },
      recipe: {
        ingredients: [
          { prefab: 'flint', amount: 4 },
          { prefab: 'rocks', amount: 4 },
        ],
        techLevel: 'NONE',
        filters: ['MAGIC'],
      },
    },
  ],
}
