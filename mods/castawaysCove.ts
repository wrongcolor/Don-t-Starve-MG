import type { ModProject } from '../src/types/modProject'

// A small shipwreck island, separate from the mainland (same region_id mechanism
// as alchemistIsland.ts / vanilla Lunar Island, patterns.md#17). Pebble-beach
// terrain, a guaranteed chest of shipwreck loot + a rock formation to mine, and a
// scatter of gold/gems washed up on the shore. Reuses vanilla prefabs only.
export const castawaysCove: ModProject = {
  meta: {
    name: "Castaway's Cove",
    description: 'A small shipwrecked island, separate from the mainland, with a rock formation and washed-up treasure.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [],
  structures: [],
  characters: [],
  creatures: [],
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
  staticLayouts: [],
}
