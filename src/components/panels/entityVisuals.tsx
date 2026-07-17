// Emoji icon map shared by every entity list/preview — same visual language as
// mod_creator.html, which uses emoji directly instead of a custom icon set.

const CATEGORY_ICONS: Record<string, string> = {
  tool: '🪓',
  weapon: '🗡️',
  armor: '🛡️',
  food: '🍗',
  generic: '✨',
}

const BEHAVIOR_ICONS: Record<string, string> = {
  passive: '🐇',
  neutral: '🐾',
  hostile: '👹',
}

export function categoryVisual(category: string): string {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS.generic
}

export function behaviorVisual(behavior: string): string {
  return BEHAVIOR_ICONS[behavior] ?? BEHAVIOR_ICONS.neutral
}

export function characterVisual(): string {
  return '🧑'
}

const OCEAN_TERRAINS = new Set(['OCEAN_COASTAL', 'OCEAN_SWELL', 'OCEAN_ROUGH', 'OCEAN_HAZARDOUS', 'OCEAN_BRINEPOOL'])
const STONE_TERRAINS = new Set(['ROCKY', 'METEOR', 'IMPASSABLE'])

export function roomVisual(terrain: string): string {
  if (OCEAN_TERRAINS.has(terrain)) return '🌊'
  if (STONE_TERRAINS.has(terrain)) return '🪨'
  return '🌳'
}

export function taskVisual(hasRegion: boolean): string {
  return hasRegion ? '🏝️' : '📍'
}

// A friendly illustrated empty state — a dim campfire that never quite lit,
// waiting for the first entry.
export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--parchment-line)] py-12 text-center">
      <svg
        viewBox="0 0 64 64"
        className="size-14 animate-float"
        style={{ color: 'var(--gold-dark)' }}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 46 32 20l12 26" />
        <path d="M24 46 32 30l8 16" />
        <ellipse cx="32" cy="47" rx="16" ry="3" />
        <path d="M32 12c2 3 1 5-.5 6.5S29 22 32 24c2-2 3-4 2-6.5" className="animate-flicker" style={{ color: 'var(--gold)' }} />
      </svg>
      <p className="text-sm" style={{ color: 'var(--ink)' }}>
        {message}
      </p>
      {hint && (
        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}
