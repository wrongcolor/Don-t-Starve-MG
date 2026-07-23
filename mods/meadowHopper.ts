import type { ModProject } from '../src/types/modProject'

// Mod 8 (mods/README.md): a friendly counterpart to bogLurker — a passive
// creature that never fights (damage 0, no kiting: kiting requires
// neutral/hostile per the schema refine in creatureDefSchema). Demonstrates
// herd (patterns.md#27) on a non-hostile creature for the first time in this
// mod list (previously only shown on the hostile "packwolf" fixture), plus a
// positive sanityAura (soothes instead of scares) and the onFire panic cause
// (flees if set alight). Uses a custom build: VANILLA_CREATURE_BUILDS only
// curates spider/hound today, both wrong for a gentle critter, so this one
// needs its own anim/meadowhopper.zip (see the generated README).
export const meadowHopper: ModProject = {
  meta: {
    name: 'Meadow Hopper',
    description: 'A gentle, harmless critter that forms small herds in the meadows.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [],
  characters: [],
  creatures: [
    {
      id: 'meadowhopper',
      displayName: 'Meadow Hopper',
      description: 'A gentle critter that just wants to be left alone.',
      animation: { source: 'custom' },
      stats: { health: 20, damage: 0, attackPeriod: 3, walkSpeed: 3 },
      loot: [{ prefab: 'poop', chance: 1 }],
      behavior: 'passive',
      tags: [],
      sanityAura: 3,
      flammable: true,
      panicCauses: ['onFire'],
      herd: { maxSize: 6, gatherRange: 20, spawnIntervalDays: { min: 3, max: 5 } },
    },
  ],
  rooms: [],
  tasks: [],
  staticLayouts: [],
}
