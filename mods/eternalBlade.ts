import type { ModProject } from '../src/types/modProject'

// Mod 2 (mods/README.md): uma arma corpo a corpo que nunca quebra (sem
// finiteuses/perishable — nenhum modelo de durabilidade), com 45 de dano e
// alcance 3 (weapon:SetRange(3) — patterns.md#31).
export const eternalBlade: ModProject = {
  meta: {
    name: 'Eternal Blade',
    description: 'A melee weapon that never wears down.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'eternalblade',
      displayName: 'Eternal Blade',
      description: 'A blade that never dulls.',
      category: 'weapon',
      weapon: { damage: 45, meleeRange: 3 },
      recipe: {
        ingredients: [{ prefab: 'goldnugget', amount: 4 }, { prefab: 'purplegem', amount: 1 }],
        techLevel: 'MAGIC_TWO',
        filters: ['WEAPONS'],
      },
    },
  ],
  structures: [],
  characters: [],
  creatures: [],
  rooms: [],
  tasks: [],
  staticLayouts: [],
}
