import type { ModProject } from '../src/types/modProject'

// Mod 11 (mods/README.md): demonstra CreatureDef.groundAttack (patterns.md#58) —
// enquanto tem um alvo de combate, a criatura periodicamente arremessa espetos
// (e, nesse caso, também alguns blocos de parede) de areia ao redor de si mesma,
// reaproveitando os prefabs reais sandspike_short/med/tall e sandblock do
// Antlion (Original/stategraphs/stategraphs/SGantlion_angry.lua), sem precisar
// de arte própria pra esses efeitos. Reaproveita o build "spider" (VANILLA_
// CREATURE_BUILDS) pra não depender de arte própria pro corpo da criatura.
export const duneStalker: ModProject = {
  meta: {
    name: 'Dune Stalker',
    description: 'A hostile creature that erupts sand spikes and walls around itself while fighting.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [],
  structures: [],
  characters: [],
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
  rooms: [],
  tasks: [],
  staticLayouts: [],
}
