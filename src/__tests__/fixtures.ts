import type { ModProject } from '../types/modProject'

export const sampleProject: ModProject = {
  meta: {
    name: 'Test Mod',
    description: 'A mod for testing',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [
      {
        name: 'difficulty',
        label: 'Difficulty',
        options: [
          { description: 'Easy', data: 'easy' },
          { description: 'Hard', data: 'hard' },
        ],
        defaultIndex: 0,
      },
    ],
  },
  items: [
    {
      id: 'testsword',
      displayName: 'Test Sword',
      description: 'A sword for testing',
      category: 'weapon',
      weapon: { damage: 34 },
      finiteuses: { maxUses: 150 },
      recipe: {
        ingredients: [
          { prefab: 'twigs', amount: 2 },
          { prefab: 'flint', amount: 1 },
        ],
        techLevel: 'SCIENCE_ONE',
        filters: ['WEAPONS'],
        placer: false,
      },
    },
    {
      id: 'teststructure',
      displayName: 'Test Structure',
      description: 'A structure for testing',
      category: 'generic',
      recipe: {
        ingredients: [{ prefab: 'boards', amount: 4 }],
        techLevel: 'NONE',
        filters: ['STRUCTURES'],
        placer: true,
      },
    },
    {
      id: 'testtrinket',
      displayName: 'Test Trinket',
      description: 'A trinket reusing a vanilla build',
      category: 'generic',
      animation: { source: 'vanilla', build: 'trinket_1' },
      recipe: {
        ingredients: [{ prefab: 'flint', amount: 1 }],
        techLevel: 'NONE',
        filters: ['TOOLS'],
        placer: false,
      },
    },
  ],
  characters: [
    {
      id: 'testchar',
      gender: 'NEUTRAL',
      title: 'the tester',
      name: 'Testy',
      description: 'A character for testing',
      quote: 'I test things.',
      stats: { health: 150, hunger: 150, sanity: 200 },
      startingInventory: ['torch', 'flint'],
      speechOverrides: { ANNOUNCE_COLD: 'It is cold, for science.' },
      perks: ['no_hunger', 'faster_walk'],
    },
  ],
  creatures: [
    {
      id: 'testmob',
      displayName: 'Test Mob',
      description: 'A mob for testing',
      stats: { health: 100, damage: 20, attackPeriod: 2, walkSpeed: 4 },
      loot: [{ prefab: 'monstermeat', chance: 1 }],
      behavior: 'hostile',
      tags: ['largecreature'],
    },
    {
      id: 'testspidermob',
      displayName: 'Test Spider Mob',
      description: 'A mob reusing a vanilla build',
      animation: {
        source: 'vanilla',
        build: 'spider',
        clips: { idle: 'idle', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' },
      },
      stats: { health: 80, damage: 15, attackPeriod: 2, walkSpeed: 4 },
      loot: [{ prefab: 'silk', chance: 1 }],
      behavior: 'hostile',
      tags: [],
    },
  ],
}
