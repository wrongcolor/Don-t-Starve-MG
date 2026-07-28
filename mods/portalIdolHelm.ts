import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const portalIdolHelm: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Portal Idol Helm',
    description: 'A protective helmet infused with moon magic — hand it to the Celestial Portal to pick a new survivor.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'portalidolhelm',
      displayName: 'Portal Idol Helm',
      description: 'A helmet infused with moon magic. Give it to the Celestial Portal to choose a new survivor.',
      category: 'armor',
      animation: { source: 'vanillaHat', hatName: 'football' },
      armor: { condition: 300, absorption: 0.15, dapperness: -0.05, equipSlot: 'head' },
      moonrelic: true,
      recipe: {
        ingredients: [
          { prefab: 'moonrocknugget', amount: 4 },
          { prefab: 'thulecite', amount: 1 },
        ],
        techLevel: 'CELESTIAL_ONE',
        filters: ['ARMOUR', 'MAGIC'],
      },
    },
  ],
}
