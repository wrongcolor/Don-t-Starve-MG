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
  characters: [
    {
      id: 'wrongcolor',
      gender: 'NEUTRAL',
      title: 'the Rogue',
      name: 'Wrongcolor',
      description: 'Never quite where you last saw him.',
      quote: "Rules are just suggestions I haven't broken yet.",
      stats: { health: 100, hunger: 150, sanity: 200 },
      startingInventory: [],
      speechOverrides: {},
      perks: [],
      foodTypeAffinities: [],
      backstab: { multiplier: 3, arcDegrees: 90 },
    },
  ],
}
