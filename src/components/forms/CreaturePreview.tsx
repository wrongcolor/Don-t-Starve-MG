import type { CreatureDef } from '../../types/modProject'
import { behaviorVisual } from '../panels/entityVisuals'

const BEHAVIOR_LABELS: Record<string, string> = {
  passive: 'Passiva',
  neutral: 'Neutra',
  hostile: 'Hostil',
}

export function CreaturePreview({ creature }: { creature: Partial<CreatureDef> }) {
  const behavior = creature.behavior ?? 'neutral'
  const tags: string[] = []
  if (creature.flammable) tags.push('🔥 Pega fogo')
  if (creature.freezable) tags.push('❄️ Congela')
  if (creature.cookable) tags.push('🍖 Cozinhável')
  if (creature.sanityAura) tags.push(creature.sanityAura < 0 ? '👻 Assusta' : '🌸 Acalma')

  return (
    <div className="preview">
      <div className="preview-inner">
        <div className="preview-label">PREVIEW</div>
        <h2 className="preview-name">{creature.displayName || 'Sem nome'}</h2>
        <div className="preview-art">{behaviorVisual(behavior)}</div>
        <div className="preview-cat">{BEHAVIOR_LABELS[behavior]}</div>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="lbl">❤️ Vida</span>
            <span className="val">{creature.stats?.health}</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">⚔️ Dano</span>
            <span className="val">{creature.stats?.damage}</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">⏱️ Período de ataque</span>
            <span className="val">{creature.stats?.attackPeriod}s</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">🏃 Velocidade</span>
            <span className="val">{creature.stats?.walkSpeed}</span>
          </div>
        </div>
        <hr className="preview-hr" />
        <div className="preview-sub">Características</div>
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
        <div className="preview-sub">Descrição</div>
        <div className="preview-desc">{creature.description || '—'}</div>
      </div>
    </div>
  )
}
