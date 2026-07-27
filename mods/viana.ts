import type { ModProject } from '../src/types/modProject'

// Mod 13 (mods/README.md): Viana, a Bruxa do Sol — personagem + mana própria
// (CharacterDef.mana, patterns.md#61), inspirada na barra de Inspiração da
// Wigfrid mas modelada com o padrão mais simples de "recurso + badge"
// confirmado no mod real "Luke" em vez da Inspiração vanilla (que exige
// variáveis de rede dentro de player_classified.lua, fora do escopo atual
// da ferramenta). Visual: reaproveita o build da Wendy
// (CharacterDef.animation, patterns.md#60) como placeholder de aparência
// enquanto o design próprio dela não fica pronto.
//
// Kit real: Sun Codex (item.container, patterns.md#20) + Sun Staff
// (item.spellbook com source 'linkedContainer', patterns.md#62) — o cajado
// oferece exatamente os feitiços que estiverem, naquele momento, dentro do
// Codex, cada um craftado separadamente como um item próprio (item.spellDef).
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
      // "staffs" (Original/prefabs/prefabs/staff.lua): shared build across every
      // vanilla staff color, each with its own clip — "yellowstaff" is the warm/
      // light staff (Star Caller's Staff), the closest real fit for a sun-themed
      // staff (docs/dst-knowledge/patterns.md's itemAnimationSchema idleClip).
      id: 'sunstaff',
      displayName: 'Sun Staff',
      description: 'A staff that channels whatever spells are bound in her Sun Codex.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'staffs', idleClip: 'yellowstaff' },
      spellbook: { source: 'linkedContainer', containerItemId: 'suncodex' },
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
    {
      // "books" (Original/prefabs/prefabs/books.lua): shared build across every
      // Wickerbottom book, each with its own clip — "book_light" (the light-
      // themed tome) is the closest real fit for a Sun Codex.
      id: 'suncodex',
      displayName: 'Sun Codex',
      description: 'Holds up to 3 spells at once — whatever is bound here is what the Sun Staff can cast.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'books', idleClip: 'book_light' },
      container: {
        widget: { source: 'custom', slots: 3, columns: 3 },
        sideWidget: true,
        acceptsTag: 'spell',
      },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 2 },
          { prefab: 'goldnugget', amount: 1 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      // emberlight (docs/dst-knowledge/patterns.md#62, Original/prefabs/prefabs/
      // stafflight.lua) — the hot ember variant, distinct from the base
      // stafflight star: a floating warmth-and-light burst that self-expires.
      id: 'emberwispspell',
      displayName: 'Ember Wisp Spell',
      description: 'Bind this in the Sun Codex to let the Sun Staff summon a warm, floating ember of light.',
      category: 'generic',
      // "papyrus" (Original/prefabs/prefabs/papyrus.lua) already follows the
      // simple bank=build=name convention with a real "idle" clip — no
      // idleClip override needed, unlike sunstaff/suncodex above.
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: { label: 'Ember Wisp', summonPrefab: 'emberlight', manaCost: 20 },
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
      // Pure stat-effect spell (no summonPrefab) — patterns.md#62's extension:
      // healthDelta/sanityDelta applied directly via :DoDelta, since no vanilla
      // prefab self-heals the caster on spawn.
      id: 'solsticeblessingspell',
      displayName: 'Solstice Blessing Spell',
      description: 'Bind this in the Sun Codex to let the Sun Staff mend her wounds with the sun\'s warmth.',
      category: 'generic',
      // "papyrus" (Original/prefabs/prefabs/papyrus.lua) already follows the
      // simple bank=build=name convention with a real "idle" clip — no
      // idleClip override needed, unlike sunstaff/suncodex above.
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: { label: 'Solstice Blessing', healthDelta: 15, sanityDelta: 15, manaCost: 30 },
      recipe: {
        ingredients: [
          { prefab: 'petals', amount: 2 },
          { prefab: 'goldnugget', amount: 1 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      // Also a pure stat-effect spell — hungerDelta only, "feeds on sunlight".
      id: 'sunfedspell',
      displayName: 'Sunfed Spell',
      description: 'Bind this in the Sun Codex to let the Sun Staff feed her on sunlight alone.',
      category: 'generic',
      // "papyrus" (Original/prefabs/prefabs/papyrus.lua) already follows the
      // simple bank=build=name convention with a real "idle" clip — no
      // idleClip override needed, unlike sunstaff/suncodex above.
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: { label: 'Sunfed', hungerDelta: 25, manaCost: 15 },
      recipe: {
        ingredients: [
          { prefab: 'twigs', amount: 1 },
          { prefab: 'goldnugget', amount: 1 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      // Companion counterpart to emberwispspell above: instead of a momentary
      // light burst at the caster's feet, this summons a `sunwisp` creature
      // (CreatureDef.companion + CreatureDef.light, patterns.md#65) that
      // keeps following Viana and glowing beside her.
      id: 'sunwispspell',
      displayName: 'Sun Wisp Spell',
      description: 'Bind this in the Sun Codex to let the Sun Staff call a small fire spirit that stays glowing by her side.',
      category: 'generic',
      // "papyrus" (Original/prefabs/prefabs/papyrus.lua) already follows the
      // simple bank=build=name convention with a real "idle" clip — no
      // idleClip override needed, unlike sunstaff/suncodex above.
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: { label: 'Sun Wisp', summonPrefab: 'sunwisp', manaCost: 35 },
      recipe: {
        ingredients: [
          { prefab: 'twigs', amount: 1 },
          { prefab: 'goldnugget', amount: 1 },
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
      startingInventory: ['sunstaff', 'suncodex'],
      speechOverrides: {},
      perks: [],
      damageMultiplier: 0.75,
      foodTypeAffinities: [],
    },
  ],
  creatures: [
    {
      // Reuses "flameball_fx" (Original/prefabs/prefabs/stafflight.lua's
      // emberlight prefab) — an FX build, not a real creature build, so only
      // "idle_loop" (idle) and "post" (emberlight's own kill/disappear clip,
      // NOT the generic "disappear" default — flameball_fx needed that
      // override, meaning it likely doesn't have "disappear" at all) are
      // confirmed against the real source. "walk"/"atk"/"hit" fall back to
      // "idle_loop" since this build has no locomotion frames — untested
      // in-game, adjust these three if the stategraph errors on them.
      id: 'sunwisp',
      displayName: 'Sun Wisp',
      description: 'A small fire spirit, warm and constant, that never strays far from her side.',
      animation: {
        source: 'vanilla',
        build: 'flameball_fx',
        clips: { idle: 'idle_loop', walk: 'idle_loop', atk: 'idle_loop', hit: 'idle_loop', death: 'post' },
      },
      stats: { health: 15, damage: 0, attackPeriod: 2, walkSpeed: 5 },
      loot: [],
      behavior: 'passive',
      tags: [],
      panicCauses: [],
      companion: { followDistance: 4, tasks: [] },
      // Same real Light API + colour emberlight itself uses (stafflight.lua)
      // — CreatureDef.light, patterns.md#65.
      light: { radius: 12, intensity: 0.8, falloff: 0.8, colour: { r: 250, g: 149, b: 18 } },
    },
  ],
  rooms: [],
  tasks: [],
  staticLayouts: [],
}
