import type { ModProject } from '../src/types/modProject'

// Mod 7 (mods/README.md): demonstra a criatura de ponta a ponta, incluindo os 3
// achados do brain sweep implementados em src/generators/brain.ts (patterns.md#46-51):
// hit-and-run/kiting (ataca só fora do cooldown, foge entre um golpe e outro),
// aggroRange customizado (15 em vez do padrão 10), e uma cadeia de causas de
// pânico (foge se pegar fogo OU se assombrada por um fantasma). Reaproveita o
// build "hound" (VANILLA_CREATURE_BUILDS) pra não depender de arte própria.
export const bogLurker: ModProject = {
  meta: {
    name: 'Bog Lurker',
    description: 'A hostile swamp creature that kites its prey and panics when set on fire or haunted.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [],
  characters: [],
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
  rooms: [],
  tasks: [],
  staticLayouts: [],
}
