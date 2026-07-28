import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const emberRod: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Ember Rod',
    description: 'A rod that conjures a floating light — never breaks, it just needs time to recharge between uses.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'emberrod',
      displayName: 'Ember Rod',
      description: 'Warm to the touch, even when it is not in use.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'staffs', idleClip: 'firestaff' },
      spellEffect: 'createLight',
      rechargeable: { cooldownSeconds: 45 },
      recipe: {
        ingredients: [
          { prefab: 'twigs', amount: 2 },
          { prefab: 'nightmarefuel', amount: 2 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
  ],
}
