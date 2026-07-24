import type { ModProject } from '../src/types/modProject'

// Mod 13 (mods/README.md): Viana, a Bruxa do Sol — personagem + cajado com
// livro de feitiços (ItemDef.spellbook, patterns.md#29) + mana própria
// (CharacterDef.mana, patterns.md#61), inspirada na barra de Inspiração da
// Wigfrid mas modelada com o padrão mais simples de "recurso + badge"
// confirmado no mod real "Luke" em vez da Inspiração vanilla (que exige
// variáveis de rede dentro de player_classified.lua, fora do escopo atual
// da ferramenta). Visual: reaproveita o build da Wendy
// (CharacterDef.animation, patterns.md#60) como placeholder de aparência
// enquanto o design próprio dela não fica pronto.
export const viana: ModProject = {
  meta: {
    name: 'Viana, the Sunwitch',
    description: 'A sun-touched witch who channels her spells through a staff and a book of spells.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'sunstaff',
      displayName: 'Sunwoven Staff',
      description: 'A staff that channels light and warmth into whatever spell she chooses.',
      category: 'generic',
      animation: { source: 'custom' },
      spellbook: {
        spells: [
          { label: 'Sunbeam', summonPrefab: 'stafflight', manaCost: 20 },
          { label: 'Fireflies', summonPrefab: 'firefly', manaCost: 10 },
        ],
      },
      recipe: {
        ingredients: [
          { prefab: 'twigs', amount: 2 },
          { prefab: 'goldnugget', amount: 2 },
          { prefab: 'nightmarefuel', amount: 2 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
  ],
  structures: [],
  characters: [
    {
      id: 'viana',
      gender: 'FEMALE',
      title: 'the Sunwitch',
      name: 'Viana',
      description: 'She traded a life under open skies for one spent bent over spellbooks — the sun still answers when she calls.',
      quote: 'The sun lends its light. I just ask for it.',
      animation: { source: 'vanilla', build: 'wendy' },
      stats: { health: 120, hunger: 150, sanity: 220 },
      mana: { max: 100, regenPerSecond: 1 },
      startingInventory: ['sunstaff'],
      speechOverrides: {},
      perks: [],
      damageMultiplier: 0.75,
      foodTypeAffinities: [],
    },
  ],
  creatures: [],
  rooms: [],
  tasks: [],
  staticLayouts: [],
}
