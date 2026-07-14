import type { ItemDef } from '../types/modProject'
import { luaString, toUpperSnake } from './luaUtils'

// Items with no animation choice keep the previous default: a custom build named
// after the item's own id, which the user must supply as anim/<id>.zip (see README).
function resolveAnimationBuild(item: ItemDef): string {
  const anim = item.animation ?? { source: 'custom' as const }
  return anim.source === 'vanilla' ? anim.build : item.id
}

function isVanillaAnimation(item: ItemDef): boolean {
  return (item.animation ?? { source: 'custom' as const }).source === 'vanilla'
}

// Confirmed against axe.lua/pickaxe.lua/spear.lua/hambat.lua (docs/dst-knowledge/patterns.md#2):
// any item meant to be held in combat/work needs a SEPARATE "swap_*" build for the
// in-hand look, swapped onto the character's "swap_object" hand symbol on equip.
export function isHandheld(item: ItemDef): boolean {
  return item.category === 'tool' || item.weapon !== undefined
}

// Confirmed in staff.lua (firestaff/icestaff onattack_red/onattack_blue): sanity
// cost and on-hit elemental effects both live in the weapon's SetOnAttack callback.
// Only one callback can be registered, so both features share this single function.
function needsOnAttack(item: ItemDef): boolean {
  if (!item.weapon) return false
  const hasSanityCost = item.weapon.sanityCostOnUse !== undefined
  const hasHitEffect = item.weapon.ranged?.onHitEffect !== undefined && item.weapon.ranged.onHitEffect !== 'none'
  return hasSanityCost || hasHitEffect
}

function onAttackFunctionBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  const lines = ['local function onattack(inst, attacker, target)']
  if (item.weapon?.sanityCostOnUse !== undefined) {
    lines.push('    if attacker ~= nil and attacker.components.sanity ~= nil then')
    lines.push(`        attacker.components.sanity:DoDelta(-TUNING.${upper}_SANITY_COST)`)
    lines.push('    end')
  }
  const effect = item.weapon?.ranged?.onHitEffect
  if (effect === 'ignite') {
    lines.push('    if target ~= nil and target:IsValid() and target.components.burnable ~= nil then')
    lines.push('        target.components.burnable:Ignite(true, attacker)')
    lines.push('    end')
  } else if (effect === 'freeze') {
    lines.push('    if target ~= nil and target:IsValid() and target.components.freezable ~= nil then')
    lines.push('        target.components.freezable:AddColdness(1)')
    lines.push('    end')
  }
  lines.push('end')
  lines.push('')
  return lines
}

// Confirmed in staff.lua (yellowstaff/opalstaff createlight + light_reticuletargetfn):
// spellcaster + reticule to target a point, spawning an existing vanilla light prefab
// there. spellcaster itself supports arbitrary effects, but we only offer this one
// concrete instance — see docs/dst-knowledge/patterns.md#7 for why it's not generalized.
function needsSpellcaster(item: ItemDef): boolean {
  return item.spellEffect !== undefined
}

function spellFunctionBlock(): string[] {
  return [
    'local function spell_reticuletargetfn()',
    '    return Vector3(ThePlayer.entity:LocalToWorldSpace(5, 0.001, 0))',
    'end',
    '',
    'local function createlight(staff, target, pos)',
    '    local light = SpawnPrefab("stafflight") -- reaproveita o prefab de luz do jogo base',
    '    light.Transform:SetPosition(pos:Get())',
    '    if staff.components.finiteuses ~= nil then',
    '        staff.components.finiteuses:Use(1)',
    '    end',
    'end',
    '',
  ]
}

function componentBlock(item: ItemDef): string {
  const upper = toUpperSnake(item.id)
  const lines: string[] = []

  lines.push('    inst:AddComponent("inspectable")')
  lines.push('    inst:AddComponent("inventoryitem")')

  if (item.category === 'tool' && item.toolAction) {
    lines.push('')
    lines.push('    inst:AddComponent("tool")')
    lines.push(`    inst.components.tool:SetAction(ACTIONS.${item.toolAction})`)
  }

  if (item.stackable) {
    lines.push('')
    lines.push('    inst:AddComponent("stackable")')
    lines.push(`    inst.components.stackable:SetMaxSize(TUNING.${upper}_STACK_SIZE)`)
  }

  if (item.weapon) {
    lines.push('')
    lines.push('    inst:AddComponent("weapon")')
    lines.push(`    inst.components.weapon:SetDamage(TUNING.${upper}_DAMAGE)`)
    if (item.weapon.ranged) {
      lines.push(`    inst.components.weapon:SetRange(TUNING.${upper}_MIN_RANGE, TUNING.${upper}_MAX_RANGE)`)
      lines.push(`    inst.components.weapon:SetProjectile(${luaString(item.weapon.ranged.projectilePrefab)})`)
    }
    if (needsOnAttack(item)) {
      lines.push('    inst.components.weapon:SetOnAttack(onattack)')
    }
  }

  if (item.finiteuses) {
    lines.push('')
    lines.push('    inst:AddComponent("finiteuses")')
    lines.push(`    inst.components.finiteuses:SetMaxUses(TUNING.${upper}_USES)`)
    lines.push(`    inst.components.finiteuses:SetUses(TUNING.${upper}_USES)`)
    lines.push('    inst.components.finiteuses:SetOnFinished(inst.Remove)')
    if (item.category === 'tool' && item.toolAction) {
      lines.push(`    inst.components.finiteuses:SetConsumption(ACTIONS.${item.toolAction}, 1)`)
    }
    if (item.finiteuses.ignoreCombatDurabilityLoss) {
      lines.push('    inst.components.finiteuses:SetIgnoreCombatDurabilityLoss(true)')
    }
  }

  if (item.armor) {
    lines.push('')
    lines.push('    inst:AddComponent("armor")')
    lines.push(`    inst.components.armor:InitCondition(TUNING.${upper}_USES or 1, TUNING.${upper}_ABSORPTION)`)
  }

  if (isHandheld(item)) {
    lines.push('')
    lines.push('    inst:AddComponent("equippable")')
    lines.push('    inst.components.equippable:SetOnEquip(onequip)')
    lines.push('    inst.components.equippable:SetOnUnequip(onunequip)')
    if (item.equipWalkSpeedMult !== undefined) {
      lines.push(`    inst.components.equippable.walkspeedmult = ${item.equipWalkSpeedMult}`)
    }
  }

  if (needsSpellcaster(item)) {
    lines.push('')
    lines.push('    inst:AddComponent("reticule")')
    lines.push('    inst.components.reticule.targetfn = spell_reticuletargetfn')
    lines.push('')
    lines.push('    inst:AddComponent("spellcaster")')
    lines.push('    inst.components.spellcaster:SetSpellFn(createlight)')
    lines.push('    inst.components.spellcaster.canuseonpoint = true')
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

// onequip/onunequip: confirmed identical across axe/pickaxe/shovel/spear/hambat
// (docs/dst-knowledge/patterns.md#2). Swaps the character's "swap_object" hand
// symbol to this item's own "swap_<build>" build, and shows the carry-pose arm.
function equipFunctionsBlock(item: ItemDef): string[] {
  const swapBuild = `swap_${resolveAnimationBuild(item)}`
  return [
    'local function onequip(inst, owner)',
    `    owner.AnimState:OverrideSymbol("swap_object", ${luaString(swapBuild)}, ${luaString(swapBuild)})`,
    '    owner.AnimState:Show("ARM_carry")',
    '    owner.AnimState:Hide("ARM_normal")',
    'end',
    '',
    'local function onunequip(inst, owner)',
    '    owner.AnimState:Hide("ARM_carry")',
    '    owner.AnimState:Show("ARM_normal")',
    'end',
    '',
  ]
}

// Assets: when the item reuses a vanilla build (item.animation.source === 'vanilla'),
// no Asset("ANIM", ...) is declared — that animation data is already loaded by the
// base game. Otherwise this is a PLACEHOLDER: the user must supply anim/<id>.zip
// produced with Klei's Spriter tooling — this generator cannot create art. Handheld
// items (tool/weapon) also need a SEPARATE swap_<build>.zip for the in-hand look
// (see docs/dst-knowledge/patterns.md#2) — not needed for a vanilla-build item that
// isn't handheld (e.g. a reused trinket build).
export function generateItemPrefab(item: ItemDef): string {
  const lines: string[] = []
  const build = resolveAnimationBuild(item)
  const handheld = isHandheld(item)

  lines.push('local assets =')
  lines.push('{')
  if (isVanillaAnimation(item)) {
    lines.push(`    -- Build "${build}" reaproveitado do jogo base, sem asset próprio necessário.`)
    if (handheld) {
      lines.push(
        `    -- ATENÇÃO: build vanilla escolhido para um item empunhável — confirme se "swap_${build}" existe no jogo base antes de publicar.`,
      )
    }
  } else {
    lines.push(`    Asset("ANIM", "anim/${item.id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
    if (handheld) {
      lines.push(`    Asset("ANIM", "anim/swap_${item.id}.zip"), -- PLACEHOLDER: aparência na mão, ver README`)
    }
  }
  lines.push(`    Asset("INV_IMAGE", "${item.id}"),`)
  lines.push('}')
  lines.push('')
  if (handheld) {
    lines.push(...equipFunctionsBlock(item))
  }
  if (needsOnAttack(item)) {
    lines.push(...onAttackFunctionBlock(item))
  }
  if (needsSpellcaster(item)) {
    lines.push(...spellFunctionBlock())
  }
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
  lines.push(`    inst.AnimState:SetBank(${luaString(build)})`)
  lines.push(`    inst.AnimState:SetBuild(${luaString(build)})`)
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
  const build = resolveAnimationBuild(item)

  lines.push('local assets =')
  lines.push('{')
  if (isVanillaAnimation(item)) {
    lines.push(`    -- Build "${build}" reaproveitado do jogo base, sem asset próprio necessário.`)
  } else {
    lines.push(`    Asset("ANIM", "anim/${item.id}.zip"), -- PLACEHOLDER: mesmo build do item, ver README`)
  }
  lines.push('}')
  lines.push('')
  lines.push('local function fn()')
  lines.push(`    return MakePlacer(${luaString(item.id + '_placer')}, ${luaString(build)}, ${luaString(build)}, "idle")`)
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
