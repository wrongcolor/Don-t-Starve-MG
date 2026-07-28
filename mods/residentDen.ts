import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const residentDen: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Resident Den',
    description: 'A den that houses a friendly guard — if it falls, a new one moves in after a few days.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  structures: [
    {
      id: 'residentden',
      displayName: 'Resident Den',
      description: 'Someone lives here, and keeps watch.',
      animation: { source: 'vanilla', build: 'pighouse' },
      loot: [{ prefab: 'boards', chance: 0.5 }],
      resident: { prefab: 'pigman', respawnDelayDays: 3 },
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
}
