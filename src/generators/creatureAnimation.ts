import type { CreatureDef } from '../types/modProject'

export interface ResolvedCreatureAnimation {
  bank: string
  build: string
  clips: { idle: string; walk: string; atk: string; hit: string; death: string }
}

const DEFAULT_CLIPS = { idle: 'idle', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' }

// The default reused build for any creature with no animation choice at all — no
// custom art required to get a working, visible creature. Only an explicit "custom"
// choice (source: 'custom') still falls back to a per-id placeholder build, which the
// user must supply as anim/<id>.zip (see README).
const DEFAULT_BUILD = 'pigman'

export function resolveCreatureAnimation(creature: CreatureDef): ResolvedCreatureAnimation {
  const anim = creature.animation
  if (anim?.source === 'vanilla' || anim?.source === 'islandAdventuresShipwrecked') {
    return { bank: anim.bank ?? anim.build, build: anim.build, clips: anim.clips }
  }
  if (anim?.source === 'custom') {
    return { bank: creature.id, build: creature.id, clips: DEFAULT_CLIPS }
  }
  return { bank: DEFAULT_BUILD, build: DEFAULT_BUILD, clips: DEFAULT_CLIPS }
}

export function isVanillaCreatureAnimation(creature: CreatureDef): boolean {
  return creature.animation?.source !== 'custom'
}

export function isIslandAdventuresShipwreckedAnimation(creature: CreatureDef): boolean {
  return creature.animation?.source === 'islandAdventuresShipwrecked'
}
