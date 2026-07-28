import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const calmingCenser: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Calming Censer',
    description: 'Throw it to release a soothing cloud that calms nearby hostile creatures for a while.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'calmingcenser',
      displayName: 'Calming Censer',
      description: 'A smoking censer that smells like safety.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'goldnugget' },
      finiteuses: { maxUses: 3 },
      tameBomb: { radius: 8, cloudDurationSeconds: 20, tameDurationSeconds: 120 },
      recipe: {
        ingredients: [
          { prefab: 'petals', amount: 4 },
          { prefab: 'honey', amount: 2 },
        ],
        techLevel: 'NONE',
        filters: ['MAGIC'],
      },
    },
  ],
}
