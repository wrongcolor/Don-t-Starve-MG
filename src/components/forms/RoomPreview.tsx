import type { RoomDef } from '../../types/worldContent'
import { WORLD_TILES } from '../../types/worldContent'
import { roomVisual } from '../panels/entityVisuals'

export function RoomPreview({ room }: { room: Partial<RoomDef> }) {
  const terrain = room.terrain ?? 'GRASS'
  const terrainLabel = WORLD_TILES.find((t) => t.value === terrain)?.label ?? terrain

  return (
    <div className="preview">
      <div className="preview-inner">
        <div className="preview-label">PREVIEW</div>
        <h2 className="preview-name">{room.id || 'Sem nome'}</h2>
        <div className="preview-art">{roomVisual(terrain)}</div>
        <div className="preview-cat">{terrainLabel}</div>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="lbl">🧱 Prefabs fixos</span>
            <span className="val">{room.fixedPrefabs?.length ?? 0}</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">🌿 Decoração espalhada</span>
            <span className="val">{room.scatter ? `${Math.round(room.scatter.percent * 100)}%` : '—'}</span>
          </div>
        </div>
        <hr className="preview-hr" />
        <div className="preview-sub">Tags</div>
        <div className="preview-tags">
          {(room.tags ?? []).map((tag) => (
            <div key={tag} className="preview-tag">
              {tag}
            </div>
          ))}
        </div>
        <div className="preview-sub">Prefabs obrigatórios</div>
        <div className="preview-desc">{room.requiredPrefabs?.join(', ') || '—'}</div>
      </div>
    </div>
  )
}
