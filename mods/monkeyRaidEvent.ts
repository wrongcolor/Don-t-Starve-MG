import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const monkeyRaidEvent: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Monkey Raid Event',
    description:
      'A distilled version of the real Don\'t Starve Together pirate raid (piratespawner.lua): at dusk, a small band of monkeys has a chance to raid together, sharing aggro if one is attacked (squadAlert) and dropping loot when defeated.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  creatures: [
    {
      id: 'raidmonkey',
      displayName: 'Raid Monkey',
      description: 'Never travels alone.',
      animation: {
        source: 'vanilla',
        build: 'pigman',
        clips: { idle: 'idle', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' },
      },
      stats: { health: 100, damage: 20, attackPeriod: 2, walkSpeed: 5 },
      loot: [{ prefab: 'monstermeat', chance: 1 }],
      behavior: 'hostile',
      tags: [],
      panicCauses: [],
      squadAlert: { range: 30 },
    },
  ],
  worldEvents: [
    {
      id: 'monkeyduskraid',
      displayName: 'Monkey Dusk Raid',
      description: 'At dusk, a band of raid monkeys has a chance to appear near a player and attack together.',
      trigger: { kind: 'phaseChange', phase: 'dusk' },
      chance: 0.3,
      spawnRadius: 20,
      spawnGroup: [{ prefabId: 'raidmonkey', count: { min: 2, max: 4 } }],
      loot: [{ prefab: 'goldnugget', chance: 0.5 }],
    },
  ],
}
