import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const deerclopsAlarm: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Deerclops Alarm',
    description: 'A cursed totem that has a chance to summon a Deerclops somewhere nearby at the start of each day.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
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
}
