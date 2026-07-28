import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const bogLurker: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Bog Lurker',
    description: 'A hostile swamp creature that kites its prey and panics when set on fire or haunted.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  creatures: [
    {
      id: 'boglurker',
      displayName: 'Bog Lurker',
      description: 'Something is watching you from the reeds.',
      animation: {
        source: 'vanilla',
        build: 'hound',
        clips: { idle: 'idle', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' },
      },
      stats: { health: 100, damage: 20, attackPeriod: 2, walkSpeed: 5, aggroRange: 15 },
      loot: [{ prefab: 'monstermeat', chance: 1 }],
      behavior: 'hostile',
      tags: [],
      sanityAura: -5,
      flammable: true,
      panicCauses: ['onFire', 'haunted'],
      kiting: { runDistance: 6, safeDistance: 10 },
    },
  ],
}
