import type { CharacterDef } from '../../types/modProject'
import { characterVisual } from '../panels/entityVisuals'

const PERK_TAGS: Record<string, string> = {
  no_hunger: '🍗 No hunger',
  no_sanity_drain: '🧠 Stable sanity',
  fire_immune: '🔥 Fire immune',
  freeze_immune: '❄️ Cold immune',
  night_vision: '🌙 Night vision',
  faster_walk: '🏃 Faster',
}

export function CharacterPreview({ character }: { character: Partial<CharacterDef> }) {
  return (
    <div className="preview">
      <div className="preview-inner">
        <div className="preview-label">PREVIEW</div>
        <h2 className="preview-name">{character.name || 'No name'}</h2>
        <div className="preview-art">{characterVisual()}</div>
        <div className="preview-cat">{character.title || '—'}</div>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="lbl">❤️ Health</span>
            <span className="val">{character.stats?.health}</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">🍗 Hunger</span>
            <span className="val">{character.stats?.hunger}</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">🧠 Sanity</span>
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
        <div className="preview-sub">Catchphrase</div>
        <div className="preview-desc">{character.quote || '—'}</div>
      </div>
    </div>
  )
}
