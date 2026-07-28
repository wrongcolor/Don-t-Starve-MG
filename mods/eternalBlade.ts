import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const eternalBlade: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Eternal Blade',
    description: 'A melee weapon that never wears down.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'eternalblade',
      displayName: 'Eternal Blade',
      description: 'A blade that never dulls.',
      category: 'weapon',
      weapon: { damage: 45, meleeRange: 3 },
      recipe: {
        ingredients: [{ prefab: 'goldnugget', amount: 4 }, { prefab: 'purplegem', amount: 1 }],
        techLevel: 'MAGIC_TWO',
        filters: ['WEAPONS'],
      },
    },
  ],
}
