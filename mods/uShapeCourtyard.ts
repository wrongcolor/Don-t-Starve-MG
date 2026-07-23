import type { ModProject } from '../src/types/modProject'
import { createEmptyTileGrid } from '../src/types/worldContent'

// Mod 6 (mods/README.md): demonstra o editor de static layout (patterns.md#55) —
// uma pequena praça em formato de U (pernas laterais + base fechada, aberto no
// topo), com uma fogueira no meio e duas luminárias nas pontas. A Room embute o
// layout via staticLayouts (contents.countstaticlayouts no Lua gerado), separada
// do continente pelo mesmo mecanismo de regionId já usado em alchemistIsland/
// castawaysCove (patterns.md#17).
const WIDTH = 7
const HEIGHT = 7
const WOODFLOOR_INDEX = 9 // GROUND_TYPES[9] = WOODFLOOR

const tiles = createEmptyTileGrid(WIDTH, HEIGHT)
for (let row = 0; row < HEIGHT; row++) {
  tiles[row][0] = WOODFLOOR_INDEX
  tiles[row][WIDTH - 1] = WOODFLOOR_INDEX
}
for (let col = 0; col < WIDTH; col++) {
  tiles[HEIGHT - 1][col] = WOODFLOOR_INDEX
}

export const uShapeCourtyard: ModProject = {
  meta: {
    name: 'U-Shape Courtyard',
    description: 'A small island with a hand-placed U-shaped courtyard — a static layout demo.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [],
  structures: [],
  characters: [],
  creatures: [],
  staticLayouts: [
    {
      id: 'UShapeCourtyard',
      width: WIDTH,
      height: HEIGHT,
      tiles,
      objects: [
        { prefab: 'campfire', col: 3, row: 5, properties: [] },
        { prefab: 'streetlight', col: 0, row: 0, properties: [] },
        { prefab: 'streetlight', col: 6, row: 0, properties: [] },
      ],
      layoutPosition: 'CENTER',
      startMask: 'IGNORE_IMPASSABLE_BARREN_RESERVED',
      fillMask: 'IGNORE_IMPASSABLE_BARREN_RESERVED',
    },
  ],
  rooms: [
    {
      id: 'UShapeGrove',
      terrain: 'GRASS',
      tags: [],
      requiredPrefabs: [],
      fixedPrefabs: [],
      staticLayouts: [{ layoutId: 'UShapeCourtyard', count: { min: 1, max: 1 } }],
    },
  ],
  tasks: [
    {
      id: 'U-Shape Courtyard',
      locks: ['NONE'],
      keysGiven: [],
      roomChoices: [{ roomId: 'UShapeGrove', count: { min: 1, max: 1 } }],
      backgroundTerrain: 'GRASS',
      backgroundRoom: undefined,
      regionId: 'ushapecourtyard1',
      locations: ['forest'],
      colour: { r: 1, g: 0.8, b: 0, a: 1 },
    },
  ],
}
