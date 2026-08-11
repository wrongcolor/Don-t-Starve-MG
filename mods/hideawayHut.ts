import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const hideawayHut: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Hideaway Hut',
    description: 'A small hut with a door — walk through it and find a hidden room inside.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  structures: [
    {
      id: 'hideawayhut',
      displayName: 'Hideaway Hut',
      description: 'Looks small on the outside. Bigger on the inside.',
      animation: { source: 'vanilla', build: 'pig_house' },
      loot: [{ prefab: 'boards', chance: 0.5 }],
      interior: { size: 'tiny', decorations: [{ prefab: 'deco_roomglow', xOffset: 0, zOffset: 0 }] },
      recipe: {
        ingredients: [
          { prefab: 'boards', amount: 4 },
          { prefab: 'rope', amount: 2 },
          { prefab: 'cutstone', amount: 2 },
        ],
        techLevel: 'NONE',
        filters: ['STRUCTURES'],
      },
    },
  ],
}
