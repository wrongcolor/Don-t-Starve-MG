import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const alchemistIsland: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: "Alchemist's Refuge",
    description: 'A small island, separate from the mainland, with a Prestihatitator and a chest.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  rooms: [
    {
      id: 'AlchemistGrove',
      terrain: 'GRASS',
      tags: [],
      requiredPrefabs: [],
      fixedPrefabs: [
        { prefab: 'prestihatitator', count: { min: 1, max: 1 } },
        { prefab: 'treasurechest', count: { min: 1, max: 1 } },
      ],
      staticLayouts: [],
    },
  ],
  tasks: [
    {
      id: 'Alchemist Island',
      locks: ['NONE'],
      keysGiven: [],
      roomChoices: [{ roomId: 'AlchemistGrove', count: { min: 1, max: 1 } }],
      backgroundTerrain: 'GRASS',
      backgroundRoom: undefined,
      regionId: 'alchemistisland1',
      locations: ['forest'],
      colour: { r: 0, g: 1, b: 0, a: 1 },
    },
  ],
}
