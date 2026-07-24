import type { ModProject } from '../src/types/modProject'

// Mod 14 (mods/README.md): uma estrutura de teste pro recurso "interior"
// (StructureDef.interior, patterns.md#64) — construir, martelar a porta (a
// própria estrutura, via AddComponent("door")) e entrar numa salinha
// separada de verdade, sem tela de carregamento, via o componente real
// `interiorspawner` do mod publicado "Above the Clouds". Como esse mecanismo
// não é nativo do DST, o modinfo.lua gerado declara automaticamente uma
// dependência (mod_dependencies) nesse mod — quem for testar precisa ter
// "Above the Clouds" instalado e ativo também.
export const hideawayHut: ModProject = {
  meta: {
    name: 'Hideaway Hut',
    description: 'A small hut with a door — walk through it and find a hidden room inside.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [],
  structures: [
    {
      id: 'hideawayhut',
      displayName: 'Hideaway Hut',
      description: 'Looks small on the outside. Bigger on the inside.',
      // "pig_house" (Original/prefabs/prefabs/pighouse.lua): bank=build=
      // "pig_house", idle clip is a real plain "idle" — fits the simple
      // vanilla-reuse convention with no idleClip override needed.
      animation: { source: 'vanilla', build: 'pig_house' },
      loot: [{ prefab: 'boards', chance: 0.5 }],
      interior: { size: 'tiny' },
      recipe: {
        ingredients: [
          { prefab: 'boards', amount: 4 },
          { prefab: 'rope', amount: 2 },
          { prefab: 'cutstone', amount: 2 },
        ],
        techLevel: 'NONE',
        filters: ['STRUCTURES'],
      },
    },
  ],
  characters: [],
  creatures: [],
  rooms: [],
  tasks: [],
  staticLayouts: [],
}
