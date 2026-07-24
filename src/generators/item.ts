import type { ItemDef, Container } from '../types/modProject'
import { luaString, toUpperSnake } from './luaUtils'
import { groundAttackFunctionBlock } from './groundAttack'

// Shared by both Item and Structure containers — takes the container config
// directly (not a whole ItemDef) so structure.ts can reuse these too.
// Only meaningful for a 'custom' widget — a 'vanilla' one clones its grid at
// runtime via deepcopy (patterns.md#20), so we never know its slot count
// ourselves. Shared with modmain.ts, which needs the same numbers to build
// the custom grid.
export function containerSlotCount(container: Container | undefined): number {
  const widget = container?.widget
  return widget?.source === 'custom' ? widget.slots : 0
}

export function containerColumns(container: Container | undefined): number {
  const widget = container?.widget
  return widget?.source === 'custom' ? widget.columns : 0
}

// The UI build a 'custom' container widget needs — always named after its
// host's own id, distinct from its inventory-icon build.
export function containerCustomWidgetBuild(id: string): string {
  return `ui_${id}`
}

// Items with no animation choice keep the previous default: a custom build named
// after the item's own id, which the user must supply as anim/<id>.zip (see README).
// 'vanillaHat' resolves to the hat's real build name ("hat_<name>", confirmed in
// hats.lua) — this is also what the swap_hat override in hatEquipFunctionsBlock ends
// up using, since a hat's own build IS its swap_hat build (no separate swap_* file).
function resolveAnimationBuild(item: ItemDef): string {
  const anim = item.animation ?? { source: 'custom' as const }
  if (anim.source === 'vanillaHat') return `hat_${anim.hatName}`
  return anim.source === 'vanilla' ? anim.build : item.id
}

function isVanillaAnimation(item: ItemDef): boolean {
  const source = (item.animation ?? { source: 'custom' as const }).source
  return source === 'vanilla' || source === 'vanillaHat'
}

// Confirmed in hats.lua's simple() constructor: a hat's AnimState bank is NOT the
// same string as its build (unlike every other reuse mode this tool models) — bank
// is "<name>hat", build is "hat_<name>". Only matters for 'vanillaHat'; every other
// mode keeps bank === build.
function resolveAnimationBank(item: ItemDef): string {
  const anim = item.animation
  return anim?.source === 'vanillaHat' ? `${anim.hatName}hat` : resolveAnimationBuild(item)
}

// Confirmed in hats.lua: a hat's idle animation clip is named "anim", not "idle"
// like every other build this tool reuses.
function resolveIdleClip(item: ItemDef): string {
  return item.animation?.source === 'vanillaHat' ? 'anim' : 'idle'
}

// Confirmed against axe.lua/pickaxe.lua/spear.lua/hambat.lua (docs/dst-knowledge/patterns.md#2):
// any item meant to be held in combat/work needs a SEPARATE "swap_*" build for the
// in-hand look, swapped onto the character's "swap_object" hand symbol on equip.
export function isHandheld(item: ItemDef): boolean {
  return item.category === 'tool' || item.weapon !== undefined
}

// Confirmed in armor_grass.lua/armor_wood.lua/armor_marble.lua/armor_sanity.lua/
// armor_bramble.lua (docs/dst-knowledge/patterns.md#11) for body armor, and in
// hats.lua for head armor: both use a DIFFERENT equip mechanism than hand-held
// items (own build instead of a separate swap_<id> build, ClearOverrideSymbol
// instead of arm show/hide) — see armorEquipFunctionsBlock/hatEquipFunctionsBlock
// for the exact per-slot visuals. If an item is somehow both (weapon + armor),
// handheld wins so we don't generate two conflicting onequip/onunequip pairs.
export function isWearableArmor(item: ItemDef): boolean {
  return item.armor !== undefined && !isHandheld(item)
}

function armorEquipSlot(item: ItemDef): 'body' | 'head' {
  return item.armor?.equipSlot === 'head' ? 'head' : 'body'
}

function needsArmorTakeDamage(item: ItemDef): boolean {
  return item.armor?.sanityLossOnHitPercent !== undefined
}

function armorTakeDamageFunctionBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  return [
    'local function onarmortakedamage(inst, damage_amount)',
    '    local owner = inst.components.inventoryitem.owner',
    '    if owner ~= nil and owner.components.sanity ~= nil then',
    `        owner.components.sanity:DoDelta(-damage_amount * TUNING.${upper}_SANITY_LOSS_PERCENT, false)`,
    '    end',
    'end',
    '',
  ]
}

// Confirmed in staff.lua (firestaff/icestaff onattack_red/onattack_blue): sanity
// cost and on-hit elemental effects both live in the weapon's SetOnAttack callback.
// Only one callback can be registered, so both features share this single function.
function needsOnAttack(item: ItemDef): boolean {
  if (!item.weapon) return false
  const hasSanityCost = item.weapon.sanityCostOnUse !== undefined
  const hasHitEffect = item.weapon.ranged?.onHitEffect !== undefined && item.weapon.ranged.onHitEffect !== 'none'
  const hasRecharge = item.rechargeable !== undefined
  return hasSanityCost || hasHitEffect || hasRecharge
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
  if (item.rechargeable !== undefined) {
    lines.push('    if inst.components.rechargeable ~= nil then')
    lines.push(`        inst.components.rechargeable:Discharge(TUNING.${upper}_COOLDOWN)`)
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
// tameBomb and groundAttack both reuse this exact same aim-a-point mechanism
// (mutually exclusive with spellEffect and each other, enforced by schema
// refines) to throw a different effect — see generateTameCloudPrefab and
// groundAttackFunctionBlock.
function needsSpellcaster(item: ItemDef): boolean {
  return item.spellEffect !== undefined || item.tameBomb !== undefined || item.groundAttack !== undefined
}

function tameCloudId(item: ItemDef): string {
  return `${item.id}_cloud`
}

function spellcasterFunctionName(item: ItemDef): string {
  if (item.tameBomb !== undefined) return 'throwtamecloud'
  if (item.groundAttack !== undefined) return 'throwgroundattack'
  return 'createlight'
}

function spellFunctionBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  const lines = [
    'local function spell_reticuletargetfn()',
    '    return Vector3(ThePlayer.entity:LocalToWorldSpace(5, 0.001, 0))',
    'end',
    '',
  ]
  if (item.tameBomb !== undefined) {
    lines.push(
      'local function throwtamecloud(staff, target, pos)',
      `    local cloud = SpawnPrefab(${luaString(tameCloudId(item))})`,
      '    cloud.Transform:SetPosition(pos:Get())',
      '    cloud:SetOwner(staff.components.inventoryitem.owner)',
      '    if staff.components.finiteuses ~= nil then',
      '        staff.components.finiteuses:Use(1)',
      '    end',
    )
  } else if (item.groundAttack !== undefined) {
    lines.push(...groundAttackFunctionBlock(item.id, item.groundAttack))
    lines.push(
      'local function throwgroundattack(staff, target, pos)',
      '    dogroundattack(pos)',
      '    if staff.components.finiteuses ~= nil then',
      '        staff.components.finiteuses:Use(1)',
      '    end',
    )
  } else {
    lines.push(
      'local function createlight(staff, target, pos)',
      '    local light = SpawnPrefab("stafflight") -- reaproveita o prefab de luz do jogo base',
      '    light.Transform:SetPosition(pos:Get())',
      '    if staff.components.finiteuses ~= nil then',
      '        staff.components.finiteuses:Use(1)',
      '    end',
    )
  }
  if (item.rechargeable !== undefined) {
    lines.push('    if staff.components.rechargeable ~= nil then')
    lines.push(`        staff.components.rechargeable:Discharge(TUNING.${upper}_COOLDOWN)`)
    lines.push('    end')
  }
  lines.push('end')
  lines.push('')
  return lines
}

// Confirmed against the real game scripts (docs/dst-knowledge/patterns.md#29):
// SetItems takes an array of {label, onselect, execute}, where onselect wires
// up the actual spell function and execute triggers the cast — the open/close/
// cast actions themselves are already built into the base game. Simplified to
// a self-cast SpawnPrefab (no aoetargeting, no character exclusivity).
function needsSpellbook(item: ItemDef): boolean {
  return item.spellbook !== undefined
}

function spellbookFunctionBlock(item: ItemDef): string[] {
  const spells = item.spellbook?.spells ?? []
  const lines: string[] = []

  spells.forEach((spell, index) => {
    lines.push(`local function spellbook_cast_${index + 1}(inst, user)`)
    // Only meaningful for a caster with CharacterDef.mana (see
    // characterManaSchema) — anyone else has no `mana` component, so the
    // check is skipped and the spell always casts, same as before this field
    // existed.
    if (spell.manaCost !== undefined && spell.manaCost > 0) {
      lines.push(`    if user.components.mana ~= nil and not user.components.mana:Spend(${spell.manaCost}) then`)
      lines.push('        return false')
      lines.push('    end')
    }
    lines.push(`    local fx = SpawnPrefab(${luaString(spell.summonPrefab)})`)
    lines.push('    if fx ~= nil then')
    lines.push('        fx.Transform:SetPosition(user.Transform:GetWorldPosition())')
    lines.push('    end')
    lines.push('    if inst.components.finiteuses ~= nil then')
    lines.push('        inst.components.finiteuses:Use(1)')
    lines.push('    end')
    lines.push('    return true')
    lines.push('end')
    lines.push('')
  })

  lines.push('local SPELLBOOK_SPELLS =')
  lines.push('{')
  spells.forEach((spell, index) => {
    const label = luaString(spell.label)
    lines.push('    {')
    lines.push(`        label = ${label},`)
    lines.push('        onselect = function(inst)')
    lines.push(`            inst.components.spellbook:SetSpellName(${label})`)
    lines.push(`            inst.components.spellbook:SetSpellFn(spellbook_cast_${index + 1})`)
    lines.push('        end,')
    lines.push('        execute = function(inst)')
    lines.push('            local inventory = ThePlayer.replica.inventory')
    lines.push('            if inventory ~= nil then')
    lines.push('                inventory:CastSpellBookFromInv(inst)')
    lines.push('            end')
    lines.push('        end,')
    lines.push('    },')
  })
  lines.push('}')
  lines.push('')
  return lines
}

function needsOnEaten(item: ItemDef): boolean {
  return item.onEatBuff !== undefined
}

// Adapted from a real published Workshop mod ("Repair Combine", see
// docs/dst-knowledge/patterns.md#19) — simplified to: sum both items' remaining
// durability %, cap at 100%, consume the second item. Priority order (finiteuses
// > armor > perishable) mirrors the source mod's own if/elseif chain.
function combineWithFunctionBlock(): string[] {
  return [
    'local function CombineWith(inst, material)',
    '    if material == nil or not material:IsValid() or material == inst or material.prefab ~= inst.prefab then',
    '        return false',
    '    end',
    '',
    '    if inst.components.finiteuses ~= nil and material.components.finiteuses ~= nil then',
    '        inst.components.finiteuses:SetPercent(math.min(inst.components.finiteuses:GetPercent() + material.components.finiteuses:GetPercent(), 1))',
    '    elseif inst.components.armor ~= nil and material.components.armor ~= nil then',
    '        inst.components.armor:SetPercent(math.min(inst.components.armor:GetPercent() + material.components.armor:GetPercent(), 1))',
    '    elseif inst.components.perishable ~= nil and material.components.perishable ~= nil then',
    '        inst.components.perishable:SetPercent(math.min(inst.components.perishable:GetPercent() + material.components.perishable:GetPercent(), 1))',
    '    else',
    '        return false',
    '    end',
    '',
    '    material:Remove()',
    '    return true',
    'end',
    '',
  ]
}

// Confirmed via real published Workshop mods (docs/dst-knowledge/patterns.md#18):
// edible:SetOnEatenFn(fn) runs the callback when the eater finishes eating, and
// combat.externaldamagemultipliers (a SourceModifierList) lets a named modifier be
// added and later removed by the same key. SetModifier takes the FINAL multiplier,
// hence the "1 +".
function onEatenFunctionBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  const buffKey = luaString(`${item.id}_damage_buff`)
  return [
    'local function oneaten(inst, eater)',
    '    if eater == nil or eater.components.combat == nil then return end',
    '',
    `    eater.components.combat.externaldamagemultipliers:SetModifier(inst, 1 + TUNING.${upper}_DAMAGE_BUFF_MULT, ${buffKey})`,
    `    eater:DoTaskInTime(TUNING.${upper}_DAMAGE_BUFF_DURATION, function()`,
    '        if eater.components.combat ~= nil then',
    `            eater.components.combat.externaldamagemultipliers:RemoveModifier(inst, ${buffKey})`,
    '        end',
    '    end)',
    'end',
    '',
  ]
}

// Adapted from a real published Workshop mod ("Renameable Watches", see
// docs/dst-knowledge/patterns.md#24) — named + writeable is the confirmed
// vanilla mechanism behind signs/gravestones: the player can type a custom
// name for the item. onnamed just writes it into the named component.
function onNamedFunctionBlock(): string[] {
  return [
    'local function onnamed(inst, name)',
    '    if inst.components.named ~= nil then',
    '        inst.components.named:SetName(name)',
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
    } else if (item.weapon.meleeRange !== undefined) {
      lines.push(`    inst.components.weapon:SetRange(TUNING.${upper}_MELEE_RANGE)`)
    }
    if (needsOnAttack(item)) {
      lines.push('    inst.components.weapon:SetOnAttack(onattack)')
    }
  }

  if (item.rechargeable) {
    lines.push('')
    lines.push('    inst:AddComponent("rechargeable")')
    lines.push(`    inst.components.rechargeable:SetChargeTime(TUNING.${upper}_COOLDOWN)`)
    // Confirmed in the same source mod: shows a "RECHARGING" status on the
    // item's tooltip while it's on cooldown.
    lines.push('    inst.components.inspectable.getstatus = function(inst)')
    lines.push('        return (inst.components.rechargeable ~= nil and not inst.components.rechargeable:IsCharged()) and "RECHARGING" or nil')
    lines.push('    end')
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
    lines.push(`    inst.components.armor:InitCondition(TUNING.${upper}_CONDITION, TUNING.${upper}_ABSORPTION)`)
    if (item.armor.weakness) {
      lines.push(
        `    inst.components.armor:AddWeakness(${luaString(item.armor.weakness.tag)}, ${item.armor.weakness.extraDamage})`,
      )
    }
    if (needsArmorTakeDamage(item)) {
      lines.push('    inst.components.armor.ontakedamage = onarmortakedamage')
    }
    if (item.armor.flammable) {
      lines.push('')
      lines.push('    inst:AddComponent("fuel")')
      lines.push('    inst.components.fuel.fuelvalue = TUNING.LARGE_FUEL')
      lines.push('    MakeSmallBurnable(inst, TUNING.SMALL_BURNTIME)')
      lines.push('    MakeSmallPropagator(inst)')
    }
  }

  if (isHandheld(item) || isWearableArmor(item)) {
    lines.push('')
    lines.push('    inst:AddComponent("equippable")')
    if (isWearableArmor(item)) {
      lines.push(`    inst.components.equippable.equipslot = EQUIPSLOTS.${armorEquipSlot(item).toUpperCase()}`)
    }
    lines.push('    inst.components.equippable:SetOnEquip(onequip)')
    lines.push('    inst.components.equippable:SetOnUnequip(onunequip)')
    if (item.equipWalkSpeedMult !== undefined) {
      lines.push(`    inst.components.equippable.walkspeedmult = ${item.equipWalkSpeedMult}`)
    }
    if (item.armor?.dapperness !== undefined) {
      lines.push(`    inst.components.equippable.dapperness = ${item.armor.dapperness}`)
    }
  }

  if (needsSpellcaster(item)) {
    lines.push('')
    lines.push('    inst:AddComponent("reticule")')
    lines.push('    inst.components.reticule.targetfn = spell_reticuletargetfn')
    lines.push('')
    lines.push('    inst:AddComponent("spellcaster")')
    lines.push(`    inst.components.spellcaster:SetSpellFn(${spellcasterFunctionName(item)})`)
    lines.push('    inst.components.spellcaster.canuseonpoint = true')
  }

  if (needsSpellbook(item)) {
    lines.push('')
    lines.push('    inst:AddComponent("spellbook")')
    lines.push('    inst.components.spellbook:SetItems(SPELLBOOK_SPELLS)')
  }

  if (item.perishable) {
    lines.push('')
    lines.push('    inst:AddComponent("perishable")')
    lines.push(`    inst.components.perishable:SetPerishTime(TUNING.${upper}_PERISH_TIME)`)
    lines.push('    inst.components.perishable:StartPerishing()')
    lines.push('    inst.components.perishable:SetOnPerishFn(inst.Remove)')
  }

  if (item.edible) {
    lines.push('')
    lines.push('    inst:AddComponent("edible")')
    lines.push(`    inst.components.edible.foodtype = FOODTYPE.${item.edible.foodType}`)
    lines.push(`    inst.components.edible.healthvalue = TUNING.${upper}_HEALTH`)
    lines.push(`    inst.components.edible.hungervalue = TUNING.${upper}_HUNGER`)
    lines.push(`    inst.components.edible.sanityvalue = TUNING.${upper}_SANITY`)
    if (needsOnEaten(item)) {
      lines.push('    inst.components.edible:SetOnEatenFn(oneaten)')
    }
  }

  if (item.combinable) {
    lines.push('')
    lines.push('    inst.CombineWith = CombineWith')
  }

  if (item.container) {
    lines.push('')
    lines.push('    inst:AddComponent("container")')
    lines.push(`    inst.components.container:WidgetSetup(${luaString(item.id)})`)
    // Confirmed in a second real mod ("Winona Toolbox", patterns.md#20): close
    // the container when it's put away, so it doesn't stay visually open.
    lines.push('    inst.components.inventoryitem:SetOnPutInInventoryFn(function(inst)')
    lines.push('        inst.components.container:Close()')
    lines.push('    end)')
    if (item.container.preservation) {
      lines.push('')
      lines.push('    inst:AddComponent("preserver")')
      lines.push(`    inst.components.preserver:SetPerishRateMultiplier(${item.container.preservation.perishRateMultiplier})`)
      if (item.container.preservation.temperatureRateMultiplier !== undefined) {
        lines.push(
          `    inst.components.preserver:SetTemperatureRateMultiplier(${item.container.preservation.temperatureRateMultiplier})`,
        )
      }
    }
  }

  if (item.nameable) {
    lines.push('')
    lines.push('    inst:AddComponent("named")')
    lines.push('')
    lines.push('    inst:AddComponent("writeable")')
    lines.push('    inst.components.writeable:SetDefaultWriteable(false)')
    lines.push('    inst.components.writeable:SetAutomaticDescriptionEnabled(false)')
    lines.push('    inst.components.writeable:SetWriteableDistance(1)')
    lines.push('    inst.components.writeable:SetOnWrittenFn(onnamed)')
  }

  if (item.moonrelic) {
    lines.push('')
    lines.push('    inst:AddComponent("moonrelic")')
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

// Confirmed identical across armor_grass/armor_wood/armor_marble/armor_sanity/
// armor_bramble (docs/dst-knowledge/patterns.md#11): armor reuses its OWN build
// for the body symbol (no separate swap_* build needed), and plays a sound via
// the "blocked" event instead of showing/hiding an arm symbol.
function armorEquipFunctionsBlock(item: ItemDef): string[] {
  const build = resolveAnimationBuild(item)
  return [
    'local function onblocked_armor(owner)',
    '    owner.SoundEmitter:PlaySound("dontstarve/wilson/hit_armour")',
    'end',
    '',
    'local function onequip(inst, owner)',
    `    owner.AnimState:OverrideSymbol("swap_body", ${luaString(build)}, "swap_body")`,
    '    inst:ListenForEvent("blocked", onblocked_armor, owner)',
    'end',
    '',
    'local function onunequip(inst, owner)',
    '    owner.AnimState:ClearOverrideSymbol("swap_body")',
    '    inst:RemoveEventCallback("blocked", onblocked_armor, owner)',
    'end',
    '',
  ]
}

// Confirmed in hats.lua's shared MakeHat() equip logic (e.g. the "football" head-slot
// armor at fns.football, which reuses the exact same hat visuals as a non-armor hat —
// no "blocked" sound override the way body armor gets). Simplified down to the core
// visual toggles: drops skin-build variants, the "headbase_hat" override parameter,
// and the HEAD_HAT_HELM/HEAD_HAT_NOHELM masking-conflict symbols (those only matter
// when two different head slots can conflict, which this tool doesn't model).
function hatEquipFunctionsBlock(item: ItemDef): string[] {
  const build = resolveAnimationBuild(item)
  return [
    'local function onequip(inst, owner)',
    `    owner.AnimState:OverrideSymbol("swap_hat", ${luaString(build)}, "swap_hat")`,
    '    owner.AnimState:Show("HAT")',
    '    owner.AnimState:Show("HAIR_HAT")',
    '    owner.AnimState:Hide("HAIR_NOHAT")',
    '    owner.AnimState:Hide("HAIR")',
    'end',
    '',
    'local function onunequip(inst, owner)',
    '    owner.AnimState:ClearOverrideSymbol("swap_hat")',
    '    owner.AnimState:Hide("HAT")',
    '    owner.AnimState:Hide("HAIR_HAT")',
    '    owner.AnimState:Show("HAIR_NOHAT")',
    '    owner.AnimState:Show("HAIR")',
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
  if (item.container?.widget.source === 'custom') {
    lines.push(`    Asset("ANIM", "anim/${containerCustomWidgetBuild(item.id)}.zip"), -- PLACEHOLDER: art da UI do contêiner, ver README`)
  }
  lines.push(`    Asset("INV_IMAGE", "${item.id}"),`)
  lines.push('}')
  lines.push('')
  if (handheld) {
    lines.push(...equipFunctionsBlock(item))
  } else if (isWearableArmor(item)) {
    lines.push(...(armorEquipSlot(item) === 'head' ? hatEquipFunctionsBlock(item) : armorEquipFunctionsBlock(item)))
  }
  if (needsOnAttack(item)) {
    lines.push(...onAttackFunctionBlock(item))
  }
  if (needsSpellcaster(item)) {
    lines.push(...spellFunctionBlock(item))
  }
  if (needsSpellbook(item)) {
    lines.push(...spellbookFunctionBlock(item))
  }
  if (needsArmorTakeDamage(item)) {
    lines.push(...armorTakeDamageFunctionBlock(item))
  }
  if (needsOnEaten(item)) {
    lines.push(...onEatenFunctionBlock(item))
  }
  if (item.combinable) {
    lines.push(...combineWithFunctionBlock())
  }
  if (item.nameable) {
    lines.push(...onNamedFunctionBlock())
  }
  lines.push(item.tameBomb !== undefined ? `local prefabs = { ${luaString(tameCloudId(item))} }` : 'local prefabs = {}')
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
  lines.push(`    inst.AnimState:SetBank(${luaString(resolveAnimationBank(item))})`)
  lines.push(`    inst.AnimState:SetBuild(${luaString(build)})`)
  lines.push(`    inst.AnimState:PlayAnimation(${luaString(resolveIdleClip(item))})`)
  lines.push('')
  lines.push('    inst:AddTag("item")')
  if (item.combinable) {
    // Needs to be visible client-side too — it's read by the USEITEM component
    // action handler in modmain.lua to decide whether to show the "Combine" action.
    lines.push('    inst:AddTag("combinable_item")')
  }
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

// The thrown cloud itself — confirmed against Original/prefabs/prefabs/
// sleepcloud.lua for the overall shape (a short-lived FX-tagged entity with a
// periodic area scan), simplified way down: no netvar-synced FX overlays, no
// PvP-specific targeting, no sleep/grogginess — just AddComponent("follower")
// (idempotent) + SetLeader(owner) + AddLoyaltyTime(duration) on every
// "hostile"-tagged entity found each tick, the real temporary-tame mechanism
// (see the schema comment on ItemDef.tameBomb for why this only affects
// creatures whose own targeting already respects a follower leader).
function generateTameCloudPrefab(item: ItemDef): string {
  const id = tameCloudId(item)
  const upper = toUpperSnake(id)
  const lines: string[] = []

  lines.push('local assets =')
  lines.push('{')
  lines.push(`    Asset("ANIM", "anim/${id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
  lines.push('}')
  lines.push('')
  lines.push('local function TameNearbyHostiles(inst)')
  lines.push('    if inst.owner == nil or not inst.owner:IsValid() then')
  lines.push('        return')
  lines.push('    end')
  lines.push('')
  lines.push('    local x, y, z = inst.Transform:GetWorldPosition()')
  lines.push(`    local ents = TheSim:FindEntities(x, y, z, TUNING.${upper}_RADIUS, { "hostile" })`)
  lines.push('    for _, ent in ipairs(ents) do')
  lines.push('        if ent.components.follower == nil then')
  lines.push('            ent:AddComponent("follower")')
  lines.push('        end')
  lines.push('        ent.components.follower:SetLeader(inst.owner)')
  lines.push(`        ent.components.follower:AddLoyaltyTime(TUNING.${upper}_TAME_DURATION)`)
  lines.push('    end')
  lines.push('end')
  lines.push('')
  lines.push('local function SetOwner(inst, owner)')
  lines.push('    inst.owner = owner')
  lines.push('end')
  lines.push('')
  lines.push('local function fn()')
  lines.push('    local inst = CreateEntity()')
  lines.push('')
  lines.push('    inst.entity:AddTransform()')
  lines.push('    inst.entity:AddAnimState()')
  lines.push('    inst.entity:AddNetwork()')
  lines.push('')
  lines.push('    inst:AddTag("FX")')
  lines.push('    inst:AddTag("NOCLICK")')
  lines.push('')
  lines.push(`    inst.AnimState:SetBank(${luaString(id)})`)
  lines.push(`    inst.AnimState:SetBuild(${luaString(id)})`)
  lines.push('    inst.AnimState:PlayAnimation("idle", true)')
  lines.push('')
  lines.push('    inst.entity:SetPristine()')
  lines.push('    if not TheWorld.ismastersim then')
  lines.push('        return inst')
  lines.push('    end')
  lines.push('')
  lines.push('    inst.SetOwner = SetOwner')
  lines.push('    inst.persists = false')
  lines.push('')
  lines.push(`    inst:DoPeriodicTask(1, TameNearbyHostiles)`)
  lines.push(`    inst:DoTaskInTime(TUNING.${upper}_DURATION, inst.Remove)`)
  lines.push('')
  lines.push('    return inst')
  lines.push('end')
  lines.push('')
  lines.push(`return Prefab(${luaString(id)}, fn, assets)`)

  return lines.join('\n') + '\n'
}

export function generateItemFiles(item: ItemDef): Record<string, string> {
  const files: Record<string, string> = {
    [`scripts/prefabs/${item.id}.lua`]: generateItemPrefab(item),
  }
  if (item.tameBomb !== undefined) {
    files[`scripts/prefabs/${tameCloudId(item)}.lua`] = generateTameCloudPrefab(item)
  }
  return files
}
