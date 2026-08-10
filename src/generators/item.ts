import type { ItemDef, Container, SpellbookSpell } from '../types/modProject'
import { luaString, sanitizeLuaComment, toUpperSnake } from './luaUtils'
import { groundAttackFunctionBlock } from './groundAttack'

// Shared by both Item and Structure containers — takes the container config
// directly (not a whole ItemDef) so structure.ts can reuse these too.
// Only meaningful for a 'custom' widget — a 'vanilla' one clones its grid at
// runtime via deepcopy (patterns.md#20), so we never know its slot count
// ourselves. Shared with modmain.ts, which needs the same numbers to build
// the custom grid.
export function containerSlotCount(container: Container | undefined): number {
  if (container?.source !== 'own') return 0
  return container.widget.source === 'custom' ? container.widget.slots : 0
}

export function containerColumns(container: Container | undefined): number {
  if (container?.source !== 'own') return 0
  return container.widget.source === 'custom' ? container.widget.columns : 0
}

// Confirmed identically across chester.lua's AttachShadowContainer, hats.lua's
// top_convert_to_magician, and magician_chest.lua's AttachShadowContainer — a
// container_proxy owner reattaches to its pocket dimension's master container both
// right away (skipped during world population, same as magician_chest.lua's own
// `if not POPULATING then` guard) and on every load (OnLoadPostPass), since the
// proxy itself holds no state of its own to restore. Shared by item.ts and
// structure.ts — see containerComponentBlock/structure.ts's componentBlock.
export function linkedDimensionAttachFunctionBlock(dimension: string): string[] {
  return [
    'local function AttachSharedContainer(inst)',
    `    inst.components.container_proxy:SetMaster(TheWorld:GetPocketDimensionContainer(${luaString(dimension)}))`,
    'end',
    '',
  ]
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

// Confirmed against the real scripts/recipe.lua: the `atlas` field passed into
// AddRecipe2's config is resolved EAGERLY (self.atlas = atlas and resolvefilepath(atlas))
// and hard-crashes mod loading if that path doesn't exist anywhere — reproduced
// in-game as "Could not find an asset matching images/inventoryimages/<id>.xml".
// A 'custom' item's own anim/<id>.zip bakes an INV_IMAGE at exactly that per-mod
// path, so the atlas/image pair below is correct for it. A 'vanilla'-sourced item
// has no such per-mod atlas to point at; omitting `atlas` (image-only) instead lets
// Recipe's own lazy fallback (self.atlas = self.atlas or resolvefilepath
// (GetInventoryItemAtlas(self.image))) resolve it against the reused build's real,
// already-loaded shared atlas — same mechanism scripts/widgets/recipepopup.lua uses
// to look up any existing item's icon by filename.
export function itemRecipeIcon(item: ItemDef): { atlas?: string; image: string } {
  if (isVanillaAnimation(item)) {
    return { image: `${resolveAnimationBuild(item)}.tex` }
  }
  return { atlas: `images/inventoryimages/${item.id}.xml`, image: `${item.id}.tex` }
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
// like most builds this tool reuses. A shared-build 'vanilla' item (staffs,
// books, gems, amulets, trinkets, ...) plays its own per-variant clip instead
// of "idle" too — see itemAnimationSchema's idleClip.
function resolveIdleClip(item: ItemDef): string {
  if (item.animation?.source === 'vanillaHat') return 'anim'
  if (item.animation?.source === 'vanilla') return item.animation.idleClip ?? 'idle'
  return 'idle'
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

export function isSolarLantern(item: ItemDef): boolean {
  return item.solarLantern !== undefined
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
  return (
    item.spellEffect !== undefined ||
    item.tameBomb !== undefined ||
    item.smokeBomb !== undefined ||
    item.groundAttack !== undefined ||
    item.summonTotem !== undefined
  )
}

function tameCloudId(item: ItemDef): string {
  return `${item.id}_cloud`
}

function smokeCloudId(item: ItemDef): string {
  return `${item.id}_smoke`
}

function spellcasterFunctionName(item: ItemDef): string {
  if (item.tameBomb !== undefined) return 'throwtamecloud'
  if (item.smokeBomb !== undefined) return 'throwsmokebomb'
  if (item.groundAttack !== undefined) return 'throwgroundattack'
  if (item.summonTotem !== undefined) return 'summontotem'
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
  } else if (item.smokeBomb !== undefined) {
    lines.push(
      'local function throwsmokebomb(staff, target, pos)',
      `    local cloud = SpawnPrefab(${luaString(smokeCloudId(item))})`,
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
  } else if (item.summonTotem !== undefined) {
    lines.push(
      'local function summontotem(staff, target, pos)',
      '    if staff.components.fueled ~= nil and staff.components.fueled:IsEmpty() then',
      '        return',
      '    end',
      '    if staff._totemcreature ~= nil and staff._totemcreature:IsValid() then',
      '        staff._totemcreature:Remove()',
      '        staff._totemcreature = nil',
      '        return',
      '    end',
      `    local creature = SpawnPrefab(${luaString(item.summonTotem.summonPrefab)})`,
      '    creature.Transform:SetPosition(pos:Get())',
      '    if creature.components.follower ~= nil then',
      '        creature.components.follower:SetLeader(staff.components.inventoryitem.owner)',
      '    end',
      '    staff._totemcreature = creature',
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
// a self-cast SpawnPrefab for instant spells (no character exclusivity) —
// beam spells are the one case that also aims, via needsAimedSpell below.
function needsSpellbook(item: ItemDef): boolean {
  return item.spellbook !== undefined
}

// A static spellbook only needs aoetargeting/aoespell when one of its fixed
// spells actually has a beam; a linkedContainer spellbook can't know that
// ahead of time (its spells are read live from another item's slots at cast
// time — see linkedContainerSpellbookFunctionBlock), so it always carries
// both components, same as it always carries the beam helper functions.
// A beam or nova is always aimed regardless of the flag (a beam needs a
// direction to fire in, a nova needs a point to center its blast on); a
// summon-only spell is only aimed when explicitly marked so via
// spellbookSpellSchema.aimed.
function isAimedSpell(spell: SpellbookSpell): boolean {
  return spell.beam !== undefined || spell.nova !== undefined || spell.aimed === true
}

function needsAimedSpell(item: ItemDef): boolean {
  if (item.spellbook?.source === 'static') {
    return item.spellbook.spells.some(isAimedSpell)
  }
  return item.spellbook?.source === 'linkedContainer'
}

// Confirmed real, always-present vanilla API (docs/dst-knowledge/patterns.md#62):
// health/sanity/hunger components' :DoDelta(n) is the same mechanism the base
// game already uses everywhere for damage/healing/hunger loss. Shared by both
// the static and linkedContainer spellbook codegen below.
function spellEffectDeltaLines(spell: SpellbookSpell, actor: string, indent: string): string[] {
  const lines: string[] = []
  const deltas: [string, number | undefined][] = [
    ['health', spell.healthDelta],
    ['sanity', spell.sanityDelta],
    ['hunger', spell.hungerDelta],
  ]
  for (const [component, delta] of deltas) {
    if (delta === undefined) continue
    lines.push(`${indent}if ${actor}.components.${component} ~= nil then`)
    lines.push(`${indent}    ${actor}.components.${component}:DoDelta(${delta})`)
    lines.push(`${indent}end`)
  }
  return lines
}

function spellBeamLuaTable(beam: NonNullable<SpellbookSpell['beam']>): string {
  const telegraph = beam.telegraphSeconds !== undefined ? beam.telegraphSeconds : 'nil'
  return `{ damage = ${beam.damagePerTick}, tickinterval = ${beam.tickIntervalSeconds}, range = ${beam.range}, duration = ${beam.durationSeconds}, telegraph = ${telegraph} }`
}

function spellNovaLuaTable(nova: NonNullable<SpellbookSpell['nova']>): string {
  return `{ damage = ${nova.damage}, radius = ${nova.radius}, stun = ${nova.stunSeconds} }`
}

// Confirmed against the real game scripts (components/aoespell.lua,
// components/aoetargeting.lua, prefabs/abigail_flower.lua +
// prefabs/ghostcommand_defs.lua — see docs/dst-knowledge/patterns.md#69):
// a spellbook wheel can mix instant spells (spellbook:SetSpellFn, cast via
// the base game's CastSpellBookFromInv) with aimed ones (aoespell:SetSpellFn,
// cast via playercontroller:StartAOETargetingUsing) on the SAME item — this
// is exactly how Abigail's Flower lets "Attack At"/"Haunt At" use a mouse
// reticule while its other commands fire instantly. AOESpell:CastSpell passes
// a real aimed pos to the spell function, unlike SpellBook:CastSpell. Used by
// any aimed spell, not just a beam — see isAimedSpell.
function aimedSpellHelperFunctionBlock(): string[] {
  return [
    'local function spell_aoe_reticuletargetfn()',
    '    return Vector3(ThePlayer.entity:LocalToWorldSpace(5, 0.001, 0))',
    'end',
    '',
    'local function StartAOETargeting(inst)',
    '    if ThePlayer.components.playercontroller ~= nil then',
    '        ThePlayer.components.playercontroller:StartAOETargetingUsing(inst)',
    '    end',
    'end',
    '',
  ]
}

function solarBeamHelperFunctionBlock(): string[] {
  return [
    'local function DoSpellBeamDamage(user, beam)',
    '    local x, y, z = user.Transform:GetWorldPosition()',
    '    local angle = user.Transform:GetRotation() * DEGREES',
    '    local dx, dz = math.cos(angle), -math.sin(angle)',
    '    local hit = {}',
    '    local dist = 2',
    '    while dist <= beam.range do',
    '        local px, pz = x + dx * dist, z + dz * dist',
    '        local ents = TheSim:FindEntities(px, 0, pz, 2, nil, { "INLIMBO", "player" }, { "hostile" })',
    '        for _, v in ipairs(ents) do',
    '            if not hit[v] and v.components.health ~= nil and not v.components.health:IsDead() then',
    '                v.components.health:DoDelta(-beam.damage, false, "solarbeam", false, user)',
    '                hit[v] = true',
    '            end',
    '        end',
    '        dist = dist + 2',
    '    end',
    'end',
    '',
    'local function StartSpellBeamTicking(user, beam)',
    '    local task',
    '    task = user:DoPeriodicTask(beam.tickinterval, function()',
    '        DoSpellBeamDamage(user, beam)',
    '    end)',
    '    user:DoTaskInTime(beam.duration, function()',
    '        if task ~= nil then',
    '            task:Cancel()',
    '        end',
    '    end)',
    'end',
    '',
    'local function StartSpellBeam(user, beam)',
    '    if beam.telegraph == nil then',
    '        StartSpellBeamTicking(user, beam)',
    '        return',
    '    end',
    '',
    '    local x, y, z = user.Transform:GetWorldPosition()',
    '    local angle = user.Transform:GetRotation() * DEGREES',
    '    local marker = SpawnPrefab("reticule")',
    '    if marker ~= nil then',
    '        marker.Transform:SetPosition(x + math.cos(angle) * 3, 0, z - math.sin(angle) * 3)',
    '    end',
    '    user:DoTaskInTime(beam.telegraph, function()',
    '        if marker ~= nil and marker:IsValid() then',
    '            marker:Remove()',
    '        end',
    '        StartSpellBeamTicking(user, beam)',
    '    end)',
    'end',
    '',
  ]
}

// Confirmed real APIs: TheSim:FindEntities(..., radius, {"hostile"}) is the
// exact same proximity scan sentryFunctionBlock/orbitLeaderFunctionBlock
// (creature.ts) already use, and Freezable:Freeze(freezetime) is a direct,
// instant lock — not the gradual coldness buildup ItemDef.weapon's onHitEffect
// "freeze" uses (see spellbookSpellSchema.nova).
function solarNovaHelperFunctionBlock(): string[] {
  return [
    'local function DoSpellNova(user, pos, nova)',
    '    local x, y, z = pos:Get()',
    '    local victims = TheSim:FindEntities(x, y, z, nova.radius, { "hostile" })',
    '    for _, victim in ipairs(victims) do',
    '        if victim.components.health ~= nil and not victim.components.health:IsDead() then',
    '            victim.components.health:DoDelta(-nova.damage, false, "solarnova", false, user)',
    '            if victim.components.freezable ~= nil then',
    '                victim.components.freezable:Freeze(nova.stun)',
    '            end',
    '        end',
    '    end',
    'end',
    '',
  ]
}

function staticSpellbookFunctionBlock(spells: SpellbookSpell[]): string[] {
  const lines: string[] = []
  const hasAimedSpell = spells.some(isAimedSpell)
  if (hasAimedSpell) {
    lines.push(...aimedSpellHelperFunctionBlock())
  }
  if (spells.some((spell) => spell.beam !== undefined)) {
    lines.push(...solarBeamHelperFunctionBlock())
  }
  if (spells.some((spell) => spell.nova !== undefined)) {
    lines.push(...solarNovaHelperFunctionBlock())
  }

  spells.forEach((spell, index) => {
    // An aimed spell needs pos to know where to summon/fire; an instant
    // spell just ignores the extra argument — same function shape either
    // way keeps the onselect wiring below uniform.
    lines.push(`local function spellbook_cast_${index + 1}(inst, user, pos)`)
    // Only meaningful for a caster with CharacterDef.mana (see
    // characterManaSchema) — anyone else has no `mana` component, so the
    // check is skipped and the spell always casts, same as before this field
    // existed.
    if (spell.manaCost !== undefined && spell.manaCost > 0) {
      lines.push(`    if user.components.mana ~= nil and not user.components.mana:Spend(${spell.manaCost}) then`)
      lines.push('        return false')
      lines.push('    end')
    }
    if (isAimedSpell(spell)) {
      lines.push('    user:ForceFacePoint(pos:Get())')
    }
    lines.push(...spellEffectDeltaLines(spell, 'user', '    '))
    if (spell.summonPrefab !== undefined) {
      lines.push(`    local fx = SpawnPrefab(${luaString(spell.summonPrefab)})`)
      lines.push('    if fx ~= nil then')
      lines.push(`        fx.Transform:SetPosition(${isAimedSpell(spell) ? 'pos:Get()' : 'user.Transform:GetWorldPosition()'})`)
      lines.push('    end')
    }
    if (spell.beam !== undefined) {
      lines.push(`    StartSpellBeam(user, ${spellBeamLuaTable(spell.beam)})`)
    }
    if (spell.nova !== undefined) {
      lines.push(`    DoSpellNova(user, pos, ${spellNovaLuaTable(spell.nova)})`)
    }
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
    if (isAimedSpell(spell)) {
      lines.push('            inst.components.spellbook:SetSpellFn(nil)')
      if (spell.beam !== undefined) {
        lines.push(`            inst.components.aoetargeting:SetRange(${spell.beam.range})`)
      }
      lines.push(`            inst.components.aoespell:SetSpellFn(spellbook_cast_${index + 1})`)
    } else {
      lines.push(`            inst.components.spellbook:SetSpellFn(spellbook_cast_${index + 1})`)
      if (hasAimedSpell) {
        lines.push('            inst.components.aoespell:SetSpellFn(nil)')
      }
    }
    lines.push('        end,')
    if (isAimedSpell(spell)) {
      lines.push('        execute = StartAOETargeting,')
    } else {
      lines.push('        execute = function(inst)')
      lines.push('            local inventory = ThePlayer.replica.inventory')
      lines.push('            if inventory ~= nil then')
      lines.push('                inventory:CastSpellBookFromInv(inst)')
      lines.push('            end')
      lines.push('        end,')
    }
    lines.push('    },')
  })
  lines.push('}')
  lines.push('')
  return lines
}

// Confirmed against the real game scripts (docs/dst-knowledge/patterns.md#62):
// SetShouldOpenFn(fn)/ShouldOpen(user) runs right before the spell wheel
// opens (actions.lua's USESPELLBOOK.pre_action_cb calls ShouldOpen then
// OpenSpellBook), which is the right moment to rebuild SetItems from
// whatever "spell"-tagged items currently sit inside the linked container —
// container.lua's self.slots/self.numslots and inventory.lua's
// Inventory:FindItem are both real, confirmed APIs.
function linkedContainerSpellbookFunctionBlock(containerItemId: string): string[] {
  const lines: string[] = []
  lines.push(...aimedSpellHelperFunctionBlock())
  lines.push(...solarBeamHelperFunctionBlock())
  lines.push(...solarNovaHelperFunctionBlock())
  lines.push('local function spellbook_cast_from_slotitem(spellitem)')
  lines.push('    return function(inst, user, pos)')
  lines.push('        if spellitem.spell_manacost ~= nil and user.components.mana ~= nil')
  lines.push('            and not user.components.mana:Spend(spellitem.spell_manacost) then')
  lines.push('            return false')
  lines.push('        end')
  lines.push('        local isaimed = spellitem.spell_beam ~= nil or spellitem.spell_nova ~= nil or spellitem.spell_aimed')
  lines.push('        if isaimed then')
  lines.push('            user:ForceFacePoint(pos:Get())')
  lines.push('        end')
  lines.push('        if spellitem.spell_healthdelta ~= nil and user.components.health ~= nil then')
  lines.push('            user.components.health:DoDelta(spellitem.spell_healthdelta)')
  lines.push('        end')
  lines.push('        if spellitem.spell_sanitydelta ~= nil and user.components.sanity ~= nil then')
  lines.push('            user.components.sanity:DoDelta(spellitem.spell_sanitydelta)')
  lines.push('        end')
  lines.push('        if spellitem.spell_hungerdelta ~= nil and user.components.hunger ~= nil then')
  lines.push('            user.components.hunger:DoDelta(spellitem.spell_hungerdelta)')
  lines.push('        end')
  lines.push('        if spellitem.spell_summonprefab ~= nil then')
  lines.push('            local fx = SpawnPrefab(spellitem.spell_summonprefab)')
  lines.push('            if fx ~= nil then')
  lines.push('                if isaimed then')
  lines.push('                    fx.Transform:SetPosition(pos:Get())')
  lines.push('                else')
  lines.push('                    fx.Transform:SetPosition(user.Transform:GetWorldPosition())')
  lines.push('                end')
  lines.push('            end')
  lines.push('        end')
  lines.push('        if spellitem.spell_beam ~= nil then')
  lines.push('            StartSpellBeam(user, spellitem.spell_beam)')
  lines.push('        end')
  lines.push('        if spellitem.spell_nova ~= nil then')
  lines.push('            DoSpellNova(user, pos, spellitem.spell_nova)')
  lines.push('        end')
  lines.push('        if inst.components.finiteuses ~= nil then')
  lines.push('            inst.components.finiteuses:Use(1)')
  lines.push('        end')
  lines.push('        return true')
  lines.push('    end')
  lines.push('end')
  lines.push('')
  lines.push('local function rebuild_spellbook_items(user)')
  lines.push('    local codex = user.components.inventory ~= nil and user.components.inventory:FindItem(function(item)')
  lines.push(`        return item.prefab == ${luaString(containerItemId)}`)
  lines.push('    end)')
  lines.push('    if codex == nil or codex.components.container == nil then')
  lines.push('        return nil')
  lines.push('    end')
  lines.push('')
  lines.push('    local items = {}')
  lines.push('    for slot = 1, codex.components.container.numslots do')
  lines.push('        local spellitem = codex.components.container.slots[slot]')
  lines.push('        if spellitem ~= nil and spellitem.spell_label ~= nil then')
  lines.push('            table.insert(items, {')
  lines.push('                label = spellitem.spell_label,')
  lines.push('                onselect = function(inst)')
  lines.push('                    inst.components.spellbook:SetSpellName(spellitem.spell_label)')
  lines.push('                    if spellitem.spell_beam ~= nil or spellitem.spell_nova ~= nil or spellitem.spell_aimed then')
  lines.push('                        inst.components.spellbook:SetSpellFn(nil)')
  lines.push('                        if spellitem.spell_beam ~= nil then')
  lines.push('                            inst.components.aoetargeting:SetRange(spellitem.spell_beam.range)')
  lines.push('                        end')
  lines.push('                        inst.components.aoespell:SetSpellFn(spellbook_cast_from_slotitem(spellitem))')
  lines.push('                    else')
  lines.push('                        inst.components.spellbook:SetSpellFn(spellbook_cast_from_slotitem(spellitem))')
  lines.push('                        inst.components.aoespell:SetSpellFn(nil)')
  lines.push('                    end')
  lines.push('                end,')
  lines.push(
    '                execute = (spellitem.spell_beam ~= nil or spellitem.spell_nova ~= nil or spellitem.spell_aimed) and StartAOETargeting or function(inst)',
  )
  lines.push('                    local inventory = ThePlayer.replica.inventory')
  lines.push('                    if inventory ~= nil then')
  lines.push('                        inventory:CastSpellBookFromInv(inst)')
  lines.push('                    end')
  lines.push('                end,')
  lines.push('            })')
  lines.push('        end')
  lines.push('    end')
  lines.push('    return items')
  lines.push('end')
  lines.push('')
  return lines
}

function spellbookFunctionBlock(item: ItemDef): string[] {
  if (item.spellbook?.source === 'linkedContainer') {
    return linkedContainerSpellbookFunctionBlock(item.spellbook.containerItemId)
  }
  return staticSpellbookFunctionBlock(item.spellbook?.source === 'static' ? item.spellbook.spells : [])
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

function spellDefComponentBlock(item: ItemDef): string[] {
  const spell = item.spellDef!
  const lines = [
    '',
    `    inst.spell_label = ${luaString(spell.label)}`,
    `    inst.spell_summonprefab = ${spell.summonPrefab !== undefined ? luaString(spell.summonPrefab) : 'nil'}`,
    `    inst.spell_manacost = ${spell.manaCost ?? 'nil'}`,
    `    inst.spell_healthdelta = ${spell.healthDelta ?? 'nil'}`,
    `    inst.spell_sanitydelta = ${spell.sanityDelta ?? 'nil'}`,
    `    inst.spell_hungerdelta = ${spell.hungerDelta ?? 'nil'}`,
  ]
  if (spell.beam !== undefined) {
    lines.push(`    inst.spell_beam = ${spellBeamLuaTable(spell.beam)}`)
  }
  if (spell.nova !== undefined) {
    lines.push(`    inst.spell_nova = ${spellNovaLuaTable(spell.nova)}`)
  }
  if (spell.aimed) {
    lines.push('    inst.spell_aimed = true')
  }
  return lines
}

function toolComponentBlock(item: ItemDef): string[] {
  return ['', '    inst:AddComponent("tool")', `    inst.components.tool:SetAction(ACTIONS.${item.toolAction})`]
}

function stackableComponentBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  return ['', '    inst:AddComponent("stackable")', `    inst.components.stackable:SetMaxSize(TUNING.${upper}_STACK_SIZE)`]
}

export function chakramProjectileId(item: ItemDef): string {
  return `${item.id}_proj`
}

function needsChainReturnLock(item: ItemDef): boolean {
  return item.weapon?.chainReturn !== undefined
}

function chainReturnLockFunctionBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  return [
    'local function OnChakramDischarged(inst)',
    '    inst.components.weapon:SetRange(nil)',
    '    inst.components.weapon:SetProjectile(nil)',
    'end',
    '',
    'local function OnChakramCharged(inst)',
    `    inst.components.weapon:SetRange(TUNING.${upper}_RANGE)`,
    `    inst.components.weapon:SetProjectile(${luaString(chakramProjectileId(item))})`,
    'end',
    '',
  ]
}

function weaponComponentBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  const weapon = item.weapon!
  const lines = ['', '    inst:AddComponent("weapon")', `    inst.components.weapon:SetDamage(TUNING.${upper}_DAMAGE)`]
  if (weapon.ranged) {
    lines.push(`    inst.components.weapon:SetRange(TUNING.${upper}_MIN_RANGE, TUNING.${upper}_MAX_RANGE)`)
    lines.push(`    inst.components.weapon:SetProjectile(${luaString(weapon.ranged.projectilePrefab)})`)
  } else if (weapon.chainReturn) {
    lines.push(`    inst.components.weapon:SetRange(TUNING.${upper}_RANGE)`)
    lines.push(`    inst.components.weapon:SetProjectile(${luaString(chakramProjectileId(item))})`)
    lines.push('    inst:AddComponent("rechargeable")')
    lines.push('    inst.components.rechargeable:SetOnDischargedFn(OnChakramDischarged)')
    lines.push('    inst.components.rechargeable:SetOnChargedFn(OnChakramCharged)')
  } else if (weapon.meleeRange !== undefined) {
    lines.push(`    inst.components.weapon:SetRange(TUNING.${upper}_MELEE_RANGE)`)
  }
  if (needsOnAttack(item)) {
    lines.push('    inst.components.weapon:SetOnAttack(onattack)')
  }
  return lines
}

function rechargeableComponentBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  return [
    '',
    '    inst:AddComponent("rechargeable")',
    `    inst.components.rechargeable:SetChargeTime(TUNING.${upper}_COOLDOWN)`,
    '    inst.components.inspectable.getstatus = function(inst)',
    '        return (inst.components.rechargeable ~= nil and not inst.components.rechargeable:IsCharged()) and "RECHARGING" or nil',
    '    end',
  ]
}

function finiteusesComponentBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  const finiteuses = item.finiteuses!
  const lines = [
    '',
    '    inst:AddComponent("finiteuses")',
    `    inst.components.finiteuses:SetMaxUses(TUNING.${upper}_USES)`,
    `    inst.components.finiteuses:SetUses(TUNING.${upper}_USES)`,
    '    inst.components.finiteuses:SetOnFinished(inst.Remove)',
  ]
  if (item.category === 'tool' && item.toolAction) {
    lines.push(`    inst.components.finiteuses:SetConsumption(ACTIONS.${item.toolAction}, 1)`)
  }
  if (finiteuses.ignoreCombatDurabilityLoss) {
    lines.push('    inst.components.finiteuses:SetIgnoreCombatDurabilityLoss(true)')
  }
  return lines
}

function armorComponentBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  const armor = item.armor!
  const lines = [
    '',
    '    inst:AddComponent("armor")',
    `    inst.components.armor:InitCondition(TUNING.${upper}_CONDITION, TUNING.${upper}_ABSORPTION)`,
  ]
  if (armor.weakness) {
    lines.push(`    inst.components.armor:AddWeakness(${luaString(armor.weakness.tag)}, ${armor.weakness.extraDamage})`)
  }
  if (needsArmorTakeDamage(item)) {
    lines.push('    inst.components.armor.ontakedamage = onarmortakedamage')
  }
  if (armor.flammable) {
    lines.push(
      '',
      '    inst:AddComponent("fuel")',
      '    inst.components.fuel.fuelvalue = TUNING.LARGE_FUEL',
      '    MakeSmallBurnable(inst, TUNING.SMALL_BURNTIME)',
      '    MakeSmallPropagator(inst)',
    )
  }
  return lines
}

function equippableComponentBlock(item: ItemDef): string[] {
  const lines = ['', '    inst:AddComponent("equippable")']
  if (isSolarLantern(item)) {
    lines.push('    inst.components.equippable.equipslot = EQUIPSLOTS.HEAD')
  } else if (isWearableArmor(item)) {
    lines.push(`    inst.components.equippable.equipslot = EQUIPSLOTS.${armorEquipSlot(item).toUpperCase()}`)
  }
  lines.push('    inst.components.equippable:SetOnEquip(onequip)', '    inst.components.equippable:SetOnUnequip(onunequip)')
  if (item.equipWalkSpeedMult !== undefined) {
    lines.push(`    inst.components.equippable.walkspeedmult = ${item.equipWalkSpeedMult}`)
  }
  if (item.armor?.dapperness !== undefined) {
    lines.push(`    inst.components.equippable.dapperness = ${item.armor.dapperness}`)
  }
  return lines
}

function spellcasterComponentBlock(item: ItemDef): string[] {
  return [
    '',
    '    inst:AddComponent("reticule")',
    '    inst.components.reticule.targetfn = spell_reticuletargetfn',
    '',
    '    inst:AddComponent("spellcaster")',
    `    inst.components.spellcaster:SetSpellFn(${spellcasterFunctionName(item)})`,
    '    inst.components.spellcaster.canuseonpoint = true',
  ]
}

function summonTotemFunctionBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  return [
    'local function OnTotemFuelChanged(inst)',
    '    if inst.components.fueled:IsEmpty() and inst._totemcreature ~= nil then',
    '        if inst._totemcreature:IsValid() then',
    '            inst._totemcreature:Remove()',
    '        end',
    '        inst._totemcreature = nil',
    '    end',
    'end',
    '',
    'local function TotemRechargeTick(inst)',
    '    if TheWorld.state.isday and not TheWorld:HasTag("cave") and not inst.components.fueled:IsFull() then',
    `        inst.components.fueled:DoDelta(TUNING.${upper}_RECHARGE_RATE)`,
    '    end',
    'end',
    '',
  ]
}

function summonTotemComponentBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  return [
    '',
    '    inst:AddComponent("fueled")',
    '    inst.components.fueled.fueltype = FUELTYPE.MAGIC',
    `    inst.components.fueled:InitializeFuelLevel(TUNING.${upper}_MAX_DURABILITY)`,
    `    inst.components.fueled.rate = TUNING.${upper}_DRAIN_RATE`,
    '    inst:ListenForEvent("percentusedchange", OnTotemFuelChanged)',
    '    inst:DoPeriodicTask(1, TotemRechargeTick)',
  ]
}

function spellbookComponentBlock(item: ItemDef): string[] {
  const lines = ['', '    inst:AddComponent("spellbook")']
  if (item.spellbook?.source === 'linkedContainer') {
    lines.push(
      '    inst.components.spellbook:SetShouldOpenFn(function(inst, user)',
      '        local items = rebuild_spellbook_items(user)',
      '        if items == nil or #items == 0 then',
      '            return false',
      '        end',
      '        inst.components.spellbook:SetItems(items)',
      '        return true',
      '    end)',
    )
  } else {
    lines.push('    inst.components.spellbook:SetItems(SPELLBOOK_SPELLS)')
  }
  return lines
}

// Confirmed in prefabs/abigail_flower.lua/prefabs/sleepbomb.lua: mouseenabled
// makes the reticule follow TheInput:GetWorldPosition() in real time instead
// of a fixed point, with targetfn kept as the controller-mode fallback
// (components/reticule.lua). SetRange is set per-spell in onselect instead
// (see staticSpellbookFunctionBlock/linkedContainerSpellbookFunctionBlock),
// matching prefabs/ghostcommand_defs.lua's own per-command SetRange calls.
function aimedSpellComponentBlock(): string[] {
  return [
    '',
    '    inst:AddComponent("aoetargeting")',
    '    inst.components.aoetargeting.reticule.targetfn = spell_aoe_reticuletargetfn',
    '    inst.components.aoetargeting.reticule.mouseenabled = true',
    '',
    '    inst:AddComponent("aoespell")',
  ]
}

function perishableComponentBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  return [
    '',
    '    inst:AddComponent("perishable")',
    `    inst.components.perishable:SetPerishTime(TUNING.${upper}_PERISH_TIME)`,
    '    inst.components.perishable:StartPerishing()',
    '    inst.components.perishable:SetOnPerishFn(inst.Remove)',
  ]
}

function edibleComponentBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  const edible = item.edible!
  const lines = [
    '',
    '    inst:AddComponent("edible")',
    `    inst.components.edible.foodtype = FOODTYPE.${edible.foodType}`,
    `    inst.components.edible.healthvalue = TUNING.${upper}_HEALTH`,
    `    inst.components.edible.hungervalue = TUNING.${upper}_HUNGER`,
    `    inst.components.edible.sanityvalue = TUNING.${upper}_SANITY`,
  ]
  if (needsOnEaten(item)) {
    lines.push('    inst.components.edible:SetOnEatenFn(oneaten)')
  }
  return lines
}

function combinableComponentBlock(): string[] {
  return ['', '    inst.CombineWith = CombineWith']
}

function containerComponentBlock(item: ItemDef): string[] {
  const container = item.container!
  if (container.source === 'pocketDimension') {
    return [
      '',
      '    inst:AddComponent("container_proxy")',
      '    inst.components.inventoryitem:SetOnPutInInventoryFn(function(inst)',
      '        inst.components.container_proxy:Close()',
      '    end)',
      '',
      '    inst.OnLoadPostPass = AttachSharedContainer',
      '    if not POPULATING then',
      '        AttachSharedContainer(inst)',
      '    end',
    ]
  }
  const lines = [
    '',
    '    inst:AddComponent("container")',
    `    inst.components.container:WidgetSetup(${luaString(item.id)})`,
    '    inst.components.inventoryitem:SetOnPutInInventoryFn(function(inst)',
    '        inst.components.container:Close()',
    '    end)',
  ]
  if (container.preservation) {
    lines.push(
      '',
      '    inst:AddComponent("preserver")',
      `    inst.components.preserver:SetPerishRateMultiplier(${container.preservation.perishRateMultiplier})`,
    )
    if (container.preservation.temperatureRateMultiplier !== undefined) {
      lines.push(`    inst.components.preserver:SetTemperatureRateMultiplier(${container.preservation.temperatureRateMultiplier})`)
    }
  }
  return lines
}

function nameableComponentBlock(): string[] {
  return [
    '',
    '    inst:AddComponent("named")',
    '',
    '    inst:AddComponent("writeable")',
    '    inst.components.writeable:SetDefaultWriteable(false)',
    '    inst.components.writeable:SetAutomaticDescriptionEnabled(false)',
    '    inst.components.writeable:SetWriteableDistance(1)',
    '    inst.components.writeable:SetOnWrittenFn(onnamed)',
  ]
}

function moonrelicComponentBlock(): string[] {
  return ['', '    inst:AddComponent("moonrelic")']
}

function componentBlock(item: ItemDef): string {
  const lines: string[] = []

  lines.push('    inst:AddComponent("inspectable")')
  lines.push('    inst:AddComponent("inventoryitem")')

  if (item.spellDef) lines.push(...spellDefComponentBlock(item))
  if (item.category === 'tool' && item.toolAction) lines.push(...toolComponentBlock(item))
  if (item.stackable) lines.push(...stackableComponentBlock(item))
  if (item.weapon) lines.push(...weaponComponentBlock(item))
  if (item.rechargeable) lines.push(...rechargeableComponentBlock(item))
  if (item.finiteuses) lines.push(...finiteusesComponentBlock(item))
  if (item.armor) lines.push(...armorComponentBlock(item))
  if (isHandheld(item) || isWearableArmor(item) || isSolarLantern(item)) lines.push(...equippableComponentBlock(item))
  if (isSolarLantern(item)) lines.push(...solarLanternComponentBlock(item))
  if (item.summonTotem) lines.push(...summonTotemComponentBlock(item))
  if (item.solarBattery) lines.push(...solarBatteryComponentBlock(item))
  if (needsSpellcaster(item)) lines.push(...spellcasterComponentBlock(item))
  if (needsSpellbook(item)) lines.push(...spellbookComponentBlock(item))
  if (needsAimedSpell(item)) lines.push(...aimedSpellComponentBlock())
  if (item.perishable) lines.push(...perishableComponentBlock(item))
  if (item.edible) lines.push(...edibleComponentBlock(item))
  if (item.combinable) lines.push(...combinableComponentBlock())
  if (item.container) lines.push(...containerComponentBlock(item))
  if (item.nameable) lines.push(...nameableComponentBlock())
  if (item.moonrelic) lines.push(...moonrelicComponentBlock())

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

function solarLanternEquipFunctionsBlock(item: ItemDef): string[] {
  const build = resolveAnimationBuild(item)
  return [
    'local function onequip(inst, owner)',
    `    owner.AnimState:OverrideSymbol("swap_hat", ${luaString(build)}, "swap_hat")`,
    '    owner.AnimState:Show("HAT")',
    '    owner.AnimState:Show("HAIR_HAT")',
    '    owner.AnimState:Hide("HAIR_NOHAT")',
    '    owner.AnimState:Hide("HAIR")',
    '    inst.Light:Enable(true)',
    '    inst.components.fueled:StartConsuming()',
    'end',
    '',
    'local function onunequip(inst, owner)',
    '    owner.AnimState:ClearOverrideSymbol("swap_hat")',
    '    owner.AnimState:Hide("HAT")',
    '    owner.AnimState:Hide("HAIR_HAT")',
    '    owner.AnimState:Show("HAIR_NOHAT")',
    '    owner.AnimState:Show("HAIR")',
    '    inst.Light:Enable(false)',
    '    inst.components.fueled:StopConsuming()',
    'end',
    '',
  ]
}

function solarLanternRechargeFunctionBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  return [
    'local function SolarLanternRechargeTick(inst)',
    '    if TheWorld.state.isday and not TheWorld:HasTag("cave") and not inst.components.fueled:IsFull() then',
    `        inst.components.fueled:DoDelta(TUNING.${upper}_RECHARGE_RATE)`,
    '    end',
    'end',
    '',
  ]
}

function solarLanternComponentBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  return [
    '',
    '    inst:AddComponent("fueled")',
    '    inst.components.fueled.fueltype = FUELTYPE.MAGIC',
    `    inst.components.fueled:InitializeFuelLevel(TUNING.${upper}_MAX_FUEL)`,
    `    inst.components.fueled.rate = TUNING.${upper}_DRAIN_RATE`,
    '    inst:DoPeriodicTask(1, SolarLanternRechargeTick)',
  ]
}

function solarBatteryFunctionBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  return [
    'local function OnActivate(inst, doer)',
    '    inst.is_on = not inst.is_on',
    'end',
    '',
    'local function ChargeTick(inst)',
    '    if inst.is_on and TheWorld.state.isday and not TheWorld:HasTag("cave")',
    '        and inst.components.inventoryitem.owner == nil and not inst.components.fueled:IsFull() then',
    `        inst.components.fueled:DoDelta(TUNING.${upper}_CHARGE_RATE)`,
    '    end',
    'end',
    '',
    'local function DrainIntoMana(inst, doer)',
    '    if inst.components.fueled:IsEmpty() or doer.components.mana == nil then',
    '        return false',
    '    end',
    '    local amount = inst.components.fueled.currentfuel',
    '    doer.components.mana:DoDelta(amount)',
    '    inst.components.fueled:DoDelta(-amount)',
    '    return true',
    'end',
    '',
    'local function DrainIntoTarget(inst, target)',
    '    if inst.components.fueled:IsEmpty() or target.components.fueled == nil then',
    '        return false',
    '    end',
    '    local amount = math.min(inst.components.fueled.currentfuel, target.components.fueled.maxfuel - target.components.fueled.currentfuel)',
    '    if amount <= 0 then',
    '        return false',
    '    end',
    '    target.components.fueled:DoDelta(amount)',
    '    inst.components.fueled:DoDelta(-amount)',
    '    return true',
    'end',
    '',
  ]
}

function solarBatteryComponentBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  return [
    '',
    '    inst:AddComponent("fueled")',
    '    inst.components.fueled.fueltype = FUELTYPE.MAGIC',
    `    inst.components.fueled.maxfuel = TUNING.${upper}_MAX_CHARGE`,
    '',
    '    inst:AddComponent("activatable")',
    '    inst.components.activatable.OnActivate = OnActivate',
    '    inst.components.activatable.quickaction = true',
    '',
    '    inst.DrainIntoMana = DrainIntoMana',
    '    inst.DrainIntoTarget = DrainIntoTarget',
    '',
    '    inst:DoPeriodicTask(1, ChargeTick)',
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
    lines.push(`    -- Build "${sanitizeLuaComment(build)}" reaproveitado do jogo base, sem asset próprio necessário.`)
    if (handheld) {
      lines.push(
        `    -- ATENÇÃO: build vanilla escolhido para um item empunhável — confirme se "swap_${sanitizeLuaComment(build)}" existe no jogo base antes de publicar.`,
      )
    }
  } else {
    lines.push(`    Asset("ANIM", "anim/${item.id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
    if (handheld) {
      lines.push(`    Asset("ANIM", "anim/swap_${item.id}.zip"), -- PLACEHOLDER: aparência na mão, ver README`)
    }
  }
  if (item.container?.source === 'own' && item.container.widget.source === 'custom') {
    lines.push(`    Asset("ANIM", "anim/${containerCustomWidgetBuild(item.id)}.zip"), -- PLACEHOLDER: art da UI do contêiner, ver README`)
  }
  // A vanilla-sourced item has no anim/<id>.zip of its own to derive this from —
  // declaring it anyway doesn't crash, but it's a dead reference (see itemRecipeIcon).
  if (!isVanillaAnimation(item)) {
    lines.push(`    Asset("INV_IMAGE", "${item.id}"),`)
  }
  lines.push('}')
  lines.push('')
  if (handheld) {
    lines.push(...equipFunctionsBlock(item))
  } else if (isSolarLantern(item)) {
    lines.push(...solarLanternEquipFunctionsBlock(item))
  } else if (isWearableArmor(item)) {
    lines.push(...(armorEquipSlot(item) === 'head' ? hatEquipFunctionsBlock(item) : armorEquipFunctionsBlock(item)))
  }
  if (isSolarLantern(item)) {
    lines.push(...solarLanternRechargeFunctionBlock(item))
  }
  if (needsOnAttack(item)) {
    lines.push(...onAttackFunctionBlock(item))
  }
  if (needsChainReturnLock(item)) {
    lines.push(...chainReturnLockFunctionBlock(item))
  }
  if (needsSpellcaster(item)) {
    lines.push(...spellFunctionBlock(item))
  }
  if (item.summonTotem) {
    lines.push(...summonTotemFunctionBlock(item))
  }
  if (item.solarBattery) {
    lines.push(...solarBatteryFunctionBlock(item))
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
  if (item.container?.source === 'pocketDimension') {
    lines.push(...linkedDimensionAttachFunctionBlock(item.container.dimension))
  }
  const cloudPrefabId = item.tameBomb !== undefined ? tameCloudId(item) : item.smokeBomb !== undefined ? smokeCloudId(item) : undefined
  lines.push(cloudPrefabId !== undefined ? `local prefabs = { ${luaString(cloudPrefabId)} }` : 'local prefabs = {}')
  lines.push('')
  lines.push('local function fn()')
  lines.push('    local inst = CreateEntity()')
  lines.push('')
  lines.push('    inst.entity:AddTransform()')
  lines.push('    inst.entity:AddAnimState()')
  lines.push('    inst.entity:AddNetwork()')
  if (isSolarLantern(item)) {
    lines.push('    inst.entity:AddLight()')
  }
  lines.push('')
  lines.push('    MakeInventoryPhysics(inst)')
  lines.push('')
  lines.push(`    inst.AnimState:SetBank(${luaString(resolveAnimationBank(item))})`)
  lines.push(`    inst.AnimState:SetBuild(${luaString(build)})`)
  lines.push(`    inst.AnimState:PlayAnimation(${luaString(resolveIdleClip(item))})`)
  lines.push('')
  if (isSolarLantern(item)) {
    const upper = toUpperSnake(item.id)
    lines.push(`    inst.Light:SetRadius(TUNING.${upper}_LIGHT_RADIUS)`)
    lines.push('    inst.Light:SetFalloff(.9)')
    lines.push('    inst.Light:SetIntensity(.7)')
    lines.push('    inst.Light:SetColour(255 / 255, 220 / 255, 150 / 255)')
    lines.push('    inst.Light:Enable(false)')
    lines.push('')
  }
  lines.push('    inst:AddTag("item")')
  if (item.combinable) {
    // Needs to be visible client-side too — it's read by the USEITEM component
    // action handler in modmain.lua to decide whether to show the "Combine" action.
    lines.push('    inst:AddTag("combinable_item")')
  }
  if (item.spellDef) {
    // Same reasoning as combinable_item above: a container's itemtestfn checks
    // this tag, so it needs to be a real networked tag, not just an inst field.
    lines.push('    inst:AddTag("spell")')
  }
  if (isSolarLantern(item) || item.summonTotem) {
    lines.push('    inst:AddTag("solarfueled")')
  }
  if (item.solarBattery) {
    lines.push('    inst:AddTag("solarprism")')
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

function generateSmokeCloudPrefab(item: ItemDef): string {
  const id = smokeCloudId(item)
  const upper = toUpperSnake(id)
  const lines: string[] = []

  lines.push('local assets =')
  lines.push('{')
  lines.push(`    Asset("ANIM", "anim/${id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
  lines.push('}')
  lines.push('')
  lines.push('local function ScareNearbyHostiles(inst)')
  lines.push('    local x, y, z = inst.Transform:GetWorldPosition()')
  lines.push(`    local ents = TheSim:FindEntities(x, y, z, TUNING.${upper}_RADIUS, { "hostile" })`)
  lines.push('    for _, ent in ipairs(ents) do')
  lines.push('        if ent.components.combat ~= nil then')
  lines.push('            ent.components.combat:DropTarget()')
  lines.push('        end')
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
  lines.push(`    inst:DoPeriodicTask(1, ScareNearbyHostiles)`)
  lines.push(`    inst:DoTaskInTime(TUNING.${upper}_DURATION, inst.Remove)`)
  lines.push('')
  lines.push('    return inst')
  lines.push('end')
  lines.push('')
  lines.push(`return Prefab(${luaString(id)}, fn, assets)`)

  return lines.join('\n') + '\n'
}

function generateChainReturnProjectilePrefab(item: ItemDef): string {
  const id = chakramProjectileId(item)
  const upper = toUpperSnake(id)
  const build = resolveAnimationBuild(item)
  const clip = item.weapon!.chainReturn!.projectileClip ?? 'idle'
  const lines: string[] = []

  lines.push('local assets =')
  lines.push('{')
  if (isVanillaAnimation(item)) {
    lines.push(`    -- Build "${sanitizeLuaComment(build)}" reaproveitado do jogo base, sem asset próprio necessário.`)
  } else {
    lines.push(`    Asset("ANIM", "anim/${id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
  }
  lines.push('}')
  lines.push('')
  lines.push('local CHAIN_MUST_TAGS = { "_combat" }')
  lines.push('local CHAIN_CANT_TAGS = { "INLIMBO", "player", "flying" }')
  lines.push('local CHAIN_ONEOF_TAGS = { "hostile" }')
  lines.push('')
  lines.push('local function FindNextChainTarget(inst)')
  lines.push(`    return FindEntity(inst, TUNING.${upper}_SEARCH_RADIUS, function(ent)`)
  lines.push('        return ent.components.health ~= nil and not ent.components.health:IsDead() and not inst._hit[ent]')
  lines.push('    end, CHAIN_MUST_TAGS, CHAIN_CANT_TAGS, CHAIN_ONEOF_TAGS)')
  lines.push('end')
  lines.push('')
  lines.push('local function ReturnToOwner(inst)')
  lines.push('    inst._returning = true')
  lines.push('    inst.components.projectile:Stop()')
  lines.push('    inst.Physics:ClearCollidesWith(COLLISION.LIMITS)')
  lines.push('end')
  lines.push('')
  lines.push('local function OnHit(inst, attacker, target)')
  lines.push('    inst._hit[target] = true')
  lines.push('    inst._hitcount = inst._hitcount + 1')
  lines.push(`    if inst._hitcount < TUNING.${upper}_MAX_CHAIN_HITS then`)
  lines.push('        local nexttarget = FindNextChainTarget(inst)')
  lines.push('        if nexttarget ~= nil then')
  lines.push('            inst.components.projectile:Throw(inst._weapon, nexttarget, inst._player)')
  lines.push('            return')
  lines.push('        end')
  lines.push('    end')
  lines.push('    ReturnToOwner(inst)')
  lines.push('end')
  lines.push('')
  lines.push('local function OnMiss(inst)')
  lines.push('    ReturnToOwner(inst)')
  lines.push('end')
  lines.push('')
  lines.push('local function OnThrown(inst, owner, target, attacker)')
  lines.push('    if inst._weapon == nil then')
  lines.push('        inst._weapon = owner')
  lines.push('        inst._player = attacker')
  lines.push('        inst._hitcount = 0')
  lines.push('        inst._hit = {}')
  lines.push('        if inst._weapon.components.rechargeable ~= nil then')
  lines.push('            inst._weapon.components.rechargeable:Discharge(999999)')
  lines.push('        end')
  lines.push('    end')
  lines.push('end')
  lines.push('')
  lines.push('local function OnRemoved(inst)')
  lines.push('    if inst._weapon ~= nil and inst._weapon:IsValid() and inst._weapon.components.rechargeable ~= nil then')
  lines.push('        inst._weapon.components.rechargeable:SetPercent(1)')
  lines.push('    end')
  lines.push('end')
  lines.push('')
  lines.push('local function OnUpdate(inst, dt)')
  lines.push('    if not inst._returning or inst._player == nil or not inst._player:IsValid() then')
  lines.push('        return')
  lines.push('    end')
  lines.push('    local pos = inst:GetPosition()')
  lines.push('    local targetpos = inst._player:GetPosition()')
  lines.push('    if distsq(pos, targetpos) < 1 then')
  lines.push('        inst:Remove()')
  lines.push('        return')
  lines.push('    end')
  lines.push('    inst:FacePoint(targetpos)')
  lines.push(`    inst.Physics:SetMotorVel(TUNING.${upper}_SPEED, 0, 0)`)
  lines.push('end')
  lines.push('')
  lines.push('local function fn()')
  lines.push('    local inst = CreateEntity()')
  lines.push('')
  lines.push('    inst.entity:AddTransform()')
  lines.push('    inst.entity:AddAnimState()')
  lines.push('    inst.entity:AddSoundEmitter()')
  lines.push('    inst.entity:AddNetwork()')
  lines.push('')
  lines.push('    MakeProjectilePhysics(inst)')
  lines.push('')
  lines.push(`    inst.AnimState:SetBank(${luaString(build)})`)
  lines.push(`    inst.AnimState:SetBuild(${luaString(build)})`)
  lines.push(`    inst.AnimState:PlayAnimation(${luaString(clip)}, true)`)
  lines.push('')
  lines.push('    inst:AddTag("weapon")')
  lines.push('    inst:AddTag("projectile")')
  lines.push('    inst:AddTag("NOCLICK")')
  lines.push('    inst:AddTag("NOBLOCK")')
  lines.push('')
  lines.push('    inst.entity:SetPristine()')
  lines.push('    if not TheWorld.ismastersim then')
  lines.push('        return inst')
  lines.push('    end')
  lines.push('')
  lines.push('    inst.persists = false')
  lines.push('    inst.OnRemoveEntity = OnRemoved')
  lines.push('')
  lines.push('    inst:AddComponent("weapon")')
  lines.push(`    inst.components.weapon:SetDamage(TUNING.${upper}_DAMAGE)`)
  lines.push('')
  lines.push('    inst:AddComponent("projectile")')
  lines.push(`    inst.components.projectile:SetSpeed(TUNING.${upper}_SPEED)`)
  lines.push(`    inst.components.projectile:SetRange(TUNING.${upper}_RANGE)`)
  lines.push('    inst.components.projectile:SetHoming(true)')
  lines.push('    inst.components.projectile:SetOnThrownFn(OnThrown)')
  lines.push('    inst.components.projectile:SetOnHitFn(OnHit)')
  lines.push('    inst.components.projectile:SetOnMissFn(OnMiss)')
  lines.push('    inst.components.projectile.has_damage_set = true')
  lines.push('')
  lines.push('    inst:AddComponent("updatelooper")')
  lines.push('    inst.components.updatelooper:AddOnUpdateFn(OnUpdate)')
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
  if (item.smokeBomb !== undefined) {
    files[`scripts/prefabs/${smokeCloudId(item)}.lua`] = generateSmokeCloudPrefab(item)
  }
  if (item.weapon?.chainReturn !== undefined) {
    files[`scripts/prefabs/${chakramProjectileId(item)}.lua`] = generateChainReturnProjectilePrefab(item)
  }
  return files
}
