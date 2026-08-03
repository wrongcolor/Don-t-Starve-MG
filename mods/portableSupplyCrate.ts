import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const portableSupplyCrate: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Portable Supply Crate',
    description: 'A crate that folds down into your pack and deploys back into a small storage box.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  structures: [
    {
      id: 'portablesupplycrate',
      displayName: 'Portable Supply Crate',
      description: 'Folds down small enough to carry.',
      animation: { source: 'vanilla', build: 'treasurechest' },
      loot: [],
      deployMode: 'deployableItem',
      container: { source: 'own', widget: { source: 'vanilla', reusePrefab: 'treasurechest' }, sideWidget: false },
      recipe: {
        ingredients: [
          { prefab: 'boards', amount: 4 },
          { prefab: 'rope', amount: 2 },
        ],
        techLevel: 'NONE',
        filters: ['STRUCTURES'],
      },
    },
  ],
}
