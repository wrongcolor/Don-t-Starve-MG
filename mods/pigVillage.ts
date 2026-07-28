import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const pigVillage: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Pig Village',
    description: 'Small houses that always have someone home, reusing a real Island Adventures creature build.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  structures: [
    {
      id: 'villagerhouse',
      displayName: 'Villager House',
      description: 'Small, tidy, and someone is always home.',
      animation: { source: 'vanilla', build: 'pig_house' },
      loot: [{ prefab: 'boards', chance: 0.5 }],
      resident: { prefab: 'villager', respawnDelayDays: 3 },
      recipe: {
        ingredients: [
          { prefab: 'boards', amount: 4 },
          { prefab: 'cutstone', amount: 2 },
        ],
        techLevel: 'NONE',
        filters: ['STRUCTURES'],
      },
    },
  ],
  creatures: [
    {
      id: 'villager',
      displayName: 'Villager',
      description: 'Keeps to himself, mostly.',
      animation: {
        source: 'islandAdventuresShipwrecked',
        build: 'wildbore_build',
        bank: 'pigman',
        clips: { idle: 'idle', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' },
      },
      stats: { health: 100, damage: 20, attackPeriod: 2, walkSpeed: 3 },
      loot: [{ prefab: 'meat', chance: 1 }],
      behavior: 'neutral',
      tags: [],
      panicCauses: [],
    },
  ],
}
