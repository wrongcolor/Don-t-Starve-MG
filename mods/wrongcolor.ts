import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const wrongcolor: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Wrongcolor',
    description: 'A rogue who plays by his own rules.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'flintknife',
      displayName: 'Flint Knife',
      description: 'Quick, quiet, and easy to hide.',
      category: 'weapon',
      animation: { source: 'vanilla', build: 'flint' },
      weapon: { damage: 20 },
      finiteuses: { maxUses: 30 },
      recipe: {
        ingredients: [
          { prefab: 'flint', amount: 2 },
          { prefab: 'twigs', amount: 1 },
        ],
        techLevel: 'NONE',
        filters: ['WEAPONS'],
      },
    },
    {
      id: 'flintthrowingknife',
      displayName: 'Flint Throwing Knife',
      description: "Aim true. You won't get this one back.",
      category: 'weapon',
      animation: { source: 'vanilla', build: 'flint' },
      weapon: { damage: 15, ranged: { minRange: 4, maxRange: 8, projectilePrefab: 'blowdart_dart' } },
      finiteuses: { maxUses: 10 },
      recipe: {
        ingredients: [
          { prefab: 'flint', amount: 1 },
          { prefab: 'twigs', amount: 1 },
        ],
        techLevel: 'NONE',
        filters: ['WEAPONS'],
      },
    },
    {
      id: 'goldknife',
      displayName: 'Gold Knife',
      description: 'Shinier than it has any right to be, for something this sharp.',
      category: 'weapon',
      animation: { source: 'vanilla', build: 'goldnugget' },
      weapon: { damage: 20 },
      finiteuses: { maxUses: 30 },
      recipe: {
        ingredients: [
          { prefab: 'goldnugget', amount: 2 },
          { prefab: 'twigs', amount: 1 },
        ],
        techLevel: 'SCIENCE_ONE',
        filters: ['WEAPONS'],
      },
    },
    {
      id: 'goldthrowingknife',
      displayName: 'Gold Throwing Knife',
      description: 'Worth more than the wound it leaves.',
      category: 'weapon',
      animation: { source: 'vanilla', build: 'goldnugget' },
      weapon: { damage: 15, ranged: { minRange: 4, maxRange: 8, projectilePrefab: 'blowdart_dart' } },
      finiteuses: { maxUses: 10 },
      recipe: {
        ingredients: [
          { prefab: 'goldnugget', amount: 1 },
          { prefab: 'twigs', amount: 1 },
        ],
        techLevel: 'SCIENCE_ONE',
        filters: ['WEAPONS'],
      },
    },
    {
      id: 'thuleciteknife',
      displayName: 'Thulecite Knife',
      description: 'Ancient, and still hungry.',
      category: 'weapon',
      animation: { source: 'vanilla', build: 'thulecite' },
      weapon: { damage: 20 },
      finiteuses: { maxUses: 30 },
      recipe: {
        ingredients: [
          { prefab: 'thulecite', amount: 2 },
          { prefab: 'nightmarefuel', amount: 1 },
        ],
        techLevel: 'ANCIENT_TWO',
        filters: ['WEAPONS'],
      },
    },
    {
      id: 'thulecitethrowingknife',
      displayName: 'Thulecite Throwing Knife',
      description: 'Old magic, new bruises.',
      category: 'weapon',
      animation: { source: 'vanilla', build: 'thulecite' },
      weapon: { damage: 15, ranged: { minRange: 4, maxRange: 8, projectilePrefab: 'blowdart_dart' } },
      finiteuses: { maxUses: 10 },
      recipe: {
        ingredients: [
          { prefab: 'thulecite', amount: 1 },
          { prefab: 'nightmarefuel', amount: 1 },
        ],
        techLevel: 'ANCIENT_TWO',
        filters: ['WEAPONS'],
      },
    },
    {
      id: 'obsidianknife',
      displayName: 'Obsidian Knife',
      description: 'Cooled fast. Cuts faster.',
      category: 'weapon',
      animation: { source: 'vanilla', build: 'obsidian' },
      weapon: { damage: 20 },
      finiteuses: { maxUses: 30 },
      recipe: {
        ingredients: [
          { prefab: 'obsidian', amount: 2 },
          { prefab: 'charcoal', amount: 1 },
        ],
        techLevel: 'SEAFARING_ONE',
        filters: ['WEAPONS'],
      },
    },
    {
      id: 'obsidianthrowingknife',
      displayName: 'Obsidian Throwing Knife',
      description: 'Still warm from the volcano.',
      category: 'weapon',
      animation: { source: 'vanilla', build: 'obsidian' },
      weapon: { damage: 15, ranged: { minRange: 4, maxRange: 8, projectilePrefab: 'blowdart_dart' } },
      finiteuses: { maxUses: 10 },
      recipe: {
        ingredients: [
          { prefab: 'obsidian', amount: 1 },
          { prefab: 'charcoal', amount: 1 },
        ],
        techLevel: 'SEAFARING_ONE',
        filters: ['WEAPONS'],
      },
    },
  ],
  characters: [
    {
      id: 'wrongcolor',
      gender: 'NEUTRAL',
      title: 'the Rogue',
      name: 'Wrongcolor',
      description: 'Never quite where you last saw him.',
      quote: "Rules are just suggestions I haven't broken yet.",
      stats: { health: 100, hunger: 150, sanity: 200 },
      startingInventory: ['flintknife', 'flintthrowingknife'],
      speechOverrides: {},
      perks: [],
      foodTypeAffinities: [],
      backstab: { multiplier: 3, arcDegrees: 90, bonusWhenTargetDistracted: true },
    },
  ],
}
