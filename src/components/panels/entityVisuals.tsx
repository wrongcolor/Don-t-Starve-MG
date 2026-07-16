import type { ReactNode } from 'react'

// Small stroke-based icon set (currentColor, 24x24) shared by category/behavior
// badges across panels — same visual language as the sidebar icons in App.tsx.

export function IconPickaxe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M5 5c3-1 8-1 11 2s3 8 2 11c-3-3-6-9-9-11S5 5 5 5Z" />
      <path d="m5 5 3 3" />
      <path d="m8 16-4 4" />
    </svg>
  )
}
export function IconSwordSmall() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="m14.5 3.5 6 6-2 2-6-6z" />
      <path d="M12.5 5.5 4 14v3h3l8.5-8.5" />
      <path d="M4 17l3 3" />
    </svg>
  )
}
export function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="m9.5 12 2 2 3.5-4" />
    </svg>
  )
}
export function IconDrumstick() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M14 10c2.5-2.5 6-3 7.5-1.5S22 13 19.5 15.5L15 20a3 3 0 0 1-4.5-4l4.5-4.5Z" />
      <path d="M11 13c-2-.5-5-.2-6.5 1.3-1.6 1.6-1 3 0 4s2.4 1.6 4 0C10 17 10.3 14 10.8 12" />
    </svg>
  )
}
export function IconGem() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M6 3h12l4 6-10 12L2 9Z" />
      <path d="M2 9h20M9 3l-2 6 5 12 5-12-2-6" />
    </svg>
  )
}
export function IconLeaf() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M20 4c-9 0-16 5-16 14 9 0 16-5 16-14Z" />
      <path d="M6 18C10 12 14 8 20 4" />
    </svg>
  )
}
export function IconFangs() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M5 4c-1.5 4 0 8 2 9.5L8 19l2.5-4" />
      <path d="M19 4c1.5 4 0 8-2 9.5L16 19l-2.5-4" />
      <path d="M8 13.5c1.3.8 2.7 1.2 4 1.2s2.7-.4 4-1.2" />
    </svg>
  )
}
export function IconTent() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M12 4 3 20h18L12 4Z" />
      <path d="M12 4v16M8.5 20 12 12l3.5 8" />
    </svg>
  )
}
export function IconPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M12 21s7-6.5 7-11.5a7 7 0 0 0-14 0C5 14.5 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  )
}

const CATEGORY_VISUALS: Record<string, { icon: ReactNode; accent: string }> = {
  tool: { icon: <IconPickaxe />, accent: 'ember' },
  weapon: { icon: <IconSwordSmall />, accent: 'blood' },
  armor: { icon: <IconShield />, accent: 'moss' },
  food: { icon: <IconDrumstick />, accent: 'frost' },
  generic: { icon: <IconGem />, accent: 'parchment' },
}

const BEHAVIOR_VISUALS: Record<string, { icon: ReactNode; accent: string }> = {
  passive: { icon: <IconLeaf />, accent: 'moss' },
  neutral: { icon: <IconLeaf />, accent: 'ember' },
  hostile: { icon: <IconFangs />, accent: 'blood' },
}

export function categoryVisual(category: string) {
  return CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS.generic
}

export function behaviorVisual(behavior: string) {
  return BEHAVIOR_VISUALS[behavior] ?? BEHAVIOR_VISUALS.neutral
}

export function characterVisual() {
  return { icon: <IconMaskSmall />, accent: 'ember' }
}

const OCEAN_TERRAINS = new Set(['OCEAN_COASTAL', 'OCEAN_SWELL', 'OCEAN_ROUGH', 'OCEAN_HAZARDOUS', 'OCEAN_BRINEPOOL'])
const STONE_TERRAINS = new Set(['ROCKY', 'METEOR', 'IMPASSABLE'])

export function roomVisual(terrain: string) {
  if (OCEAN_TERRAINS.has(terrain)) return { icon: <IconTent />, accent: 'frost' }
  if (STONE_TERRAINS.has(terrain)) return { icon: <IconTent />, accent: 'parchment' }
  return { icon: <IconTent />, accent: 'moss' }
}

export function taskVisual(hasRegion: boolean) {
  return hasRegion ? { icon: <IconPin />, accent: 'frost' } : { icon: <IconPin />, accent: 'ember' }
}

function IconMaskSmall() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M4 9c0-3 3.5-5 8-5s8 2 8 5-2 8-8 8-8-5-8-8Z" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M9.5 14c1 1 4 1 5 0" />
    </svg>
  )
}

const ACCENT_CLASSES: Record<string, { bg: string; text: string; ring: string; border: string }> = {
  ember: { bg: 'bg-ember-500/15', text: 'text-ember-300', ring: 'ring-ember-500/40', border: 'border-l-ember-500' },
  blood: { bg: 'bg-blood-500/15', text: 'text-blood-400', ring: 'ring-blood-500/40', border: 'border-l-blood-500' },
  moss: { bg: 'bg-moss-500/15', text: 'text-moss-400', ring: 'ring-moss-500/40', border: 'border-l-moss-500' },
  frost: { bg: 'bg-frost-500/15', text: 'text-frost-400', ring: 'ring-frost-500/40', border: 'border-l-frost-500' },
  parchment: { bg: 'bg-parchment-400/10', text: 'text-parchment-300', ring: 'ring-parchment-400/30', border: 'border-l-parchment-400' },
}

export function accentClasses(accent: string) {
  return ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.parchment
}

// A friendly illustrated empty state instead of a plain sentence — a dim
// campfire that never quite lit, waiting for the first entry.
export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-ink-600 py-12 text-center">
      <svg viewBox="0 0 64 64" className="size-14 animate-float text-ember-500/70" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 46 32 20l12 26" />
        <path d="M24 46 32 30l8 16" />
        <ellipse cx="32" cy="47" rx="16" ry="3" />
        <path d="M32 12c2 3 1 5-.5 6.5S29 22 32 24c2-2 3-4 2-6.5" className="text-ember-400 animate-flicker" />
      </svg>
      <p className="text-sm text-parchment-300">{message}</p>
      {hint && <p className="text-xs text-parchment-400">{hint}</p>}
    </div>
  )
}
