import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const fenwick: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Fenwick, the Beastkeeper',
    description: 'A quiet wanderer who speaks more to animals than to people, and a full kit of tools that lean into that bond.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'bramblewhip',
      displayName: 'Bramblewhip',
      description: 'Cut from the thorniest vine in the woods.',
      category: 'weapon',
      animation: { source: 'vanilla', build: 'spear' },
      weapon: { damage: 30, meleeRange: 3 },
      finiteuses: { maxUses: 100 },
      recipe: {
        ingredients: [
          { prefab: 'twigs', amount: 3 },
          { prefab: 'spidergland', amount: 1 },
        ],
        techLevel: 'NONE',
        filters: ['WEAPONS'],
      },
    },
    {
      id: 'vigorcharm',
      displayName: 'Vigor Charm',
      description: 'Hums faintly with the same warmth as his own vigor.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'trinket_1' },
      spellEffect: 'createLight',
      rechargeable: { cooldownSeconds: 40 },
      recipe: {
        ingredients: [
          { prefab: 'goldnugget', amount: 1 },
          { prefab: 'nightmarefuel', amount: 1 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'herbsatchel',
      displayName: 'Herb Satchel',
      description: 'Smells of crushed leaves and old rain.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'backpack' },
      container: { widget: { source: 'custom', slots: 4, columns: 2 }, sideWidget: true, acceptsTag: 'herb' },
      recipe: {
        ingredients: [
          { prefab: 'silk', amount: 2 },
          { prefab: 'twigs', amount: 2 },
        ],
        techLevel: 'NONE',
        filters: ['CONTAINERS'],
      },
    },
    {
      id: 'wildberries',
      displayName: 'Wild Berries',
      description: 'Tart, but nourishing.',
      category: 'food',
      animation: { source: 'vanilla', build: 'berries' },
      stackable: { maxSize: 40 },
      perishable: { perishTimeDays: 4 },
      edible: { foodType: 'VEGGIE', healthValue: 4, hungerValue: 12, sanityValue: 5 },
      onEatBuff: { damageMultiplier: 0.1, durationSeconds: 90 },
      recipe: {
        ingredients: [
          { prefab: 'petals', amount: 2 },
          { prefab: 'twigs', amount: 1 },
        ],
        techLevel: 'NONE',
        filters: ['COOKING'],
      },
    },
    {
      id: 'hushcall',
      displayName: 'Hush Call',
      description: 'A worn wooden horn that speaks in a tongue only beasts understand.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'trinket_3' },
      finiteuses: { maxUses: 4 },
      tameBomb: { radius: 6, cloudDurationSeconds: 15, tameDurationSeconds: 90 },
      recipe: {
        ingredients: [
          { prefab: 'twigs', amount: 2 },
          { prefab: 'houndstooth', amount: 1 },
        ],
        techLevel: 'NONE',
        filters: ['MAGIC'],
      },
    },
  ],
  structures: [
    {
      id: 'beastkeepertotem',
      displayName: "Beastkeeper's Totem",
      description: 'Carved with the shapes of every creature he has ever tamed.',
      animation: { source: 'vanilla', build: 'prestihatitator' },
      loot: [],
      prototyper: { category: 'MAGIC', tier: 1 },
      recipe: {
        ingredients: [
          { prefab: 'twigs', amount: 4 },
          { prefab: 'goldnugget', amount: 2 },
        ],
        techLevel: 'NONE',
        filters: ['MAGIC', 'STRUCTURES'],
      },
    },
  ],
  characters: [
    {
      id: 'fenwick',
      gender: 'MALE',
      title: 'the Beastkeeper',
      name: 'Fenwick',
      description: 'He speaks more to animals than to people, and they always seem to listen.',
      quote: "Easy now. We're not so different, you and I.",
      animation: { source: 'vanilla', build: 'wormwood' },
      stats: { health: 150, hunger: 180, sanity: 200 },
      mana: { max: 80, regenPerSecond: 0.5 },
      startingInventory: ['bramblewhip', 'vigorcharm'],
      speechOverrides: {
        ANNOUNCE_COLD: 'The forest feels colder like this.',
        ANNOUNCE_HUNGRY: "My belly matches the wild ones' now.",
      },
      perks: ['night_vision'],
      damageMultiplier: 0.85,
      hungerRateMultiplier: 1.2,
      foodTypeAffinities: [{ foodType: 'VEGGIE', multiplier: 1.25 }],
      skillTree: {
        branches: [
          {
            name: 'beastmastery',
            nodes: [
              { id: 'beast_1', title: 'Quiet Steps', desc: 'Wild creatures notice him less.', addsTag: 'beastfriend' },
              { id: 'beast_2', title: 'Old Bond', desc: 'His companion grows bolder.', gatedAfterBranchSkills: 1 },
            ],
          },
          {
            name: 'vigor',
            nodes: [{ id: 'vigor_1', title: 'Deep Reserves', desc: 'Vigor runs deeper than before.' }],
          },
        ],
      },
    },
  ],
  creatures: [
    {
      id: 'duskfox',
      displayName: 'Duskfox',
      description: 'Keeps close, ears always turning toward the trees.',
      animation: {
        source: 'vanilla',
        build: 'kitcoon',
        clips: { idle: 'idle', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' },
      },
      stats: { health: 20, damage: 0, attackPeriod: 3, walkSpeed: 5 },
      loot: [{ prefab: 'silk', chance: 0.4 }],
      behavior: 'passive',
      tags: [],
      panicCauses: ['onFire'],
      flammable: true,
      companion: { followDistance: 5, tasks: ['collectItems'] },
    },
  ],
}
