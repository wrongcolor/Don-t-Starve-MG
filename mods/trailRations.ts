import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const trailRations: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Trail Rations',
    description: 'Stackable dried meat that keeps you moving — heals a little and hits harder for a while after eating.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'trailrations',
      displayName: 'Trail Rations',
      description: 'Dried and salted. Keeps for a while.',
      category: 'food',
      animation: { source: 'vanilla', build: 'jerky' },
      stackable: { maxSize: 20 },
      perishable: { perishTimeDays: 8 },
      edible: { foodType: 'MEAT', healthValue: 8, hungerValue: 25, sanityValue: 0 },
      onEatBuff: { damageMultiplier: 0.2, durationSeconds: 180 },
      recipe: {
        ingredients: [
          { prefab: 'monstermeat', amount: 2 },
          { prefab: 'twigs', amount: 1 },
        ],
        techLevel: 'NONE',
        filters: ['COOKING'],
      },
    },
  ],
}
