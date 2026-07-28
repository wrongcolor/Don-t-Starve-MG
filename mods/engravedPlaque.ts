import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const engravedPlaque: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Engraved Plaque',
    description: 'A decorative plaque you can carve your own name or message into.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'engravedplaque',
      displayName: 'Engraved Plaque',
      description: 'Blank, waiting for the right words.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'cutstone' },
      nameable: true,
      recipe: {
        ingredients: [
          { prefab: 'cutstone', amount: 1 },
          { prefab: 'goldnugget', amount: 1 },
        ],
        techLevel: 'NONE',
        filters: ['DECOR'],
      },
    },
  ],
}
