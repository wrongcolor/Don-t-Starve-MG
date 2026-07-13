import type { CreatureDef } from '../types/modProject'

export interface ResolvedCreatureAnimation {
  build: string
  clips: { idle: string; walk: string; atk: string; hit: string; death: string }
}

const DEFAULT_CLIPS = { idle: 'idle', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' }

// Creatures with no animation choice keep the previous default: a custom build named
// after the creature's own id, which the user must supply as anim/<id>.zip (see README).
export function resolveCreatureAnimation(creature: CreatureDef): ResolvedCreatureAnimation {
  const anim = creature.animation
  if (anim?.source === 'vanilla') {
    return { build: anim.build, clips: anim.clips }
  }
  return { build: creature.id, clips: DEFAULT_CLIPS }
}

export function isVanillaCreatureAnimation(creature: CreatureDef): boolean {
  return creature.animation?.source === 'vanilla'
}
