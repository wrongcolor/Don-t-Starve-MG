import type { ModProject } from '../src/types/modProject'

// Mod 10 (mods/README.md): uma estrutura de teste pro recurso "daySpawner" — a
// cada início de dia (TheWorld:ListenForEvent("phasechanged", ...) checando
// phase == "day", confirmado em beefaloherd.lua), tem uma chance de invocar um
// deerclops num ponto aleatório dentro de um raio bem grande ao redor de si
// (FindWalkableOffset + SpawnPrefab, confirmado em altar_prototyper.lua/
// balatro_machine.lua). "deerclops" é só o prefab de teste pedido — troque
// daySpawner.prefab por qualquer outro mob antes de publicar. Reaproveita o
// build vanilla da Máquina de Ciência ("researchlab", patterns.md — confirmado
// em scienceprototyper.lua) como aparência padrão, sem precisar de arte própria.
// Estrutura de verdade agora (não mais um Item com recipe.placer) — ver a
// separação Item/Structure feita depois deste mod ter sido criado.
export const deerclopsAlarm: ModProject = {
  meta: {
    name: 'Deerclops Alarm',
    description: 'A cursed totem that has a chance to summon a Deerclops somewhere nearby at the start of each day.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [],
  structures: [
    {
      id: 'deerclopsalarm',
      displayName: 'Deerclops Alarm',
      description: 'You probably shouldn\'t have built this.',
      animation: { source: 'vanilla', build: 'researchlab' },
      loot: [],
      daySpawner: { prefab: 'deerclops', chance: 0.15, range: 60 },
      recipe: {
        ingredients: [
          { prefab: 'nightmarefuel', amount: 4 },
          { prefab: 'houndstooth', amount: 2 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
  ],
  characters: [],
  creatures: [],
  rooms: [],
  tasks: [],
  staticLayouts: [],
}
