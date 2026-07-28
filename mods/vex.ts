import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const vex: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Vex the Pyromancer',
    description: 'A playable character mod exercising the full character feature set.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  characters: [
    {
      id: 'vex',
      gender: 'FEMALE',
      title: 'the pyromancer',
      name: 'Vex',
      description: 'A wanderer who bent fire to her will, and now can\'t always control it.',
      quote: 'The fire listens, if you ask nicely.',
      stats: { health: 100, hunger: 100, sanity: 250 },
      startingInventory: ['torch', 'nightmarefuel'],
      speechOverrides: {
        ANNOUNCE_COLD: 'Cold is just fire that hasn\'t started yet.',
        ANNOUNCE_HOT: 'Now THIS I like.',
      },
      perks: ['fire_immune', 'night_vision'],
      damageMultiplier: 1.15,
      hungerRateMultiplier: 1.25,
      walkSpeedMultiplier: 1.1,
      foodTypeAffinities: [{ foodType: 'ELEMENTAL', multiplier: 1.5 }],
      skillTree: {
        branches: [
          {
            name: 'pyromancy',
            nodes: [
              { id: 'pyro_1', title: 'Ember Touch', desc: 'Her hands radiate warmth.', addsTag: 'firestarter' },
              { id: 'pyro_2', title: 'Inferno Within', desc: 'No longer bothered by overheating.', gatedAfterBranchSkills: 1 },
            ],
          },
          {
            name: 'spirit',
            nodes: [{ id: 'spirit_1', title: 'Calm Mind', desc: 'Reduced sanity loss from the dark.' }],
          },
        ],
      },
    },
  ],
}
