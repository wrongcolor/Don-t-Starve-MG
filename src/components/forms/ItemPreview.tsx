import type { ItemDef } from '../../types/modProject'
import { categoryVisual } from '../panels/entityVisuals'

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
  if (item.category === 'tool') tags.push('🔧 Tool')
  if (item.weapon) tags.push('⚔️ Weapon')
  if (item.armor) tags.push('🛡️ Armor')
  if (item.weapon?.ranged?.onHitEffect === 'ignite') tags.push('🔥 Burns')
  if (item.weapon?.ranged?.onHitEffect === 'freeze') tags.push('❄️ Freezes')
  if (item.spellEffect) tags.push('✨ Magic')
  if (item.stackable) tags.push('📦 Stackable')

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
          {item.armor && (
            <div className="preview-stat">
              <span className="lbl">🛡️ Absorption</span>
              <span className="val">{Math.round((item.armor.absorption ?? 0) * 100)}%</span>
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
