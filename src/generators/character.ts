import type { CharacterDef } from '../types/modProject'
import { luaString, luaStringArray, sanitizeLuaComment, toUpperSnake } from './luaUtils'
import { generateSkillTreeFile } from './skillTree'

// Custom keeps the character's own id as the build name — the same name
// MakePlayerCharacter's internal SetBuild(name) already defaults to, so no
// override is needed there, just the placeholder art the user must supply.
function resolveAnimationBuild(character: CharacterDef): string {
  return character.animation?.source === 'vanilla' ? character.animation.build : character.id
}

function isVanillaAnimation(character: CharacterDef): boolean {
  return character.animation?.source === 'vanilla'
}

// Best-effort perk snippets using real, documented component APIs. These are starting
// points — exact balance values are meant to be tweaked by the user, not final tuning.
function perkLines(character: CharacterDef): string[] {
  const lines: string[] = []
  for (const perk of character.perks) {
    switch (perk) {
      case 'no_sanity_drain':
        lines.push('    inst.components.sanity.dapperness = 0 -- ajuste conforme necessário')
        break
      case 'fire_immune':
        lines.push('    inst:AddTag("fireimmune")')
        break
      case 'freeze_immune':
        lines.push('    inst:AddTag("freezeimmune")')
        break
      case 'night_vision':
        lines.push('    if inst.components.playervision ~= nil then')
        lines.push('        inst.components.playervision:ToggleNightVision(true)')
        lines.push('    end')
        break
      case 'can_read_books':
        lines.push('    inst:AddComponent("reader")')
        break
    }
  }
  return lines
}

// Confirmed in dryad.lua's master_postinit (docs/dst-knowledge/patterns.md#21),
// with Dryad's own skill-tree conditionals stripped out — just the static
// multiplier value. "no_hunger" and "faster_walk" used to be fixed perks for
// two of these (hungerrate = 0, speed x1.25); a plain multiplier field covers
// both plus anything in between, so those perks were removed.
function statMultiplierLines(character: CharacterDef): string[] {
  const lines: string[] = []
  if (character.damageMultiplier !== undefined) {
    lines.push(`    inst.components.combat.damagemultiplier = ${character.damageMultiplier}`)
  }
  if (character.hungerRateMultiplier !== undefined) {
    lines.push(`    inst.components.hunger.hungerrate = ${character.hungerRateMultiplier} * TUNING.WILSON_HUNGER_RATE`)
  }
  if (character.walkSpeedMultiplier !== undefined) {
    lines.push(
      `    inst.components.locomotor:SetExternalSpeedMultiplier(inst, "${character.id}_speed_mod", ${character.walkSpeedMultiplier})`,
    )
  }
  for (const affinity of character.foodTypeAffinities) {
    lines.push(`    inst.components.foodaffinity:AddFoodtypeAffinity(FOODTYPE.${affinity.foodType}, ${affinity.multiplier})`)
  }
  return lines
}

function needsHungerPhaseListener(character: CharacterDef): boolean {
  return character.pauseHungerDuringDay === true || character.hungerNightMultiplier !== undefined
}

function dayNightBehaviorLines(character: CharacterDef): string[] {
  const lines: string[] = []
  if (character.sanityDayGain !== undefined) {
    lines.push('    inst.components.sanity.custom_rate_fn = CustomSanityRateFn')
  }
  if (character.sanityNightDrainMultiplier !== undefined) {
    lines.push(`    inst.components.sanity.night_drain_mult = ${character.sanityNightDrainMultiplier}`)
  }
  if (needsHungerPhaseListener(character)) {
    lines.push('    inst:ListenForEvent("phasechanged", function(src, phase) OnPhaseChanged(inst, phase) end, TheWorld)')
    lines.push('    OnPhaseChanged(inst, TheWorld.state.phase)')
  }
  if (character.wetnessSanityPenalty !== undefined) {
    lines.push('    inst:ListenForEvent("moisturedelta", OnMoistureDelta)')
  }
  return lines
}

function sanityDayGainFunctionBlock(character: CharacterDef): string[] {
  return [
    'local function CustomSanityRateFn(inst)',
    `    return TheWorld.state.isday and ${character.sanityDayGain} or 0`,
    'end',
    '',
  ]
}

function hungerPhaseFunctionBlock(character: CharacterDef): string[] {
  const lines = ['local function OnPhaseChanged(inst, phase)']
  if (character.pauseHungerDuringDay) {
    lines.push('    if phase == "day" then')
    lines.push('        inst.components.hunger:Pause()')
    lines.push('        return')
    lines.push('    end')
    lines.push('    inst.components.hunger:Resume()')
  }
  if (character.hungerNightMultiplier !== undefined) {
    lines.push(
      `    inst.components.hunger:SetRate(phase == "night" and ${character.hungerNightMultiplier} * TUNING.WILSON_HUNGER_RATE or TUNING.WILSON_HUNGER_RATE)`,
    )
  }
  lines.push('end', '')
  return lines
}

function wetnessDislikeFunctionBlock(character: CharacterDef): string[] {
  return [
    'local function OnMoistureDelta(inst)',
    '    local percent = inst.components.moisture:GetMoisturePercent()',
    '    if percent > 0 then',
    `        inst.components.sanity.externalmodifiers:SetModifier(inst, -${character.wetnessSanityPenalty} * percent, "hates_wet")`,
    '    else',
    '        inst.components.sanity.externalmodifiers:RemoveModifier(inst, "hates_wet")',
    '    end',
    'end',
    '',
  ]
}

function overheatFunctionBlock(character: CharacterDef): string[] {
  const overheat = character.overheat!
  const upper = toUpperSnake(character.id)
  const hasMana = character.mana !== undefined
  const speedKey = `${character.id}_overheat_speed`
  const lines = [
    'local function OverheatIgniteTick(inst)',
    '    local x, y, z = inst.Transform:GetWorldPosition()',
    '    local ents = TheSim:FindEntities(x, y, z, 3, nil, { "INLIMBO", "player" })',
    '    for _, v in ipairs(ents) do',
    `        if v ~= inst and v.components.burnable ~= nil and math.random() < ${overheat.igniteChance} then`,
    '            v.components.burnable:StartWildfire()',
    '        end',
    '    end',
    'end',
    '',
  ]
  if (overheat.crash !== undefined) {
    lines.push(
      'local function OverheatCrash(inst)',
      '    inst._overheatcrashtask = nil',
      `    inst.components.temperature:SetTemperature(${overheat.crash.forceTemp})`,
      '    if inst.components.health ~= nil then',
      `        inst.components.health:DoDelta(-inst.components.health:GetMaxWithPenalty() * ${overheat.crash.statDamagePercent}, true, "overheat_crash")`,
      '    end',
      '    if inst.components.hunger ~= nil then',
      `        inst.components.hunger:DoDelta(-inst.components.hunger.max * ${overheat.crash.statDamagePercent})`,
      '    end',
      '    if inst.components.sanity ~= nil then',
      `        inst.components.sanity:DoDelta(-inst.components.sanity.max * ${overheat.crash.statDamagePercent})`,
      '    end',
      'end',
      '',
    )
  }
  lines.push('local function SetOverheatActive(inst, active)', '    inst._customoverheat = active or nil', '    if active then')
  lines.push(
    `        inst.components.combat.externaldamagemultipliers:SetModifier(inst, ${overheat.damageMultiplier}, "overheat")`,
    `        inst.components.sanity.externalmodifiers:SetModifier(inst, -${overheat.sanityDrainPerSecond}, "overheat")`,
    `        inst.components.heater.heat = ${overheat.triggerTemp}`,
    '        inst.Light:SetRadius(.6)',
    '        inst.Light:SetFalloff(.8)',
    '        inst.Light:SetIntensity(.8)',
    '        inst.Light:SetColour(255 / 255, 140 / 255, 20 / 255)',
    '        inst.Light:Enable(true)',
    '        if inst._overheatignitetask == nil then',
    '            inst._overheatignitetask = inst:DoPeriodicTask(2, OverheatIgniteTick, nil, inst)',
    '        end',
  )
  if (overheat.speedBonusPercent !== undefined) {
    lines.push(
      `        inst.components.locomotor:SetExternalSpeedMultiplier(inst, "${speedKey}", ${1 + overheat.speedBonusPercent / 100})`,
    )
  }
  if (hasMana && overheat.manaRegenBonus !== undefined) {
    lines.push(`        inst.components.mana:SetRegenRate(TUNING.${upper}_MANA_REGEN + ${overheat.manaRegenBonus})`)
  }
  if (hasMana && overheat.manaMaxMultiplier !== undefined) {
    lines.push(`        inst.components.mana:SetMaxOverride(TUNING.${upper}_MANA_MAX * ${overheat.manaMaxMultiplier})`)
  }
  if (overheat.crash !== undefined) {
    lines.push(
      '        if inst._overheatcrashtask == nil then',
      `            inst._overheatcrashtask = inst:DoTaskInTime(${overheat.crash.afterSeconds}, OverheatCrash)`,
      '        end',
    )
  }
  lines.push('    else')
  lines.push(
    '        inst.components.combat.externaldamagemultipliers:RemoveModifier(inst, "overheat")',
    '        inst.components.sanity.externalmodifiers:RemoveModifier(inst, "overheat")',
    '        inst.components.heater.heat = nil',
    '        inst.Light:Enable(false)',
    '        if inst._overheatignitetask ~= nil then',
    '            inst._overheatignitetask:Cancel()',
    '            inst._overheatignitetask = nil',
    '        end',
  )
  if (overheat.speedBonusPercent !== undefined) {
    lines.push(`        inst.components.locomotor:RemoveExternalSpeedMultiplier(inst, "${speedKey}")`)
  }
  if (hasMana && overheat.manaRegenBonus !== undefined) {
    lines.push(`        inst.components.mana:SetRegenRate(TUNING.${upper}_MANA_REGEN)`)
  }
  if (hasMana && overheat.manaMaxMultiplier !== undefined) {
    lines.push('        inst.components.mana:ClearMaxOverride()')
  }
  if (overheat.crash !== undefined) {
    lines.push(
      '        if inst._overheatcrashtask ~= nil then',
      '            inst._overheatcrashtask:Cancel()',
      '            inst._overheatcrashtask = nil',
      '        end',
    )
  }
  lines.push('    end', 'end', '')
  lines.push(
    'local function OnOverheatTemperatureDelta(inst, data)',
    `    SetOverheatActive(inst, data.new > ${overheat.triggerTemp})`,
    'end',
    '',
  )
  return lines
}

function overheatSetupLines(character: CharacterDef): string[] {
  if (character.overheat === undefined) {
    return []
  }
  return [
    '    inst:AddComponent("heater")',
    '    inst:ListenForEvent("temperaturedelta", OnOverheatTemperatureDelta)',
    `    SetOverheatActive(inst, inst.components.temperature:GetCurrent() > ${character.overheat.triggerTemp})`,
  ]
}

function backstabFunctionBlock(character: CharacterDef): string[] {
  const upper = toUpperSnake(character.id)
  const backstab = character.backstab!
  const lines = [
    'local function CustomCombatDamage(inst, target, weapon, multiplier, mount)',
    '    local angletoattacker = target:GetAngleToPoint(inst.Transform:GetWorldPosition())',
    `    local isbehind = DiffAngle(target.Transform:GetRotation(), angletoattacker) >= (180 - TUNING.${upper}_BACKSTAB_ARC)`,
  ]
  if (backstab.bonusWhenTargetDistracted) {
    lines.push(
      '    local isdistracted = target.components.combat ~= nil and target.components.combat:HasTarget() and target.components.combat.target ~= inst',
      '    if isbehind or isdistracted then',
    )
  } else {
    lines.push('    if isbehind then')
  }
  lines.push(`        return TUNING.${upper}_BACKSTAB_MULT`, '    end', 'end', '')
  return lines
}

function shadowDamageDealtFunctionBlock(character: CharacterDef): string[] {
  return [
    'local function CustomCombatDamage(inst, target, weapon, multiplier, mount)',
    '    if target:HasTag("shadowcreature") then',
    `        return ${character.shadowAffinity!.damageDealtMultiplier}`,
    '    end',
    'end',
    '',
  ]
}

function backstabAndShadowDamageDealtFunctionBlock(character: CharacterDef): string[] {
  const upper = toUpperSnake(character.id)
  const backstab = character.backstab!
  const lines = [
    'local function CustomCombatDamage(inst, target, weapon, multiplier, mount)',
    '    local mult = 1',
    '    local angletoattacker = target:GetAngleToPoint(inst.Transform:GetWorldPosition())',
    `    local isbehind = DiffAngle(target.Transform:GetRotation(), angletoattacker) >= (180 - TUNING.${upper}_BACKSTAB_ARC)`,
  ]
  if (backstab.bonusWhenTargetDistracted) {
    lines.push(
      '    local isdistracted = target.components.combat ~= nil and target.components.combat:HasTarget() and target.components.combat.target ~= inst',
      '    if isbehind or isdistracted then',
    )
  } else {
    lines.push('    if isbehind then')
  }
  lines.push(`        mult = mult * TUNING.${upper}_BACKSTAB_MULT`, '    end')
  lines.push('    if target:HasTag("shadowcreature") then')
  lines.push(`        mult = mult * ${character.shadowAffinity!.damageDealtMultiplier}`)
  lines.push('    end')
  lines.push('    return mult', 'end', '')
  return lines
}

function needsCustomCombatDamage(character: CharacterDef): boolean {
  return character.backstab !== undefined || character.shadowAffinity !== undefined
}

function customCombatDamageFunctionBlock(character: CharacterDef): string[] {
  if (character.backstab !== undefined && character.shadowAffinity !== undefined) {
    return backstabAndShadowDamageDealtFunctionBlock(character)
  }
  if (character.backstab !== undefined) {
    return backstabFunctionBlock(character)
  }
  return shadowDamageDealtFunctionBlock(character)
}

function shadowDamageTakenFunctionBlock(character: CharacterDef): string[] {
  return [
    'local function ShadowDamageTakenMultiplier(inst, attacker, weapon)',
    `    return (attacker ~= nil and attacker:HasTag("shadowcreature")) and ${character.shadowAffinity!.damageTakenMultiplier} or 1`,
    'end',
    '',
  ]
}

function needsSeasonBehavior(character: CharacterDef): boolean {
  return (
    character.summerStatBonus !== undefined ||
    character.summerWalkSpeedBonusPercent !== undefined ||
    character.winterStatPenalty !== undefined
  )
}

function seasonFunctionBlock(character: CharacterDef): string[] {
  const upper = toUpperSnake(character.id)
  const summerBonus = character.summerStatBonus ?? 0
  const winterPenalty = character.winterStatPenalty ?? 0
  const lines = [
    'local function OnSeasonChange(inst, season)',
    `    local statbonus = (season == "summer" and ${summerBonus}) or (season == "winter" and -${winterPenalty}) or 0`,
    '',
    '    local healthpercent = inst.components.health:GetPercent()',
    `    inst.components.health:SetMaxHealth(TUNING.${upper}_HEALTH + statbonus)`,
    '    inst.components.health:SetPercent(healthpercent)',
    '',
    '    local hungerpercent = inst.components.hunger:GetPercent()',
    `    inst.components.hunger:SetMax(TUNING.${upper}_HUNGER + statbonus)`,
    '    inst.components.hunger:SetPercent(hungerpercent)',
    '',
    '    local sanitypercent = inst.components.sanity:GetPercent()',
    `    inst.components.sanity:SetMax(TUNING.${upper}_SANITY + statbonus)`,
    '    inst.components.sanity:SetPercent(sanitypercent)',
  ]
  if (character.summerWalkSpeedBonusPercent !== undefined) {
    lines.push(
      '',
      '    if season == "summer" then',
      `        inst.components.locomotor:SetExternalSpeedMultiplier(inst, "${character.id}_summer_speed", ${1 + character.summerWalkSpeedBonusPercent / 100})`,
      '    else',
      `        inst.components.locomotor:RemoveExternalSpeedMultiplier(inst, "${character.id}_summer_speed")`,
      '    end',
    )
  }
  lines.push('end', '')
  return lines
}

function seasonSetupLines(character: CharacterDef): string[] {
  if (!needsSeasonBehavior(character)) {
    return []
  }
  return ['    inst:WatchWorldState("season", OnSeasonChange)', '    OnSeasonChange(inst, TheWorld.state.season)']
}

// Reproduced in-game: the character-select screen hard-crashes
// ("Could not find an asset matching bigportraits/<id>.xml") for ANY new
// character id — characterutil.lua's SetOvalPortraitTexture always looks up
// "bigportraits/"..character..".xml" by prefab id, with no fallback the way
// GetInventoryItemAtlas covers item icons (patterns.md has no prior research
// on this — it was never handled at all before). For a vanilla-sourced
// character we CAN cover it without needing real art: every base-game
// character's own plain bigportraits/<id>.xml (extracted from the real
// bigportraits.zip: wilson.xml, wendy.xml, wolfgang.xml, ...) is the exact
// same 1-element atlas pointing at that character's own already-loaded
// "<id>.tex" — same texture, same fixed UV rect, only the element name
// varies. Re-declaring that Texture under our OWN character's element name
// aliases the already-loaded vanilla portrait without shipping any new
// pixel data. A 'custom' character has no vanilla texture to alias, so it's
// still left as a documented real-art requirement (see README).
function generatePortraitAlias(character: CharacterDef, build: string): string {
  return `<Atlas><Texture filename="${build}.tex" /><Elements><Element name="${character.id}.tex" u1="0.0" u2="0.546875" v1="0.296875" v2="1.0" /></Elements></Atlas>\n`
}

// Reproduced in-game: opening the crafting menu's character filter tab hard-
// crashes ("Could not find an asset matching images/avatars/avatar_<id>.xml")
// for ANY new character id — widgets/redux/bantab.lua's GetAvatarAtlas looks
// up MOD_AVATAR_LOCATIONS[character] (falling back to MOD_AVATAR_LOCATIONS
// ["Default"], confirmed = "images/avatars/" from the crash path itself) and
// expects a real file there; unlike the recipe-icon case there's no
// GetInventoryItemAtlas-style runtime fallback. Every base character's own
// avatar is one element inside ONE shared, already-loaded atlas
// (images/avatars.xml / avatars.tex) at a fixed per-character UV rect
// (extracted directly from that real file) — aliasing our own character's
// element name onto the SAME shared texture at the SAME rect reuses the
// reused build's existing avatar with no new pixel data, the same trick as
// generatePortraitAlias but against a shared sheet instead of a per-character
// texture, hence the explicit per-id UV table below.
const VANILLA_CHARACTER_AVATAR_UV: Record<string, { u1: number; u2: number; v1: number; v2: number }> = {
  wilson: { u1: 0.00048828125, u2: 0.09326171875, v1: 0.43798828125, v2: 0.53076171875 },
  willow: { u1: 0.84423828125, u2: 0.93701171875, v1: 0.53173828125, v2: 0.62451171875 },
  wolfgang: { u1: 0.18798828125, u2: 0.28076171875, v1: 0.43798828125, v2: 0.53076171875 },
  wendy: { u1: 0.56298828125, u2: 0.65576171875, v1: 0.53173828125, v2: 0.62451171875 },
  wx78: { u1: 0.37548828125, u2: 0.46826171875, v1: 0.34423828125, v2: 0.43701171875 },
  wickerbottom: { u1: 0.75048828125, u2: 0.84326171875, v1: 0.53173828125, v2: 0.62451171875 },
  woodie: { u1: 0.37548828125, u2: 0.46826171875, v1: 0.43798828125, v2: 0.53076171875 },
  wes: { u1: 0.65673828125, u2: 0.74951171875, v1: 0.53173828125, v2: 0.62451171875 },
  waxwell: { u1: 0.37548828125, u2: 0.46826171875, v1: 0.53173828125, v2: 0.62451171875 },
  wathgrithr: { u1: 0.28173828125, u2: 0.37451171875, v1: 0.53173828125, v2: 0.62451171875 },
  webber: { u1: 0.46923828125, u2: 0.56201171875, v1: 0.53173828125, v2: 0.62451171875 },
  winona: { u1: 0.09423828125, u2: 0.18701171875, v1: 0.43798828125, v2: 0.53076171875 },
  warly: { u1: 0.18798828125, u2: 0.28076171875, v1: 0.53173828125, v2: 0.62451171875 },
  wortox: { u1: 0.18798828125, u2: 0.28076171875, v1: 0.34423828125, v2: 0.43701171875 },
  wormwood: { u1: 0.75048828125, u2: 0.84326171875, v1: 0.43798828125, v2: 0.53076171875 },
  wurt: { u1: 0.28173828125, u2: 0.37451171875, v1: 0.34423828125, v2: 0.43701171875 },
  walter: { u1: 0.00048828125, u2: 0.09326171875, v1: 0.53173828125, v2: 0.62451171875 },
  wanda: { u1: 0.09423828125, u2: 0.18701171875, v1: 0.53173828125, v2: 0.62451171875 },
}

function generateAvatarAlias(character: CharacterDef, build: string): string | undefined {
  const uv = VANILLA_CHARACTER_AVATAR_UV[build]
  if (!uv) return undefined
  return `<Atlas><Texture filename="avatars.tex" /><Elements><Element name="avatar_${character.id}.tex" u1="${uv.u1}" u2="${uv.u2}" v1="${uv.v1}" v2="${uv.v2}" /></Elements></Atlas>\n`
}

// Confirmed against a real published character mod (e00dan/naruto-dont-
// starve-together's modmain.lua): bigportraits/avatars are declared in
// modmain.lua's own top-level `Assets` table (see generateModMain), NOT
// inside the character's own prefab file — the character-select screen reads
// them before ever spawning the prefab, so a per-prefab Asset() declaration
// loads too late ("Invalid resource handle for atlas... did you remember to
// load the asset?"). ATLAS is always declared for a vanilla-sourced character
// (the alias .xml always exists); IMAGE (the real .tex) only when
// hasCustomPortrait says one was actually supplied — the auto-generated alias
// case has no real <id>.tex of its own, only a reference to the reused
// build's already-loaded texture.
export function characterPortraitAssets(character: CharacterDef): string[] {
  const lines: string[] = []
  if (!isVanillaAnimation(character)) return lines

  lines.push(`Asset("ATLAS", "bigportraits/${character.id}.xml")`)
  if (character.hasCustomPortrait) {
    lines.push(`Asset("IMAGE", "bigportraits/${character.id}.tex")`)
  }
  if (VANILLA_CHARACTER_AVATAR_UV[resolveAnimationBuild(character)]) {
    lines.push(`Asset("ATLAS", "images/avatars/avatar_${character.id}.xml")`)
  }
  return lines
}

// Assets: when the character reuses a vanilla build (animation.source ===
// 'vanilla'), no Asset("ANIM", ...) is declared at all — that build is already
// preloaded globally by the base game (global.lua's own Asset("PKGREF",
// "anim/<id>.zip") list). Otherwise this is a PLACEHOLDER: the user must
// supply anim/<id>.zip (and a matching ghost build) themselves — see README.
export function generateCharacterPrefab(character: CharacterDef): string {
  const upper = toUpperSnake(character.id)
  const build = resolveAnimationBuild(character)
  const lines: string[] = []

  lines.push('local MakePlayerCharacter = require("prefabs/player_common")')
  lines.push('')
  lines.push('local assets =')
  lines.push('{')
  if (isVanillaAnimation(character)) {
    lines.push(`    -- Build "${sanitizeLuaComment(build)}" reaproveitado do jogo base, sem asset próprio necessário.`)
  } else {
    lines.push(`    Asset("ANIM", "anim/${character.id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
    lines.push(`    Asset("ANIM", "anim/ghost_${character.id}_build.zip"), -- PLACEHOLDER: build do fantasma`)
    lines.push(`    Asset("IMAGE", "bigportraits/${character.id}.xml"), -- PLACEHOLDER: retrato real, ver README (também precisa estar em modmain.lua, ver characterPortraitAssets)`)
  }
  lines.push('}')
  lines.push('')
  lines.push('local prefabs = {}')
  lines.push('')
  if (needsCustomCombatDamage(character)) {
    lines.push(...customCombatDamageFunctionBlock(character))
  }
  if (character.shadowAffinity !== undefined) {
    lines.push(...shadowDamageTakenFunctionBlock(character))
  }
  if (needsSeasonBehavior(character)) {
    lines.push(...seasonFunctionBlock(character))
  }
  if (character.sanityDayGain !== undefined) {
    lines.push(...sanityDayGainFunctionBlock(character))
  }
  if (needsHungerPhaseListener(character)) {
    lines.push(...hungerPhaseFunctionBlock(character))
  }
  if (character.wetnessSanityPenalty !== undefined) {
    lines.push(...wetnessDislikeFunctionBlock(character))
  }
  if (character.overheat !== undefined) {
    lines.push(...overheatFunctionBlock(character))
  }
  lines.push('local function common_postinit(inst)')
  lines.push(`    inst.MiniMapEntity:SetIcon("${character.id}.tex") -- PLACEHOLDER: ícone do minimapa`)
  if (isVanillaAnimation(character)) {
    lines.push(`    inst.AnimState:SetBuild(${luaString(build)}) -- reaproveita o visual de "${sanitizeLuaComment(build)}" em vez do build próprio`)
  }
  lines.push('end')
  lines.push('')
  lines.push('local function master_postinit(inst)')
  // Confirmed in the real prefabs/player_common.lua: passing starting_inventory
  // as MakePlayerCharacter's 6th constructor argument is explicitly commented
  // "now deprecated -- set .starting_inventory property during master_postinit
  // instead" — done here instead of via that parameter.
  if (character.startingInventory.length > 0) {
    lines.push(`    inst.starting_inventory = ${luaStringArray(character.startingInventory)}`)
    lines.push('')
  }
  lines.push(`    inst.components.health:SetMaxHealth(TUNING.${upper}_HEALTH)`)
  lines.push(`    inst.components.hunger:SetMax(TUNING.${upper}_HUNGER)`)
  lines.push(`    inst.components.sanity:SetMax(TUNING.${upper}_SANITY)`)
  const perks = perkLines(character)
  if (perks.length > 0) {
    lines.push('')
    lines.push(...perks)
  }
  const multipliers = statMultiplierLines(character)
  if (multipliers.length > 0) {
    lines.push('')
    lines.push(...multipliers)
  }
  const dayNightBehavior = dayNightBehaviorLines(character)
  if (dayNightBehavior.length > 0) {
    lines.push('')
    lines.push(...dayNightBehavior)
  }
  if (character.mana !== undefined) {
    lines.push('')
    lines.push('    inst:AddComponent("mana")')
    lines.push(`    inst.components.mana:SetMax(TUNING.${upper}_MANA_MAX)`)
    if (character.mana.regenPerSecond !== undefined) {
      lines.push(`    inst.components.mana:SetRegenRate(TUNING.${upper}_MANA_REGEN)`)
    }
  }
  const overheatSetup = overheatSetupLines(character)
  if (overheatSetup.length > 0) {
    lines.push('')
    lines.push(...overheatSetup)
  }
  const seasonSetup = seasonSetupLines(character)
  if (seasonSetup.length > 0) {
    lines.push('')
    lines.push(...seasonSetup)
  }
  if (needsCustomCombatDamage(character)) {
    lines.push('')
    lines.push('    inst.components.combat.customdamagemultfn = CustomCombatDamage')
  }
  if (character.shadowAffinity !== undefined) {
    lines.push('    inst.components.combat:AddConditionExternalDamageTakenMultiplier(ShadowDamageTakenMultiplier)')
  }
  lines.push('end')
  lines.push('')
  lines.push(
    `return MakePlayerCharacter("${character.id}", prefabs, assets, common_postinit, master_postinit)`,
  )

  return lines.join('\n') + '\n'
}

export function generateCharacterFiles(
  character: CharacterDef,
  speechFile: string,
): Record<string, string> {
  const files: Record<string, string> = {
    [`scripts/prefabs/${character.id}.lua`]: generateCharacterPrefab(character),
    [`scripts/speech_${character.id}.lua`]: speechFile,
  }
  if (character.skillTree) {
    files[`scripts/prefabs/skilltree_${character.id}.lua`] = generateSkillTreeFile(character)
  }
  // Path confirmed in-game: must match the Asset("IMAGE", "bigportraits/<id>.xml")
  // declaration exactly — no "images/" prefix. Unlike inventoryimages/anim (which
  // live inside images.zip, hence the "images/" prefix), the base game's own
  // portraits are their own separate top-level databundle (bigportraits.zip,
  // unpacked as bigportraits/<id>.xml directly) — a mod's own copy has to mirror
  // that same root-level layout, not the images/ one.
  if (isVanillaAnimation(character)) {
    const build = resolveAnimationBuild(character)
    files[`bigportraits/${character.id}.xml`] = generatePortraitAlias(character, build)
    // Path confirmed in-game (MOD_AVATAR_LOCATIONS["Default"], widgets/redux/
    // bantab.lua) — a plain runtime resolvefilepath lookup, not a preloaded
    // Asset(), so no Asset() declaration is needed for this one.
    const avatarAlias = generateAvatarAlias(character, build)
    if (avatarAlias) {
      files[`images/avatars/avatar_${character.id}.xml`] = avatarAlias
    }
  }
  return files
}
