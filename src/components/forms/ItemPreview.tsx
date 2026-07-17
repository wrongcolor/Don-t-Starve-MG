import type { ItemDef } from '../../types/modProject'
import { categoryVisual } from '../panels/entityVisuals'

const CATEGORY_LABELS: Record<ItemDef['category'], string> = {
  tool: 'Ferramenta',
  weapon: 'Arma',
  armor: 'Armadura',
  food: 'Comida',
  generic: 'Genérico',
}

export function ItemPreview({ item }: { item: Partial<ItemDef> }) {
  const category = item.category ?? 'generic'
  const tags: string[] = []
  if (item.category === 'tool') tags.push('🔧 Ferramenta')
  if (item.weapon) tags.push('⚔️ Arma')
  if (item.armor) tags.push('🛡️ Armadura')
  if (item.weapon?.ranged?.onHitEffect === 'ignite') tags.push('🔥 Queima')
  if (item.weapon?.ranged?.onHitEffect === 'freeze') tags.push('❄️ Congela')
  if (item.spellEffect) tags.push('✨ Mágico')
  if (item.stackable) tags.push('📦 Empilhável')

  return (
    <div className="preview">
      <div className="preview-inner">
        <div className="preview-label">PREVIEW</div>
        <h2 className="preview-name">{item.displayName || 'Sem nome'}</h2>
        <div className="preview-art">{categoryVisual(category)}</div>
        <div className="preview-cat">{CATEGORY_LABELS[category]}</div>
        <div className="preview-stats">
          {item.weapon && (
            <div className="preview-stat">
              <span className="lbl">⚔️ Dano</span>
              <span className="val">{item.weapon.damage}</span>
            </div>
          )}
          {item.finiteuses && (
            <div className="preview-stat">
              <span className="lbl">✊ Usos máximos</span>
              <span className="val">{item.finiteuses.maxUses}</span>
            </div>
          )}
          {item.perishable && (
            <div className="preview-stat">
              <span className="lbl">⏳ Dura (dias)</span>
              <span className="val">{item.perishable.perishTimeDays}</span>
            </div>
          )}
          {item.weapon?.ranged && (
            <div className="preview-stat">
              <span className="lbl">↗️ Alcance</span>
              <span className="val">
                {item.weapon.ranged.minRange}–{item.weapon.ranged.maxRange}
              </span>
            </div>
          )}
          {item.armor && (
            <div className="preview-stat">
              <span className="lbl">🛡️ Absorção</span>
              <span className="val">{Math.round((item.armor.absorption ?? 0) * 100)}%</span>
            </div>
          )}
        </div>
        <hr className="preview-hr" />
        <div className="preview-sub">Características</div>
        <div className="preview-tags">
          {tags.map((tag) => (
            <div key={tag} className="preview-tag">
              {tag}
            </div>
          ))}
        </div>
        <div className="preview-sub">Descrição</div>
        <div className="preview-desc">{item.description || '—'}</div>
      </div>
    </div>
  )
}
