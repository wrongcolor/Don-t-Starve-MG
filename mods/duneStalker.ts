import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const duneStalker: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Dune Stalker',
    description: 'A hostile creature that erupts sand spikes and walls around itself while fighting.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  creatures: [
    {
      id: 'dunestalker',
      displayName: 'Dune Stalker',
      description: 'Something moves just beneath the sand.',
      animation: {
        source: 'vanilla',
        build: 'spider',
        clips: { idle: 'idle', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' },
      },
      stats: { health: 150, damage: 25, attackPeriod: 3, walkSpeed: 4 },
      loot: [{ prefab: 'flint', chance: 1 }],
      behavior: 'hostile',
      tags: [],
      panicCauses: [],
      groundAttack: { spikeCount: 6, wallCount: 2, radius: 6, cooldownSeconds: 15 },
    },
  ],
}
