import type { CharacterDef } from '../../types/modProject'
import { characterVisual } from '../panels/entityVisuals'

const PERK_TAGS: Record<string, string> = {
  no_hunger: '🍗 Sem fome',
  no_sanity_drain: '🧠 Sanidade estável',
  fire_immune: '🔥 Imune a fogo',
  freeze_immune: '❄️ Imune a frio',
  night_vision: '🌙 Visão noturna',
  faster_walk: '🏃 Mais rápido',
}

export function CharacterPreview({ character }: { character: Partial<CharacterDef> }) {
  return (
    <div className="preview">
      <div className="preview-inner">
        <div className="preview-label">PREVIEW</div>
        <h2 className="preview-name">{character.name || 'Sem nome'}</h2>
        <div className="preview-art">{characterVisual()}</div>
        <div className="preview-cat">{character.title || '—'}</div>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="lbl">❤️ Vida</span>
            <span className="val">{character.stats?.health}</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">🍗 Fome</span>
            <span className="val">{character.stats?.hunger}</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">🧠 Sanidade</span>
            <span className="val">{character.stats?.sanity}</span>
          </div>
        </div>
        <hr className="preview-hr" />
        <div className="preview-sub">Perks</div>
        <div className="preview-tags">
          {(character.perks ?? []).map((perk) => (
            <div key={perk} className="preview-tag">
              {PERK_TAGS[perk] ?? perk}
            </div>
          ))}
        </div>
        <div className="preview-sub">Frase de efeito</div>
        <div className="preview-desc">{character.quote || '—'}</div>
      </div>
    </div>
  )
}
