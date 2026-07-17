import type { TaskDef } from '../../types/worldContent'
import { taskVisual } from '../panels/entityVisuals'

export function TaskPreview({ task }: { task: Partial<TaskDef> }) {
  const hasRegion = !!task.regionId

  return (
    <div className="preview">
      <div className="preview-inner">
        <div className="preview-label">PREVIEW</div>
        <h2 className="preview-name">{task.id || 'No name'}</h2>
        <div className="preview-art">{taskVisual(hasRegion)}</div>
        <div className="preview-cat">{hasRegion ? `Island: ${task.regionId}` : 'Mainland area'}</div>
        <div className="preview-stats">
          <div className="preview-stat">
            <span className="lbl">🚪 Rooms</span>
            <span className="val">{task.roomChoices?.length ?? 0}</span>
          </div>
          <div className="preview-stat">
            <span className="lbl">🗝️ Keys given</span>
            <span className="val">{task.keysGiven?.filter((k) => k !== 'NONE').length ?? 0}</span>
          </div>
        </div>
        <hr className="preview-hr" />
        <div className="preview-sub">Locks</div>
        <div className="preview-tags">
          {(task.locks ?? []).filter((l) => l !== 'NONE').map((lock) => (
            <div key={lock} className="preview-tag">
              {lock}
            </div>
          ))}
        </div>
        <div className="preview-sub">Background terrain</div>
        <div className="preview-desc">{task.backgroundTerrain || '—'}</div>
      </div>
    </div>
  )
}
