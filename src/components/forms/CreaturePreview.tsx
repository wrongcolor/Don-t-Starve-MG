import type { CreatureDef } from '../../types/modProject'
import { behaviorVisual } from '../panels/entityVisuals'

const BEHAVIOR_LABELS: Record<string, string> = {
  passive: 'Passive',
  neutral: 'Neutral',
  hostile: 'Hostile',
}

export function CreaturePreview({ creature }: { creature: Partial<CreatureDef> }) {
  const behavior = creature.behavior ?? 'neutral'
  const tags: string[] = []
  if (creature.flammable) tags.push('🔥 Catches fire')
  if (creature.freezable) tags.push('❄️ Freezes')
  if (creature.cookable) tags.push('🍖 Cookable')
  if (creature.sanityAura) tags.push(creature.sanityAura < 0 ? '👻 Scares' : '🌸 Soothes')

  return (
    <div className="preview">
      <div className="preview-inner">
        <div className="preview-label">PREVIEW</div>
        <h2 className="preview-name">{creature.displayName || 'No name'}</h2>
        <div className="preview-art">{behaviorVisual(behavior)}</div>
        <div className="preview-cat">{BEHAVIOR_LABELS[behavior]}</div>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="lbl">❤️ Health</span>
            <span className="val">{creature.stats?.health}</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">⚔️ Damage</span>
            <span className="val">{creature.stats?.damage}</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">⏱️ Attack period</span>
            <span className="val">{creature.stats?.attackPeriod}s</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">🏃 Speed</span>
            <span className="val">{creature.stats?.walkSpeed}</span>
          </div>
        </div>
        <hr className="preview-hr" />
        <div className="preview-sub">Traits</div>
        <div className="preview-tags">
          {tags.map((tag) => (
            <div key={tag} className="preview-tag">
              {tag}
            </div>
          ))}
          {(creature.tags ?? []).map((tag) => (
            <div key={tag} className="preview-tag">
              {tag}
            </div>
          ))}
        </div>
        <div className="preview-sub">Description</div>
        <div className="preview-desc">{creature.description || '—'}</div>
      </div>
    </div>
  )
}
