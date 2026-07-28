import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const wrongcolor: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Wrongcolor',
    description: 'A rogue who plays by his own rules.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'shiv',
      displayName: 'Shiv',
      description: 'Quick, quiet, and easy to hide.',
      category: 'weapon',
      animation: { source: 'vanilla', build: 'flint' },
      weapon: { damage: 20 },
      finiteuses: { maxUses: 30 },
      recipe: {
        ingredients: [
          { prefab: 'flint', amount: 2 },
          { prefab: 'twigs', amount: 1 },
        ],
        techLevel: 'NONE',
        filters: ['WEAPONS'],
      },
    },
    {
      id: 'throwingknife',
      displayName: 'Throwing Knife',
      description: "Aim true. You won't get this one back.",
      category: 'weapon',
      animation: { source: 'vanilla', build: 'flint' },
      weapon: { damage: 15, ranged: { minRange: 4, maxRange: 8, projectilePrefab: 'blowdart_dart' } },
      finiteuses: { maxUses: 10 },
      recipe: {
        ingredients: [
          { prefab: 'flint', amount: 1 },
          { prefab: 'twigs', amount: 1 },
        ],
        techLevel: 'NONE',
        filters: ['WEAPONS'],
      },
    },
  ],
  characters: [
    {
      id: 'wrongcolor',
      gender: 'NEUTRAL',
      title: 'the Rogue',
      name: 'Wrongcolor',
      description: 'Never quite where you last saw him.',
      quote: "Rules are just suggestions I haven't broken yet.",
      stats: { health: 100, hunger: 150, sanity: 200 },
      startingInventory: ['shiv', 'throwingknife'],
      speechOverrides: {},
      perks: [],
      foodTypeAffinities: [],
      backstab: { multiplier: 3, arcDegrees: 90, bonusWhenTargetDistracted: true },
    },
  ],
}
