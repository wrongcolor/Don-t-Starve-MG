import type { ItemDef, Container, SpellbookSpell } from '../types/modProject'
import { luaString, luaStringArray, sanitizeLuaComment, toUpperSnake } from './luaUtils'
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
  if (isVanillaAnimation(item) && !item.hasCustomIcon) {
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
  return (
    spell.beam !== undefined ||
    spell.nova !== undefined ||
    spell.cage !== undefined ||
    spell.desintegrate !== undefined ||
    spell.aimed === true
  )
}

function needsAimedSpell(item: ItemDef): boolean {
  if (item.spellbook?.source === 'static') {
    return item.spellbook.spells.some(isAimedSpell)
  }
  return item.spellbook?.source === 'linkedContainer'
}

// Confirmed real data point (prefabs/shadow_trap.lua's own TARGET_RADIUS =
// 6, the exact real effect radius of the ONE real spell — Waxwell's Shadow
// Trap — confirmed using "reticuleaoe_1_6"): the numeric suffix tracks the
// ring's actual drawn size in tiles. No equally-confirmed correlation
// exists for "reticuleaoe_1d2_12" (no real spell's own radius cleanly
// matches "12"), so this only ever picks between the one confirmed sized
// variant and the unsized generic fallback — not a fully general "closest
// preset" system.
function aoeReticuleNames(radius: number): { reticuleprefab: string; pingprefab: string } {
  return radius <= 6
    ? { reticuleprefab: 'reticuleaoe_1_6', pingprefab: 'reticuleaoeping_1_6' }
    : { reticuleprefab: 'reticuleaoe', pingprefab: 'reticuleaoeping' }
}

// Confirmed against the real waxwelljournal.lua (Wickerbottom's own spellbook
// item): AddComponent("spellbook") + SetItems/SetShouldOpenFn happen BEFORE
// SetPristine()/the ismastersim check — i.e. on BOTH client and server, unlike
// every other component this generator adds (which are all server-only,
// inside componentBlock). componentactions.lua's own spellbook action handler
// confirms this ("--spellbook exists on clients too") and reads
// inst.components.spellbook directly on the client; putting it in the
// server-only block instead left it nil there, reproduced in-game as
// "attempt to index field 'spellbook' (a nil value)" the moment a spellbook
// item's tooltip/action list was ever computed (hovering over it or its
// linked container in the inventory).
function spellbookComponentLines(item: ItemDef): string[] {
  if (!needsSpellbook(item)) return []
  const lines = ['', '    inst:AddComponent("spellbook")']
  if (item.spellbook?.source === 'linkedContainer') {
    // Reproduced in-game: componentactions.lua's own INVENTORY.spellbook
    // handler (the code that decides whether "Use Spell Book" even shows up
    // in the right-click menu) gates on SpellBook:CanBeUsedBy(user), which
    // requires self.items to ALREADY be a non-empty table — evaluated fresh
    // every time the CLIENT computes that menu, running entirely independent
    // of (and before) SetShouldOpenFn/ShouldOpen ever gets a chance to run
    // (that only fires from actions.lua's USESPELLBOOK.pre_action_cb, which
    // itself only runs once the action already exists in the menu). The
    // previous SetShouldOpenFn-only approach left self.items permanently nil
    // on both sides until the action had already appeared — a chicken/egg
    // deadlock that meant "Use Spell Book" never appeared on the staff at
    // all, confirmed via componentactions.lua/actions.lua from the real game
    // scripts. Fix: keep self.items proactively in sync via a periodic task
    // (RefreshSpellbookItems/rebuild_spellbook_items, emitted in
    // linkedContainerSpellbookFunctionBlock) instead of lazily inside
    // ShouldOpen.
    lines.push('    inst:DoPeriodicTask(0.5, RefreshSpellbookItems)')
  } else {
    lines.push('    inst.components.spellbook:SetItems(SPELLBOOK_SPELLS)')
  }
  return lines
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

function spellRefractionLuaTable(refraction: NonNullable<SpellbookSpell['refraction']>): string {
  return `{ radius = ${refraction.radius}, duration = ${refraction.immuneSeconds} }`
}

function spellFlashbangLuaTable(flashbang: NonNullable<SpellbookSpell['flashbang']>): string {
  return `{ radius = ${flashbang.radius}, stun = ${flashbang.stunSeconds} }`
}

function spellCageLuaTable(cage: NonNullable<SpellbookSpell['cage']>): string {
  return `{ prefab = ${luaString(cage.pillarPrefab)}, radius = ${cage.radius}, count = ${cage.pillarCount}, rooted = ${cage.rootedSeconds} }`
}

function spellDesintegrateLuaTable(desintegrate: NonNullable<SpellbookSpell['desintegrate']>): string {
  return `{ radius = ${desintegrate.radius}, damage = ${desintegrate.damage}, casttime = ${desintegrate.castTimeSeconds} }`
}

function spellGearDropLuaTable(gearDrop: NonNullable<SpellbookSpell['gearDrop']>): string {
  return `{ prefabs = ${luaStringArray(gearDrop.prefabs)}, radius = ${gearDrop.radius} }`
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

// Confirmed real APIs: TheSim:FindEntities(..., radius, {"player"}) finds
// every nearby player (the caster included) the same way
// squadAlertFunctionBlock (creature.ts) already finds nearby allies, and
// Health:SetInvincible(val) is the same real toggle CreatureDef.invincible
// already uses permanently — flipped back off after the duration via a
// plain DoTaskInTime. Never aimed, so this needs no pos at all.
function solarRefractionHelperFunctionBlock(): string[] {
  return [
    'local function DoSpellRefraction(user, refraction)',
    '    local x, y, z = user.Transform:GetWorldPosition()',
    '    local allies = TheSim:FindEntities(x, y, z, refraction.radius, { "player" })',
    '    for _, ally in ipairs(allies) do',
    '        if ally.components.health ~= nil then',
    '            ally.components.health:SetInvincible(true)',
    '            ally:DoTaskInTime(refraction.duration, function()',
    '                if ally.components.health ~= nil then',
    '                    ally.components.health:SetInvincible(false)',
    '                end',
    '            end)',
    '        end',
    '    end',
    'end',
    '',
  ]
}

// Confirmed real APIs: TheSim:FindEntities(..., radius, nil, {"INLIMBO",
// "player"}) — the same "exclude, don't require" cantTags scan
// solarBeamHelperFunctionBlock already uses for its own damage tick — casts
// a wide net (no oneOfTags at all, unlike nova's {"hostile"} requirement),
// catching every creature in range regardless of hostile/neutral/passive
// status. Pure stun via Freezable:Freeze, no damage/health check needed.
// The caster's own companion (CreatureDef.companion, see needsFollower in
// creature.ts) uses the same real "follower" component every vanilla
// follower (Chester, Abigail) does — components.follower:GetLeader() is the
// direct, real way to check whose companion an entity is, so her own
// summons are spared from her own blast without excluding anyone else's.
function flashbangHelperFunctionBlock(): string[] {
  return [
    'local function DoSpellFlashbang(user, flashbang)',
    '    local x, y, z = user.Transform:GetWorldPosition()',
    '    local victims = TheSim:FindEntities(x, y, z, flashbang.radius, nil, { "INLIMBO", "player" })',
    '    for _, victim in ipairs(victims) do',
    '        local isowncompanion = victim.components.follower ~= nil and victim.components.follower:GetLeader() == user',
    '        if victim.components.freezable ~= nil and not isowncompanion then',
    '            victim.components.freezable:Freeze(flashbang.stun)',
    '        end',
    '    end',
    'end',
    '',
  ]
}

// Confirmed real mechanism (Waxwell's own "Shadow Pillars" spell —
// prefabs/waxwelljournal.lua's PillarsSpellFn + prefabs/shadow_pillar.lua's
// DoPillarsTarget/DoPillars): rings pillar props evenly around a circle
// (same TWOPI * i / count angle math groundAttack.ts/structure.ts already
// use for their own circular placement) and adds the real
// components/rooted.lua component to every enemy caught inside — an actual
// movement lock (Physics:Stop() + 0 speed), not a slow. AddSource/RemoveSource
// are the real ref-counted API (the component removes itself once its last
// source is gone), so a fresh AddComponent is only needed the first time.
// Pillars self-remove once the root wears off — the real spell's own pillars
// are ephemeral too (each carries its own lifetime timer), not a permanent
// structure. Excludes the caster's own companion the same way flashbang
// does (components.follower:GetLeader() == user).
function cageHelperFunctionBlock(): string[] {
  return [
    'local function DoSpellCage(user, pos, cage)',
    '    local x, y, z = pos:Get()',
    '    local pillars = {}',
    '    for i = 1, cage.count do',
    '        local angle = TWOPI * (i - 1) / cage.count',
    '        local pillar = SpawnPrefab(cage.prefab)',
    '        if pillar ~= nil then',
    '            pillar.Transform:SetPosition(x + math.cos(angle) * cage.radius, 0, z - math.sin(angle) * cage.radius)',
    '            table.insert(pillars, pillar)',
    '        end',
    '    end',
    '',
    '    local victims = TheSim:FindEntities(x, y, z, cage.radius, nil, { "INLIMBO", "player" })',
    '    for _, victim in ipairs(victims) do',
    '        local isowncompanion = victim.components.follower ~= nil and victim.components.follower:GetLeader() == user',
    '        if victim.components.locomotor ~= nil and not isowncompanion then',
    '            if victim.components.rooted == nil then',
    '                victim:AddComponent("rooted")',
    '            end',
    '            victim.components.rooted:AddSource(user)',
    '            victim:DoTaskInTime(cage.rooted, function()',
    '                if victim.components.rooted ~= nil then',
    '                    victim.components.rooted:RemoveSource(user)',
    '                end',
    '            end)',
    '        end',
    '    end',
    '',
    '    user:DoTaskInTime(cage.rooted, function()',
    '        for _, pillar in ipairs(pillars) do',
    '            if pillar:IsValid() then',
    '                pillar:Remove()',
    '            end',
    '        end',
    '    end)',
    'end',
    '',
  ]
}

// Same telegraph idea solarBeamHelperFunctionBlock's own StartSpellBeam
// already uses for its own optional telegraph (a "reticule" marker sits at
// the point, then DoTaskInTime fires once the wait is over) — applied here
// to a one-shot blast instead of a channeled tick. The radius scan
// (TheSim:FindEntities with the same "exclude, don't require" cantTags
// pattern flashbangHelperFunctionBlock uses) only runs AFTER casttime has
// fully elapsed, re-checking who's actually still standing in the circle
// at that moment — not who was there when it was cast. Excludes the
// caster's own companion, same as flashback/cage.
function desintegrateHelperFunctionBlock(): string[] {
  return [
    'local function DoSpellDesintegrate(user, pos, desintegrate)',
    '    local x, y, z = pos:Get()',
    '    local marker = SpawnPrefab("reticule")',
    '    if marker ~= nil then',
    '        marker.Transform:SetPosition(x, 0, z)',
    '    end',
    '',
    '    user:DoTaskInTime(desintegrate.casttime, function()',
    '        if marker ~= nil and marker:IsValid() then',
    '            marker:Remove()',
    '        end',
    '',
    '        local victims = TheSim:FindEntities(x, y, z, desintegrate.radius, nil, { "INLIMBO", "player" })',
    '        for _, victim in ipairs(victims) do',
    '            local isowncompanion = victim.components.follower ~= nil and victim.components.follower:GetLeader() == user',
    '            if victim.components.health ~= nil and not victim.components.health:IsDead() and not isowncompanion then',
    '                victim.components.health:DoDelta(-desintegrate.damage, false, "desintegrate", false, user)',
    '            end',
    '        end',
    '    end)',
    'end',
    '',
  ]
}

// Confirmed real API (prefabs/beefaloherd.lua/components/piratespawner.lua —
// the same "scatter within a range" idiom worldEvent.ts's own spawnFunctionBlock
// already uses): FindWalkableOffset(pos, angle, radius, tries, ...) picks a
// random valid ground point, called once PER prefab so each of the dropped
// items/creatures lands at its own spot instead of stacking on one point.
// Falls back to the caster's exact position if no valid offset is found
// (e.g. she's boxed in) rather than silently skipping the drop. Never
// aimed — always centered on herself, like refraction/flashbang/cage.
function gearDropHelperFunctionBlock(): string[] {
  return [
    'local function DoSpellGearDrop(user, geardrop)',
    '    local x, y, z = user.Transform:GetWorldPosition()',
    '    for _, prefab in ipairs(geardrop.prefabs) do',
    '        local spawned = SpawnPrefab(prefab)',
    '        if spawned ~= nil then',
    '            local offset = FindWalkableOffset(Vector3(x, y, z), math.random() * TWOPI, geardrop.radius, 8, true, false)',
    '            if offset ~= nil then',
    '                spawned.Transform:SetPosition(x + offset.x, y + offset.y, z + offset.z)',
    '            else',
    '                spawned.Transform:SetPosition(x, y, z)',
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
  if (spells.some((spell) => spell.refraction !== undefined)) {
    lines.push(...solarRefractionHelperFunctionBlock())
  }
  if (spells.some((spell) => spell.flashbang !== undefined)) {
    lines.push(...flashbangHelperFunctionBlock())
  }
  if (spells.some((spell) => spell.cage !== undefined)) {
    lines.push(...cageHelperFunctionBlock())
  }
  if (spells.some((spell) => spell.desintegrate !== undefined)) {
    lines.push(...desintegrateHelperFunctionBlock())
  }
  if (spells.some((spell) => spell.gearDrop !== undefined)) {
    lines.push(...gearDropHelperFunctionBlock())
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
    if (spell.refraction !== undefined) {
      lines.push(`    DoSpellRefraction(user, ${spellRefractionLuaTable(spell.refraction)})`)
    }
    if (spell.flashbang !== undefined) {
      lines.push(`    DoSpellFlashbang(user, ${spellFlashbangLuaTable(spell.flashbang)})`)
    }
    if (spell.cage !== undefined) {
      lines.push(`    DoSpellCage(user, pos, ${spellCageLuaTable(spell.cage)})`)
    }
    if (spell.desintegrate !== undefined) {
      lines.push(`    DoSpellDesintegrate(user, pos, ${spellDesintegrateLuaTable(spell.desintegrate)})`)
    }
    if (spell.gearDrop !== undefined) {
      lines.push(`    DoSpellGearDrop(user, ${spellGearDropLuaTable(spell.gearDrop)})`)
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
    // Confirmed in the real widgets/wheel.lua: Wheel:Open() greys out (and
    // blocks clicks on, per widgets/button.lua's own OnControl — a disabled
    // button never fires onclick) any entry whose checkenabled(owner) returns
    // false, evaluated fresh every time the wheel opens. Only meaningful for
    // a spell with a manaCost — same mana check already used inside
    // spellbook_cast_N above, just non-destructive (comparing against a
    // netvar instead of calling Mana:IsEnough/Spend).
    //
    // Reproduced in-game: checkenabled runs on the WHEEL WIDGET, which only
    // ever exists client-side — `owner.components.mana` is nil there (the
    // custom "mana" component has no _replica.lua, unlike inventoryitem/
    // container), so checking it here always fell through to "no mana
    // component, let it through" regardless of the real amount, and every
    // spell stayed clickable/castable no matter how little mana the caster
    // had. Fix: read `owner.mana_current` — a plain netvar the mana HUD
    // wiring (modmain.ts's characterManaHudBlock) already mirrors from the
    // real server-side amount for exactly this kind of client-side check.
    if (spell.manaCost !== undefined && spell.manaCost > 0) {
      lines.push(`        checkenabled = function(owner) return owner.mana_current == nil or owner.mana_current:value() >= ${spell.manaCost} end,`)
    }
    lines.push('        onselect = function(inst)')
    lines.push(`            inst.components.spellbook:SetSpellName(${label})`)
    if (isAimedSpell(spell)) {
      lines.push('            inst.components.spellbook:SetSpellFn(nil)')
      if (spell.beam !== undefined) {
        lines.push(`            inst.components.aoetargeting:SetRange(${spell.beam.range})`)
      }
      // Confirmed real prefabs (prefabs/reticuleaoe.lua, prefabs/
      // reticuleline.lua): every real aimed spell explicitly sets its own
      // reticuleprefab/pingprefab in onselect (waxwelljournal.lua's own
      // SPELLS table never leaves it implicit) — reticule state is mutated
      // in place on the shared aoetargeting component, so switching between
      // spells in the same wheel would otherwise leak the previous shape.
      // "reticuleline"/"reticulelineping" is the same directional-line pair
      // real vanilla's own straight-line attacks use (Wigfrid's spear —
      // prefabs/spear_gungnir.lua/spear_wathgrithr.lua — and Willow's
      // ember — prefabs/willow_ember.lua), a natural fit for a beam's own
      // fixed direction+range. nova/cage/desintegrate pick the closest AOE
      // ring via aoeReticuleNames (radius-aware for the one confirmed size
      // variant, see its own comment) — there's no way to scale a ring to
      // an arbitrary configured radius, only pick between a handful of
      // fixed-size baked animations, so this is an approximate area cue,
      // not a to-scale preview.
      if (spell.beam !== undefined) {
        lines.push('            inst.components.aoetargeting.reticule.reticuleprefab = "reticuleline"')
        lines.push('            inst.components.aoetargeting.reticule.pingprefab = "reticulelineping"')
      } else if (spell.nova !== undefined || spell.cage !== undefined || spell.desintegrate !== undefined) {
        const { reticuleprefab, pingprefab } = aoeReticuleNames((spell.nova ?? spell.cage ?? spell.desintegrate)!.radius)
        lines.push(`            inst.components.aoetargeting.reticule.reticuleprefab = ${luaString(reticuleprefab)}`)
        lines.push(`            inst.components.aoetargeting.reticule.pingprefab = ${luaString(pingprefab)}`)
      } else {
        lines.push('            inst.components.aoetargeting.reticule.reticuleprefab = "reticule"')
        lines.push('            inst.components.aoetargeting.reticule.pingprefab = nil')
      }
      // Confirmed against the real prefabs/ghostcommand_defs.lua: onselect
      // runs on BOTH client and server (it's what the wheel widget calls
      // straight from a mouse click — see spellbook.lua's own "client and
      // server" comment on SelectSpell), but aoespell is a server-only
      // component (see aimedSpellSharedLines's comment). Real vanilla wraps
      // exactly this SetSpellFn call in the same guard — reproduced in-game
      // as "attempt to index field 'aoespell' (a nil value)" the moment an
      // aimed spell was ever selected in the wheel without it.
      lines.push('            if TheWorld.ismastersim then')
      lines.push(`                inst.components.aoespell:SetSpellFn(spellbook_cast_${index + 1})`)
      lines.push('            end')
    } else {
      lines.push(`            inst.components.spellbook:SetSpellFn(spellbook_cast_${index + 1})`)
      if (hasAimedSpell) {
        lines.push('            if TheWorld.ismastersim then')
        lines.push('                inst.components.aoespell:SetSpellFn(nil)')
        lines.push('            end')
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

// Confirmed against the real game scripts (docs/dst-knowledge/patterns.md#62,
// componentactions.lua, actions.lua): the linked container's slot contents
// (`container.slots`/`container.numslots`) only ever exist on the SERVER
// component — the client-side replica (container_replica.lua) only exposes
// them once the container has an "opener" (i.e. someone has it visibly OPEN
// on screen right now), confirmed via GetItemInSlot/GetItems/FindItem all
// gating on `self.opener ~= nil`. Since the spellbook's self.items must be
// populated on the CLIENT's own copy too (CanBeUsedBy — the check gating
// whether "Use Spell Book" even appears in the menu — runs locally on each
// side), the staff can never read the codex's live slots directly without
// the codex being open, which defeats the whole point. Fix: the codex itself
// (see the `container.acceptsTag === 'spell'` branch in componentBlock)
// mirrors its own contents into a plain custom net_string (inst.spell_contents,
// declared in the shared section of its own prefab) every time its contents
// change — a normal per-ENTITY netvar, unrelated to the container-open/opener
// system, so it's always in sync for both sides regardless of whether the
// codex is open. All data the wheel needs to render/cast (label + numeric
// deltas + summon prefab) is baked directly into that string (encoded with
// ASCII 30/31 field/entry separators — chosen simply because game text never
// legitimately contains them), so this staff never needs the whole mod
// project's item list, just the encoded payload.
function linkedContainerSpellbookFunctionBlock(containerItemId: string): string[] {
  const lines: string[] = []
  lines.push(...aimedSpellHelperFunctionBlock())
  lines.push(...solarBeamHelperFunctionBlock())
  lines.push(...solarNovaHelperFunctionBlock())
  lines.push(...solarRefractionHelperFunctionBlock())
  lines.push(...flashbangHelperFunctionBlock())
  lines.push(...cageHelperFunctionBlock())
  lines.push(...desintegrateHelperFunctionBlock())
  lines.push(...gearDropHelperFunctionBlock())
  // Confirmed in the real components/inventory.lua (server) and prefabs/
  // inventory_classified.lua (client): the replica's own FindItem only
  // scans itemslots/activeitem/overflow — it never checks equipslots (that's
  // what the SEPARATE FindItems, plural, is for, and that one isn't even
  // exposed on the replica at all, server-only). A self-referential
  // linkedContainer (the caster item pointing at its own id, so equipping
  // and casting are the same item) would otherwise never find itself the
  // moment it's actually worn in the hand slot — FindItem falling through
  // to nil there. GetEquippedItem(EQUIPSLOTS.HANDS) IS replicated to both
  // sides and covers exactly that gap; harmless no-op fallback for the
  // ordinary case of a spellbook item pointing at a SEPARATE, unequipped
  // container item, since FindItem already succeeds there.
  lines.push('local function FindCodex(user)')
  lines.push('    local codex = user.replica.inventory ~= nil and user.replica.inventory:FindItem(function(item)')
  lines.push(`        return item.prefab == ${luaString(containerItemId)}`)
  lines.push('    end)')
  lines.push('    if codex == nil and user.replica.inventory ~= nil then')
  lines.push('        local equipped = user.replica.inventory:GetEquippedItem(EQUIPSLOTS.HANDS)')
  lines.push(`        if equipped ~= nil and equipped.prefab == ${luaString(containerItemId)} then`)
  lines.push('            codex = equipped')
  lines.push('        end')
  lines.push('    end')
  lines.push('    return codex')
  lines.push('end')
  lines.push('')
  lines.push('local function rebuild_spellbook_items(user)')
  lines.push('    local codex = FindCodex(user)')
  lines.push('    if codex == nil or codex.spell_contents == nil then')
  lines.push('        return nil')
  lines.push('    end')
  lines.push('')
  lines.push('    local items = {}')
  lines.push('    for entry in codex.spell_contents:value():gmatch("[^\\30]+") do')
  lines.push('        local fields = {}')
  lines.push('        for field in (entry .. "\\31"):gmatch("(.-)\\31") do')
  lines.push('            table.insert(fields, field)')
  lines.push('        end')
  lines.push('        local label, manacost, healthdelta, sanitydelta, hungerdelta, summonprefab,')
  lines.push('            isaimed, beamdamage, beamtickinterval, beamrange, beamduration, beamtelegraph,')
  lines.push('            novadamage, novaradius, novastun, refractionradius, refractionduration,')
  lines.push('            flashbangradius, flashbangstun, cageprefab, cageradius, cagecount, cagerooted,')
  lines.push('            desintegrateradius, desintegratedamage, desintegratecasttime,')
  lines.push('            geardropprefabs, geardropradius =')
  lines.push('            fields[1], fields[2], fields[3], fields[4], fields[5], fields[6],')
  lines.push('            fields[7], fields[8], fields[9], fields[10], fields[11], fields[12],')
  lines.push('            fields[13], fields[14], fields[15], fields[16], fields[17],')
  lines.push('            fields[18], fields[19], fields[20], fields[21], fields[22], fields[23],')
  lines.push('            fields[24], fields[25], fields[26],')
  lines.push('            fields[27], fields[28]')
  lines.push('        table.insert(items, {')
  lines.push('            label = label,')
  // Same real widgets/wheel.lua checkenabled convention, and the same
  // client-side-only netvar fix, as the static mode above (see
  // staticSpellbookFunctionBlock's comment) — closes over this loop
  // iteration's own `manacost`.
  lines.push('            checkenabled = function(owner) return manacost == "" or owner.mana_current == nil or owner.mana_current:value() >= tonumber(manacost) end,')
  lines.push('            onselect = function(inst)')
  lines.push('                inst.components.spellbook:SetSpellName(label)')
  lines.push('                local function cast(inst, user, pos)')
  lines.push('                    if manacost ~= "" and user.components.mana ~= nil')
  lines.push('                        and not user.components.mana:Spend(tonumber(manacost)) then')
  lines.push('                        return false')
  lines.push('                    end')
  lines.push('                    if isaimed == "1" then')
  lines.push('                        user:ForceFacePoint(pos:Get())')
  lines.push('                    end')
  lines.push('                    if healthdelta ~= "" and user.components.health ~= nil then')
  lines.push('                        user.components.health:DoDelta(tonumber(healthdelta))')
  lines.push('                    end')
  lines.push('                    if sanitydelta ~= "" and user.components.sanity ~= nil then')
  lines.push('                        user.components.sanity:DoDelta(tonumber(sanitydelta))')
  lines.push('                    end')
  lines.push('                    if hungerdelta ~= "" and user.components.hunger ~= nil then')
  lines.push('                        user.components.hunger:DoDelta(tonumber(hungerdelta))')
  lines.push('                    end')
  lines.push('                    if summonprefab ~= "" then')
  lines.push('                        local fx = SpawnPrefab(summonprefab)')
  lines.push('                        if fx ~= nil then')
  // Reproduced in-game (real crash, killed the whole server process):
  // "bad argument #2 to 'SetPosition' (number expected, got no value)".
  // pos:Get()/GetWorldPosition() each return 3 values (x, y, z), but Lua
  // truncates a multi-value expression down to ONE value the moment it's
  // used as an operand of "and"/"or" — `cond and a() or b()` only ever
  // yields a's or b's FIRST return value, never all three. SetPosition then
  // received just an x with no y/z. An explicit if/else (each branch calling
  // SetPosition directly, as the very last expression) keeps all 3 values.
  lines.push('                            if isaimed == "1" then')
  lines.push('                                fx.Transform:SetPosition(pos:Get())')
  lines.push('                            else')
  lines.push('                                fx.Transform:SetPosition(user.Transform:GetWorldPosition())')
  lines.push('                            end')
  lines.push('                        end')
  lines.push('                    end')
  lines.push('                    if beamdamage ~= "" then')
  lines.push('                        StartSpellBeam(user, {')
  lines.push('                            damage = tonumber(beamdamage),')
  lines.push('                            tickinterval = tonumber(beamtickinterval),')
  lines.push('                            range = tonumber(beamrange),')
  lines.push('                            duration = tonumber(beamduration),')
  lines.push('                            telegraph = beamtelegraph ~= "" and tonumber(beamtelegraph) or nil,')
  lines.push('                        })')
  lines.push('                    end')
  lines.push('                    if novadamage ~= "" then')
  lines.push('                        DoSpellNova(user, pos, { damage = tonumber(novadamage), radius = tonumber(novaradius), stun = tonumber(novastun) })')
  lines.push('                    end')
  lines.push('                    if refractionradius ~= "" then')
  lines.push('                        DoSpellRefraction(user, { radius = tonumber(refractionradius), duration = tonumber(refractionduration) })')
  lines.push('                    end')
  lines.push('                    if flashbangradius ~= "" then')
  lines.push('                        DoSpellFlashbang(user, { radius = tonumber(flashbangradius), stun = tonumber(flashbangstun) })')
  lines.push('                    end')
  lines.push('                    if cageprefab ~= "" then')
  lines.push('                        DoSpellCage(user, pos, { prefab = cageprefab, radius = tonumber(cageradius), count = tonumber(cagecount), rooted = tonumber(cagerooted) })')
  lines.push('                    end')
  lines.push('                    if desintegrateradius ~= "" then')
  lines.push(
    '                        DoSpellDesintegrate(user, pos, { radius = tonumber(desintegrateradius), damage = tonumber(desintegratedamage), casttime = tonumber(desintegratecasttime) })',
  )
  lines.push('                    end')
  lines.push('                    if geardropprefabs ~= "" then')
  lines.push('                        local dropprefabs = {}')
  lines.push('                        for dropprefab in geardropprefabs:gmatch("[^,]+") do')
  lines.push('                            table.insert(dropprefabs, dropprefab)')
  lines.push('                        end')
  lines.push('                        DoSpellGearDrop(user, { prefabs = dropprefabs, radius = tonumber(geardropradius) })')
  lines.push('                    end')
  lines.push('                    if inst.components.finiteuses ~= nil then')
  lines.push('                        inst.components.finiteuses:Use(1)')
  lines.push('                    end')
  lines.push('                    return true')
  lines.push('                end')
  lines.push('                if isaimed == "1" then')
  lines.push('                    inst.components.spellbook:SetSpellFn(nil)')
  lines.push('                    if beamrange ~= "" then')
  lines.push('                        inst.components.aoetargeting:SetRange(tonumber(beamrange))')
  lines.push('                    end')
  // See the static-spellbook onselect's own comment for why this is always
  // set explicitly, never left implicit — reticule state is shared/mutated
  // in place on the item's aoetargeting component across every spell in the
  // wheel. "reticuleline"/"reticulelineping" mirrors Wigfrid's spear/
  // Willow's ember own directional-line reticule. nova/cage/desintegrate
  // pick between "reticuleaoe_1_6" (the one confirmed radius-6 variant —
  // see aoeReticuleNames's own comment) and the generic "reticuleaoe"
  // fallback based on the decoded radius, same rule as the static-spellbook
  // branch, just resolved at runtime since onselect doesn't know ahead of
  // time which spell was picked.
  lines.push('                    if beamdamage ~= "" then')
  lines.push('                        inst.components.aoetargeting.reticule.reticuleprefab = "reticuleline"')
  lines.push('                        inst.components.aoetargeting.reticule.pingprefab = "reticulelineping"')
  lines.push('                    elseif novadamage ~= "" or cageprefab ~= "" or desintegrateradius ~= "" then')
  lines.push(
    '                        local aoeradius = tonumber(novadamage ~= "" and novaradius or (cageprefab ~= "" and cageradius or desintegrateradius))',
  )
  lines.push('                        if aoeradius ~= nil and aoeradius <= 6 then')
  lines.push('                            inst.components.aoetargeting.reticule.reticuleprefab = "reticuleaoe_1_6"')
  lines.push('                            inst.components.aoetargeting.reticule.pingprefab = "reticuleaoeping_1_6"')
  lines.push('                        else')
  lines.push('                            inst.components.aoetargeting.reticule.reticuleprefab = "reticuleaoe"')
  lines.push('                            inst.components.aoetargeting.reticule.pingprefab = "reticuleaoeping"')
  lines.push('                        end')
  lines.push('                    else')
  lines.push('                        inst.components.aoetargeting.reticule.reticuleprefab = "reticule"')
  lines.push('                        inst.components.aoetargeting.reticule.pingprefab = nil')
  lines.push('                    end')
  // See the static-spellbook onselect's own comment: aoespell is server-only,
  // but onselect runs on both sides (confirmed via ghostcommand_defs.lua),
  // so this has to be guarded the same way real vanilla guards it.
  lines.push('                    if TheWorld.ismastersim then')
  lines.push('                        inst.components.aoespell:SetSpellFn(cast)')
  lines.push('                    end')
  lines.push('                else')
  lines.push('                    inst.components.spellbook:SetSpellFn(cast)')
  lines.push('                    if TheWorld.ismastersim then')
  lines.push('                        inst.components.aoespell:SetSpellFn(nil)')
  lines.push('                    end')
  lines.push('                end')
  lines.push('            end,')
  lines.push('            execute = (isaimed == "1") and StartAOETargeting or function(inst)')
  lines.push('                local inventory = ThePlayer.replica.inventory')
  lines.push('                if inventory ~= nil then')
  lines.push('                    inventory:CastSpellBookFromInv(inst)')
  lines.push('                end')
  lines.push('            end,')
  lines.push('        })')
  lines.push('    end')
  lines.push('    return items')
  lines.push('end')
  lines.push('')
  // GetGrandOwner (server) / IsGrandOwner(ThePlayer) (client) — same real
  // APIs already confirmed for the componentactions.lua INVENTORY.spellbook
  // gate itself (IsGrandOwner). Needed here because rebuild_spellbook_items
  // requires a `user` (whoever currently carries this staff) and, unlike the
  // menu-click path, a periodic task has no doer handed to it.
  lines.push('local function GetSpellbookOwner(inst)')
  lines.push('    if TheWorld.ismastersim then')
  lines.push('        return inst.components.inventoryitem ~= nil and inst.components.inventoryitem:GetGrandOwner() or nil')
  lines.push('    end')
  lines.push('    return inst.replica.inventoryitem ~= nil and inst.replica.inventoryitem:IsGrandOwner(ThePlayer) and ThePlayer or nil')
  lines.push('end')
  lines.push('')
  lines.push('local function RefreshSpellbookItems(inst)')
  lines.push('    local owner = GetSpellbookOwner(inst)')
  lines.push('    inst.components.spellbook:SetItems(owner ~= nil and rebuild_spellbook_items(owner) or nil)')
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
  if (spell.refraction !== undefined) {
    lines.push(`    inst.spell_refraction = ${spellRefractionLuaTable(spell.refraction)}`)
  }
  if (spell.flashbang !== undefined) {
    lines.push(`    inst.spell_flashbang = ${spellFlashbangLuaTable(spell.flashbang)}`)
  }
  if (spell.cage !== undefined) {
    lines.push(`    inst.spell_cage = ${spellCageLuaTable(spell.cage)}`)
  }
  if (spell.desintegrate !== undefined) {
    lines.push(`    inst.spell_desintegrate = ${spellDesintegrateLuaTable(spell.desintegrate)}`)
  }
  if (spell.gearDrop !== undefined) {
    lines.push(`    inst.spell_geardrop = ${spellGearDropLuaTable(spell.gearDrop)}`)
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
  if (weapon.bonusVsTag !== undefined) {
    lines.push('    inst:AddComponent("damagetypebonus")')
    lines.push(
      `    inst.components.damagetypebonus:AddBonus(${luaString(weapon.bonusVsTag.tag)}, inst, TUNING.${upper}_DAMAGE_VS_TAG_BONUS)`,
    )
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

// Confirmed against the real prefabs/abigail_flower.lua: AddComponent("aoetargeting")
// happens in the SHARED (client+server) section, before SetPristine() — the
// reticule it drives is drawn and moved by the CLIENT, so it must exist there
// too. AddComponent("aoespell") stays server-only (added after the
// ismastersim guard, same file) — it's what actually resolves the cast.
// mouseenabled makes the reticule follow TheInput:GetWorldPosition() in real
// time instead of a fixed point, with targetfn kept as the controller-mode
// fallback (components/reticule.lua). SetRange is set per-spell in onselect
// instead (see staticSpellbookFunctionBlock/linkedContainerSpellbookFunctionBlock),
// matching prefabs/ghostcommand_defs.lua's own per-command SetRange calls.
function aimedSpellSharedLines(): string[] {
  return [
    '    inst:AddComponent("aoetargeting")',
    '    inst.components.aoetargeting.reticule.targetfn = spell_aoe_reticuletargetfn',
    '    inst.components.aoetargeting.reticule.mouseenabled = true',
  ]
}

function aimedSpellComponentBlock(): string[] {
  return ['', '    inst:AddComponent("aoespell")']
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
  if (container.acceptsTag === 'spell') {
    // Feeds a linkedContainer spellbook staff elsewhere in the mod (see
    // linkedContainerSpellbookFunctionBlock's own comment for the full
    // client-visibility explanation) — mirrors this container's own
    // contents into inst.spell_contents (a plain per-entity netvar declared
    // in the shared section below) every time a "spell"-tagged item is put
    // in or taken out, so any staff can read it on both sides without this
    // container ever needing to be open.
    lines.push(
      '',
      '    local function UpdateSpellContents(inst)',
      '        local parts = {}',
      '        for slot = 1, inst.components.container.numslots do',
      '            local slotitem = inst.components.container.slots[slot]',
      '            if slotitem ~= nil and slotitem.spell_label ~= nil then',
      '                local isaimed = slotitem.spell_beam ~= nil or slotitem.spell_nova ~= nil or slotitem.spell_cage ~= nil or slotitem.spell_desintegrate ~= nil or slotitem.spell_aimed',
      '                local beam = slotitem.spell_beam',
      '                local nova = slotitem.spell_nova',
      '                local refraction = slotitem.spell_refraction',
      '                local flashbang = slotitem.spell_flashbang',
      '                local cage = slotitem.spell_cage',
      '                local desintegrate = slotitem.spell_desintegrate',
      '                local geardrop = slotitem.spell_geardrop',
      '                table.insert(parts, table.concat({',
      '                    slotitem.spell_label,',
      '                    tostring(slotitem.spell_manacost or ""),',
      '                    tostring(slotitem.spell_healthdelta or ""),',
      '                    tostring(slotitem.spell_sanitydelta or ""),',
      '                    tostring(slotitem.spell_hungerdelta or ""),',
      '                    slotitem.spell_summonprefab or "",',
      '                    isaimed and "1" or "",',
      '                    beam ~= nil and tostring(beam.damage) or "",',
      '                    beam ~= nil and tostring(beam.tickinterval) or "",',
      '                    beam ~= nil and tostring(beam.range) or "",',
      '                    beam ~= nil and tostring(beam.duration) or "",',
      '                    (beam ~= nil and beam.telegraph ~= nil) and tostring(beam.telegraph) or "",',
      '                    nova ~= nil and tostring(nova.damage) or "",',
      '                    nova ~= nil and tostring(nova.radius) or "",',
      '                    nova ~= nil and tostring(nova.stun) or "",',
      '                    refraction ~= nil and tostring(refraction.radius) or "",',
      '                    refraction ~= nil and tostring(refraction.duration) or "",',
      '                    flashbang ~= nil and tostring(flashbang.radius) or "",',
      '                    flashbang ~= nil and tostring(flashbang.stun) or "",',
      '                    cage ~= nil and cage.prefab or "",',
      '                    cage ~= nil and tostring(cage.radius) or "",',
      '                    cage ~= nil and tostring(cage.count) or "",',
      '                    cage ~= nil and tostring(cage.rooted) or "",',
      '                    desintegrate ~= nil and tostring(desintegrate.radius) or "",',
      '                    desintegrate ~= nil and tostring(desintegrate.damage) or "",',
      '                    desintegrate ~= nil and tostring(desintegrate.casttime) or "",',
      '                    geardrop ~= nil and table.concat(geardrop.prefabs, ",") or "",',
      '                    geardrop ~= nil and tostring(geardrop.radius) or "",',
      '                }, "\\31"))',
      '            end',
      '        end',
      '        inst.spell_contents:set(table.concat(parts, "\\30"))',
      '    end',
      '    inst:ListenForEvent("itemget", UpdateSpellContents)',
      '    inst:ListenForEvent("itemlose", UpdateSpellContents)',
      '    UpdateSpellContents(inst)',
    )
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
  if (isVanillaAnimation(item) && !item.hasCustomIcon) {
    // Confirmed in components/inventoryitem.lua: `imagename` is a LISTENABLE
    // PROPERTY (3rd arg to this component's Class() definition), not a method
    // — assigning it triggers the internal onimagename listener, which calls
    // SetImage on the REPLICA (inventoryitem_replica.lua) automatically.
    // SetImage/SetAtlas only exist on that replica; calling them directly on
    // inst.components.inventoryitem (the server component) crashes with
    // "attempt to call method 'SetImage' (a nil value)" — reproduced in-game.
    // Without this property set at all, InventoryItem:GetImage() defaults to
    // `self.inst.prefab..".tex"` (the item's OWN id) — completely independent
    // of the recipe's own atlas/image config (itemRecipeIcon only affects the
    // crafting-menu icon) — reproduced in-game as the crafting menu showing
    // the reused build's icon fine, but the actual inventory slot / dropped-
    // on-ground sprite showing nothing (not even the name). Assigning
    // imagename here makes GetImage() return "<build>.tex" instead, and
    // GetAtlas()'s own fallback (GetInventoryItemAtlas(self:GetImage()))
    // then finds it in whichever shared sheet already has that real vanilla
    // build's icon — no atlas registration needed here, unlike hasCustomIcon.
    lines.push(`    inst.components.inventoryitem.imagename = ${luaString(resolveAnimationBuild(item))}`)
  }

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
  if (needsAimedSpell(item)) lines.push(...aimedSpellComponentBlock())
  // spellbook is deliberately NOT handled here — it's added in the SHARED
  // (client+server) section of generateItemPrefab via spellbookComponentLines,
  // not this server-only block. See that function's own comment: the real
  // waxwelljournal.lua adds AddComponent("spellbook") before SetPristine(),
  // and componentactions.lua reads inst.components.spellbook directly on the
  // client too ("--spellbook exists on clients too") — adding it here instead
  // left it nil client-side, crashing the moment the item's action list was
  // computed.
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
  if (item.hasCustomIcon) {
    // Confirmed against a real published mod (e00dan/naruto-dont-starve-
    // together's kunai.lua/bunshinjutsu.lua): a hand-built, standalone
    // images/inventoryimages/<id>.xml+.tex pair (no matching anim.zip to
    // derive one from) is declared as Asset("ATLAS", ...) + Asset("IMAGE", ...)
    // — NOT Asset("INV_IMAGE", id), which only works when a REAL anim.zip
    // bakes an "inventoryimage" build via Spriter for the engine to extract
    // from (confirmed still a real, extensively-used vanilla asset type —
    // e.g. abigail_flower_*'s own Asset("INV_IMAGE", ...) calls — just the
    // wrong one for a standalone xml/tex pair with no anim.zip behind it).
    lines.push(`    Asset("ATLAS", "images/inventoryimages/${item.id}.xml"),`)
    lines.push(`    Asset("IMAGE", "images/inventoryimages/${item.id}.tex"),`)
  } else if (!isVanillaAnimation(item)) {
    // A vanilla-sourced item has no anim/<id>.zip of its own to derive this
    // from — declaring it anyway doesn't crash, but it's a dead reference
    // (see itemRecipeIcon).
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
  // Confirmed in-game: SetProjectile only stores the projectile's PREFAB NAME
  // as a string (components/weapon.lua just does self.projectile = name) —
  // it never itself declares that name as a load dependency anywhere. Without
  // it in this item's own `prefabs` list (the array Prefab() uses to know
  // what else to preload alongside this entity), the generated
  // solarchakram_proj.lua file existed on disk but was never actually loaded,
  // reproduced in-game as "Can't find prefab solarchakram_proj" every time
  // something tried to reference it.
  const extraPrefabIds = [cloudPrefabId, item.weapon?.chainReturn !== undefined ? chakramProjectileId(item) : undefined].filter(
    (id): id is string => id !== undefined,
  )
  lines.push(extraPrefabIds.length > 0 ? `local prefabs = { ${extraPrefabIds.map(luaString).join(', ')} }` : 'local prefabs = {}')
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
  if (item.container?.source === 'own' && item.container.acceptsTag === 'spell') {
    // Plain per-entity netvar (unrelated to the container-open/opener/
    // classified system) — see the UpdateSpellContents comment in
    // componentBlock and linkedContainerSpellbookFunctionBlock for why this
    // is the only reliable way for another item's staff to read this
    // container's contents on the client without it being open.
    lines.push(`    inst.spell_contents = net_string(inst.GUID, "${item.id}.spell_contents", "spell_contentsdirty")`)
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
  lines.push(...spellbookComponentLines(item))
  if (needsAimedSpell(item)) {
    lines.push('')
    lines.push(...aimedSpellSharedLines())
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
