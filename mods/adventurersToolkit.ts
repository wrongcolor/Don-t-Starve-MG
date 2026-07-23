import type { ModProject } from '../src/types/modProject'

// Mod 4 (mods/README.md): duas armas combináveis + dois contêineres (um
// widget vanilla, um custom) no MESMO mod. Testa algo que nenhum mod real
// anterior cobriu: os blocos que só devem aparecer UMA VEZ no modmain.lua
// (a ação "Combine" compartilhada, containers.params) quando há MAIS de um
// item qualificado — inclusive misturando as duas variantes de widget de
// contêiner (vanilla reuse vs. grid custom) juntas.
export const adventurersToolkit: ModProject = {
  meta: {
    name: "Adventurer's Toolkit",
    description: 'Two combinable tools and two containers, to stress the shared modmain wiring.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'huntersknife',
      displayName: "Hunter's Knife",
      description: 'A combinable knife.',
      category: 'weapon',
      weapon: { damage: 27 },
      finiteuses: { maxUses: 75 },
      combinable: true,
      recipe: {
        ingredients: [{ prefab: 'flint', amount: 2 }, { prefab: 'twigs', amount: 1 }],
        techLevel: 'NONE',
        filters: ['WEAPONS'],
        placer: false,
      },
    },
    {
      id: 'huntersspade',
      displayName: "Hunter's Spade",
      description: 'A combinable digging tool.',
      category: 'tool',
      toolAction: 'DIG',
      finiteuses: { maxUses: 75 },
      combinable: true,
      recipe: {
        ingredients: [{ prefab: 'flint', amount: 2 }, { prefab: 'twigs', amount: 1 }],
        techLevel: 'NONE',
        filters: ['TOOLS'],
        placer: false,
      },
    },
    {
      id: 'travelpack',
      displayName: 'Travel Pack',
      description: 'A container reusing a vanilla widget.',
      category: 'generic',
      container: {
        widget: { source: 'vanilla', reusePrefab: 'krampus_sack' },
        sideWidget: true,
      },
      recipe: {
        ingredients: [{ prefab: 'silk', amount: 4 }, { prefab: 'rope', amount: 2 }],
        techLevel: 'NONE',
        filters: ['CONTAINERS'],
        placer: false,
      },
    },
    {
      id: 'toolbelt',
      displayName: 'Tool Belt',
      description: 'A container with a custom slot grid.',
      category: 'generic',
      container: {
        widget: { source: 'custom', slots: 6, columns: 3 },
        sideWidget: false,
        acceptsTag: 'sharp',
      },
      recipe: {
        ingredients: [{ prefab: 'boards', amount: 2 }, { prefab: 'rope', amount: 1 }],
        techLevel: 'NONE',
        filters: ['CONTAINERS'],
        placer: false,
      },
    },
  ],
  characters: [],
  creatures: [],
  rooms: [],
  tasks: [],
  staticLayouts: [],
}
