import type { ModProject } from '../../src/types/modProject'

// Exercises the mechanics sampleProject (src/__tests__/fixtures.ts) doesn't cover:
// rechargeable, container, teleportPair, nameable, combinable, skill tree, herd.
export const advancedMechanicsProject: ModProject = {
  meta: {
    name: 'Advanced Mechanics Test Mod',
    description: 'Covers rechargeable/container/teleporter/nameable/combinable/skilltree/herd',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'moonwand',
      displayName: 'Moon Wand',
      description: 'A rechargeable magic wand',
      category: 'weapon',
      weapon: { damage: 0 },
      spellEffect: 'createLight',
      rechargeable: { cooldownSeconds: 45 },
      recipe: {
        ingredients: [{ prefab: 'moonrocknugget', amount: 2 }],
        techLevel: 'CELESTIAL_ONE',
        filters: ['MAGIC'],
        placer: false,
      },
    },
    {
      id: 'coldbox',
      displayName: 'Cold Box',
      description: 'A container that preserves food',
      category: 'generic',
      container: {
        widget: { source: 'vanilla', reusePrefab: 'icebox' },
        sideWidget: true,
        acceptsTag: 'freezable',
        preservation: { perishRateMultiplier: 0.25, temperatureRateMultiplier: 0.5 },
      },
      recipe: {
        ingredients: [{ prefab: 'boards', amount: 2 }, { prefab: 'ice', amount: 2 }],
        techLevel: 'SCIENCE_TWO',
        filters: ['CONTAINERS'],
        placer: false,
      },
    },
    {
      id: 'wormholegate',
      displayName: 'Wormhole Gate',
      description: 'A structure that pairs up with another to teleport',
      category: 'generic',
      teleportPair: true,
      recipe: {
        ingredients: [{ prefab: 'purplegem', amount: 1 }, { prefab: 'boards', amount: 4 }],
        techLevel: 'MAGIC_THREE',
        filters: ['MAGIC', 'STRUCTURES'],
        placer: true,
      },
    },
    {
      id: 'namedplaque',
      displayName: 'Named Plaque',
      description: 'A plaque the player can rename',
      category: 'generic',
      nameable: true,
      recipe: {
        ingredients: [{ prefab: 'boards', amount: 1 }],
        techLevel: 'NONE',
        filters: ['DECOR'],
        placer: true,
      },
    },
    {
      id: 'sharpaxe',
      displayName: 'Sharp Axe',
      description: 'A combinable tool that merges durability with a matching one',
      category: 'tool',
      toolAction: 'CHOP',
      finiteuses: { maxUses: 50 },
      combinable: true,
      recipe: {
        ingredients: [{ prefab: 'twigs', amount: 1 }, { prefab: 'flint', amount: 2 }],
        techLevel: 'NONE',
        filters: ['TOOLS'],
        placer: false,
      },
    },
  ],
  characters: [
    {
      id: 'skillmaster',
      gender: 'NEUTRAL',
      title: 'the adept',
      name: 'Adept',
      description: 'A character with a skill tree',
      quote: 'I have trained for this.',
      stats: { health: 150, hunger: 150, sanity: 200 },
      startingInventory: ['torch'],
      speechOverrides: {},
      perks: [],
      foodTypeAffinities: [],
      skillTree: {
        branches: [
          {
            name: 'alchemy',
            nodes: [
              { id: 'alchemy_1', title: 'Alchemy I', desc: 'The first step.', addsTag: 'fast_alchemy' },
              { id: 'alchemy_2', title: 'Alchemy II', desc: 'Locked behind the first.', gatedAfterBranchSkills: 1 },
            ],
          },
          {
            name: 'combat',
            nodes: [{ id: 'combat_1', title: 'Combat I', desc: 'A combat skill.' }],
          },
        ],
      },
    },
  ],
  creatures: [
    {
      id: 'packwolf',
      displayName: 'Pack Wolf',
      description: 'A creature that forms herds',
      stats: { health: 150, damage: 25, attackPeriod: 2, walkSpeed: 5 },
      loot: [{ prefab: 'monstermeat', chance: 1 }],
      behavior: 'hostile',
      tags: [],
      herd: { maxSize: 6, gatherRange: 30, spawnIntervalDays: { min: 2, max: 4 } },
    },
  ],
  rooms: [],
  tasks: [],
}
