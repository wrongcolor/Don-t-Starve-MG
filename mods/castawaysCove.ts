import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const castawaysCove: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: "Castaway's Cove",
    description: 'A small shipwrecked island, separate from the mainland, with a rock formation and washed-up treasure.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  rooms: [
    {
      id: 'CastawayShore',
      terrain: 'PEBBLEBEACH',
      tags: [],
      requiredPrefabs: [],
      fixedPrefabs: [
        { prefab: 'treasurechest', count: { min: 1, max: 1 } },
        { prefab: 'rocks', count: { min: 3, max: 6 } },
      ],
      scatter: {
        percent: 0.12,
        prefabs: [
          { prefab: 'goldnugget', weight: 1 },
          { prefab: 'flint', weight: 1 },
          { prefab: 'redgem', weight: 0.3 },
          { prefab: 'bluegem', weight: 0.3 },
        ],
      },
      staticLayouts: [],
    },
  ],
  tasks: [
    {
      id: "Castaway's Cove",
      locks: ['NONE'],
      keysGiven: [],
      roomChoices: [{ roomId: 'CastawayShore', count: { min: 1, max: 1 } }],
      backgroundTerrain: 'PEBBLEBEACH',
      backgroundRoom: undefined,
      regionId: 'castawayscove1',
      locations: ['forest'],
      colour: { r: 0, g: 0.6, b: 1, a: 1 },
    },
  ],
}
