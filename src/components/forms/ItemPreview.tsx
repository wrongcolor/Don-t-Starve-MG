import type { ItemDef } from '../../types/modProject'
import { categoryVisual } from '../panels/entityVisuals'

// A 'vanilla' widget clones its grid from an existing container at runtime
// (patterns.md#20) — we never know its slot count ourselves, so show what we
// DO know (which prefab it's copying) instead of guessing a number.
function containerSlotsLabel(container: NonNullable<ItemDef['container']>): string {
  const widget = container.widget
  return widget.source === 'vanilla' ? `like ${widget.reusePrefab || '?'}` : String(widget.slots)
}

const CATEGORY_LABELS: Record<ItemDef['category'], string> = {
  tool: 'Tool',
  weapon: 'Weapon',
  armor: 'Armor',
  food: 'Food',
  generic: 'Generic',
}

export function ItemPreview({ item }: { item: Partial<ItemDef> }) {
  const category = item.category ?? 'generic'
  const tags: string[] = []
  if (item.recipe?.placer) tags.push('🏗️ Structure (not an inventory item)')
  if (item.category === 'tool') tags.push('🔧 Tool')
  if (item.weapon) tags.push('⚔️ Weapon')
  if (item.armor) tags.push(item.armor.equipSlot === 'head' ? '⛑️ Helmet' : '🛡️ Armor')
  if (item.weapon?.ranged?.onHitEffect === 'ignite') tags.push('🔥 Burns')
  if (item.weapon?.ranged?.onHitEffect === 'freeze') tags.push('❄️ Freezes')
  if (item.spellEffect) tags.push('✨ Magic')
  if (item.spellbook) tags.push('📖 Spellbook')
  if (item.stackable) tags.push('📦 Stackable')
  if (item.edible) tags.push('🍖 Edible')
  if (item.onEatBuff) tags.push('💪 Combat buff on eat')
  if (item.combinable) tags.push('🔗 Combinable')
  if (item.container) tags.push('🎒 Container')
  if (item.container?.preservation) tags.push('🧊 Preserves contents')
  if (item.teleportPair) tags.push('🌀 Teleporter pair')
  if (item.nameable) tags.push('✏️ Renameable')
  if (item.rechargeable) tags.push('🔋 Rechargeable')
  if (item.moonrelic) tags.push('🌙 Portal idol')

  return (
    <div className="preview">
      <div className="preview-inner">
        <div className="preview-label">PREVIEW</div>
        <h2 className="preview-name">{item.displayName || 'No name'}</h2>
        <div className="preview-art">{categoryVisual(category)}</div>
        <div className="preview-cat">{CATEGORY_LABELS[category]}</div>
        <div className="preview-stats">
          {item.weapon && (
            <div className="preview-stat">
              <span className="lbl">⚔️ Damage</span>
              <span className="val">{item.weapon.damage}</span>
            </div>
          )}
          {item.finiteuses && (
            <div className="preview-stat">
              <span className="lbl">✊ Max uses</span>
              <span className="val">{item.finiteuses.maxUses}</span>
            </div>
          )}
          {item.rechargeable && (
            <div className="preview-stat">
              <span className="lbl">🔋 Cooldown (s)</span>
              <span className="val">{item.rechargeable.cooldownSeconds}</span>
            </div>
          )}
          {item.perishable && (
            <div className="preview-stat">
              <span className="lbl">⏳ Lasts (days)</span>
              <span className="val">{item.perishable.perishTimeDays}</span>
            </div>
          )}
          {item.weapon?.ranged && (
            <div className="preview-stat">
              <span className="lbl">↗️ Range</span>
              <span className="val">
                {item.weapon.ranged.minRange}–{item.weapon.ranged.maxRange}
              </span>
            </div>
          )}
          {item.weapon?.meleeRange !== undefined && (
            <div className="preview-stat">
              <span className="lbl">↗️ Range</span>
              <span className="val">{item.weapon.meleeRange}</span>
            </div>
          )}
          {item.armor && (
            <div className="preview-stat">
              <span className="lbl">🛡️ Absorption</span>
              <span className="val">{Math.round((item.armor.absorption ?? 0) * 100)}%</span>
            </div>
          )}
          {item.edible && (
            <div className="preview-stat">
              <span className="lbl">🍗 Hunger / Health / Sanity</span>
              <span className="val">
                {item.edible.hungerValue} / {item.edible.healthValue} / {item.edible.sanityValue}
              </span>
            </div>
          )}
          {item.container && (
            <div className="preview-stat">
              <span className="lbl">🎒 Slots</span>
              <span className="val">{containerSlotsLabel(item.container)}</span>
            </div>
          )}
          {item.onEatBuff && (
            <div className="preview-stat">
              <span className="lbl">💪 Damage buff</span>
              <span className="val">
                +{Math.round(item.onEatBuff.damageMultiplier * 100)}% ({item.onEatBuff.durationSeconds}s)
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
        <div className="preview-desc">{item.description || '—'}</div>
      </div>
    </div>
  )
}
