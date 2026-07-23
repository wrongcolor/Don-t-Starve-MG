import type { ModProject } from '../src/types/modProject'

// Mod 9 (mods/README.md): a head-slot armor item combining three real, confirmed
// mechanics for the first time in this mod list. (1) equipSlot: 'head' — new
// support in item.ts/modProject.ts, generalized from hats.lua (EQUIPSLOTS.HEAD +
// the swap_hat/HAT/HAIR visual toggles, distinct from body armor's swap_body).
// (2) animation source 'vanillaHat' reusing the "football" build — no custom art
// needed; hats use a different bank/build/idle-clip naming convention than every
// other vanilla reuse this tool models (see VANILLA_HAT_BUILDS/resolveAnimationBank
// in item.ts), confirmed in hats.lua's real football-helmet prefab (fns.football).
// (3) moonrelic: true — confirmed directly in moonrockidol.lua + componentactions.lua:
// AddComponent("moonrelic") is the entire mechanic behind handing an idol to the
// Celestial Portal (a "moontrader"-tagged entity) to unlock a new survivor —
// nothing else to wire, the base game already offers ACTIONS.GIVE for it. This
// helmet just happens to also protect the wearer's head while they carry it.
export const portalIdolHelm: ModProject = {
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
  structures: [],
  characters: [],
  creatures: [],
  rooms: [],
  tasks: [],
  staticLayouts: [],
}
