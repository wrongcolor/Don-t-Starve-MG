import type { CreatureDef } from '../types/modProject'

export interface ResolvedCreatureAnimation {
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
  if (anim?.source === 'vanilla') {
    return { build: anim.build, clips: anim.clips }
  }
  if (anim?.source === 'custom') {
    return { build: creature.id, clips: DEFAULT_CLIPS }
  }
  return { build: DEFAULT_BUILD, clips: DEFAULT_CLIPS }
}

export function isVanillaCreatureAnimation(creature: CreatureDef): boolean {
  return creature.animation?.source !== 'custom'
}
