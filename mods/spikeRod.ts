import type { ModProject } from '../src/types/modProject'

// Mod 12 (mods/README.md): demonstra ItemDef.groundAttack (patterns.md#58) — a
// mesma mira reticule + spellcaster já usada por spellEffect/tameBomb, só que
// arremessando espetos e blocos de parede de areia num ponto em vez de um
// efeito mágico ou uma nuvem de doma. Reaproveita o build vanilla "rocks" pra
// não depender de arte própria.
export const spikeRod: ModProject = {
  meta: {
    name: 'Spike Rod',
    description: 'A rod that erupts a ring of hardened sand spikes and walls wherever it is aimed.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'spikerod',
      displayName: 'Spike Rod',
      description: 'Slam it into the ground to erupt a ring of hardened sand spikes.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'rocks' },
      finiteuses: { maxUses: 8 },
      groundAttack: { spikeCount: 6, wallCount: 3, radius: 5 },
      recipe: {
        ingredients: [
          { prefab: 'flint', amount: 4 },
          { prefab: 'rocks', amount: 4 },
        ],
        techLevel: 'NONE',
        filters: ['MAGIC'],
      },
    },
  ],
  structures: [],
  characters: [],
  creatures: [],
  rooms: [],
  tasks: [],
  staticLayouts: [],
}
