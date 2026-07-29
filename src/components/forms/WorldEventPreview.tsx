import type { WorldEventDef } from '../../types/worldEvent'

const TRIGGER_SUMMARY: Record<string, (trigger: WorldEventDef['trigger']) => string> = {
  phaseChange: (t) => `🌗 At ${(t as { phase: string }).phase}`,
  moonPhase: (t) => `🌕 ${(t as { moonPhase: string }).moonPhase} moon`,
  playerDeath: () => '💀 On player death',
  killCreature: (t) => `⚔️ On killing "${(t as { prefabId: string }).prefabId || '?'}"`,
  eatItem: (t) => {
    const prefabId = (t as { prefabId?: string }).prefabId
    return prefabId ? `🍖 On eating "${prefabId}"` : '🍖 On eating anything'
  },
  craftItem: (t) => `🔨 On crafting "${(t as { prefabId: string }).prefabId || '?'}"`,
  harvestItem: (t) => `🌾 On harvesting "${(t as { prefabId: string }).prefabId || '?'}"`,
}

export function WorldEventPreview({ event }: { event: Partial<WorldEventDef> }) {
  const trigger = event.trigger
  const triggerSummary = trigger ? TRIGGER_SUMMARY[trigger.kind]?.(trigger) : undefined

  return (
    <div className="preview">
      <div className="preview-inner">
        <div className="preview-label">PREVIEW</div>
        <h2 className="preview-name">{event.displayName || 'No name'}</h2>
        <div className="preview-art">🔔</div>
        <div className="preview-cat">{triggerSummary ?? 'No trigger set'}</div>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="lbl">🎲 Chance</span>
            <span className="val">{event.chance}</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">📏 Radius</span>
            <span className="val">{event.spawnRadius}</span>
          </div>
        </div>
        <hr className="preview-hr" />
        <div className="preview-sub">Spawns</div>
        <div className="preview-tags">
          {(event.spawnGroup ?? []).map((entry, i) => (
            <div key={i} className="preview-tag">
              {entry.count.min === entry.count.max ? entry.count.min : `${entry.count.min}-${entry.count.max}`}x {entry.prefabId || '?'}
            </div>
          ))}
          {(event.loot ?? []).map((drop, i) => (
            <div key={i} className="preview-tag">
              🎁 {drop.prefab || '?'} ({Math.round(drop.chance * 100)}%)
            </div>
          ))}
        </div>
        <div className="preview-sub">Description</div>
        <div className="preview-desc">{event.description || '—'}</div>
      </div>
    </div>
  )
}
