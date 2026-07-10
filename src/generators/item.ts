import type { ItemDef } from '../types/modProject'
import { toUpperSnake } from './luaUtils'

function componentBlock(item: ItemDef): string {
  const upper = toUpperSnake(item.id)
  const lines: string[] = []

  lines.push('    inst:AddComponent("inspectable")')
  lines.push('    inst:AddComponent("inventoryitem")')

  if (item.stackable) {
    lines.push('')
    lines.push('    inst:AddComponent("stackable")')
    lines.push(`    inst.components.stackable:SetMaxSize(TUNING.${upper}_STACK_SIZE)`)
  }

  if (item.weapon) {
    lines.push('')
    lines.push('    inst:AddComponent("weapon")')
    lines.push(`    inst.components.weapon:SetDamage(TUNING.${upper}_DAMAGE)`)
  }

  if (item.finiteuses) {
    lines.push('')
    lines.push('    inst:AddComponent("finiteuses")')
    lines.push(`    inst.components.finiteuses:SetMaxUses(TUNING.${upper}_USES)`)
    lines.push(`    inst.components.finiteuses:SetUses(TUNING.${upper}_USES)`)
    lines.push('    inst.components.finiteuses:SetOnFinished(inst.Remove)')
  }

  if (item.armor) {
    lines.push('')
    lines.push('    inst:AddComponent("armor")')
    lines.push(`    inst.components.armor:InitCondition(TUNING.${upper}_USES or 1, TUNING.${upper}_ABSORPTION)`)
  }

  if (item.perishable) {
    lines.push('')
    lines.push('    inst:AddComponent("perishable")')
    lines.push(`    inst.components.perishable:SetPerishTime(TUNING.${upper}_PERISH_TIME)`)
    lines.push('    inst.components.perishable:StartPerishing()')
    lines.push('    inst.components.perishable:SetOnPerishFn(inst.Remove)')
  }

  if (item.category === 'food') {
    lines.push('')
    lines.push('    inst:AddComponent("edible")')
    lines.push('    -- PLACEHOLDER: ajuste hunger/health/sanity conforme o balanceamento desejado')
    lines.push('    inst.components.edible.hungervalue = 12.5')
    lines.push('    inst.components.edible.healthvalue = 1')
  }

  return lines.join('\n')
}

// PLACEHOLDER assets: every mod needs real anim/build files produced with Klei's
// Spriter tooling — this generator cannot create art. See the bundled README.
export function generateItemPrefab(item: ItemDef): string {
  const lines: string[] = []

  lines.push('local assets =')
  lines.push('{')
  lines.push(`    Asset("ANIM", "anim/${item.id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
  lines.push(`    Asset("INV_IMAGE", "${item.id}"),`)
  lines.push('}')
  lines.push('')
  lines.push('local prefabs = {}')
  lines.push('')
  lines.push('local function fn()')
  lines.push('    local inst = CreateEntity()')
  lines.push('')
  lines.push('    inst.entity:AddTransform()')
  lines.push('    inst.entity:AddAnimState()')
  lines.push('    inst.entity:AddNetwork()')
  lines.push('')
  lines.push('    MakeInventoryPhysics(inst)')
  lines.push('')
  lines.push(`    inst.AnimState:SetBank("${item.id}")`)
  lines.push(`    inst.AnimState:SetBuild("${item.id}")`)
  lines.push('    inst.AnimState:PlayAnimation("idle")')
  lines.push('')
  lines.push('    inst:AddTag("item")')
  lines.push('')
  lines.push('    inst.entity:SetPristine()')
  lines.push('    if not TheWorld.ismastersim then')
  lines.push('        return inst')
  lines.push('    end')
  lines.push('')
  lines.push(componentBlock(item))
  lines.push('')
  lines.push('    return inst')
  lines.push('end')
  lines.push('')
  lines.push(`return Prefab("${item.id}", fn, assets, prefabs)`)

  return lines.join('\n') + '\n'
}

export function generateItemPlacerPrefab(item: ItemDef): string {
  const lines: string[] = []
  lines.push('local assets =')
  lines.push('{')
  lines.push(`    Asset("ANIM", "anim/${item.id}.zip"), -- PLACEHOLDER: mesmo build do item, ver README`)
  lines.push('}')
  lines.push('')
  lines.push('local function fn()')
  lines.push(`    return MakePlacer("${item.id}_placer", "${item.id}", "${item.id}", "idle")`)
  lines.push('end')
  lines.push('')
  lines.push(`return Prefab("${item.id}_placer", fn, assets)`)
  return lines.join('\n') + '\n'
}

export function generateItemFiles(item: ItemDef): Record<string, string> {
  const files: Record<string, string> = {
    [`scripts/prefabs/${item.id}.lua`]: generateItemPrefab(item),
  }
  if (item.recipe.placer) {
    files[`scripts/prefabs/${item.id}_placer.lua`] = generateItemPlacerPrefab(item)
  }
  return files
}
