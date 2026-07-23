import type { StructureDef } from '../../types/modProject'

// A 'vanilla' widget clones its grid from an existing container at runtime
// (patterns.md#20) — we never know its slot count ourselves, so show what we
// DO know (which prefab it's copying) instead of guessing a number.
function containerSlotsLabel(container: NonNullable<StructureDef['container']>): string {
  const widget = container.widget
  return widget.source === 'vanilla' ? `like ${widget.reusePrefab || '?'}` : String(widget.slots)
}

export function StructurePreview({ structure }: { structure: Partial<StructureDef> }) {
  const tags: string[] = ['🏗️ Structure (hammer-destroy, not an inventory item)']
  if (structure.container) tags.push('🎒 Container')
  if (structure.container?.preservation) tags.push('🧊 Preserves contents')
  if (structure.teleportPair) tags.push('🌀 Teleporter pair')
  if (structure.daySpawner) tags.push('🌙 Chance to spawn a mob each day')
  if (structure.resident) tags.push('🐷 Houses a resident')
  if (structure.prototyper) tags.push('🔬 Crafting station')

  return (
    <div className="preview">
      <div className="preview-inner">
        <div className="preview-label">PREVIEW</div>
        <h2 className="preview-name">{structure.displayName || 'No name'}</h2>
        <div className="preview-art">🏛️</div>
        <div className="preview-cat">Structure</div>
        <div className="preview-stats">
          {structure.container && (
            <div className="preview-stat">
              <span className="lbl">🎒 Slots</span>
              <span className="val">{containerSlotsLabel(structure.container)}</span>
            </div>
          )}
          {structure.daySpawner && (
            <div className="preview-stat">
              <span className="lbl">🌙 Spawn chance / range</span>
              <span className="val">
                {Math.round(structure.daySpawner.chance * 100)}% / {structure.daySpawner.range}
              </span>
            </div>
          )}
          {structure.loot && structure.loot.length > 0 && (
            <div className="preview-stat">
              <span className="lbl">💀 Loot drops</span>
              <span className="val">{structure.loot.length}</span>
            </div>
          )}
          {structure.resident && (
            <div className="preview-stat">
              <span className="lbl">🐷 Resident / respawn</span>
              <span className="val">
                {structure.resident.prefab} / {structure.resident.respawnDelayDays}d
              </span>
            </div>
          )}
          {structure.prototyper && (
            <div className="preview-stat">
              <span className="lbl">🔬 Unlocks</span>
              <span className="val">
                {structure.prototyper.category} {structure.prototyper.tier}
              </span>
            </div>
          )}
        </div>
        <hr className="preview-hr" />
        <div className="preview-sub">Traits</div>
        <div className="preview-tags">
          {tags.map((tag) => (
            <div key={tag} className="preview-tag">
              {tag}
            </div>
          ))}
        </div>
        <div className="preview-sub">Description</div>
        <div className="preview-desc">{structure.description || '—'}</div>
      </div>
    </div>
  )
}
