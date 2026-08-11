import { describe, it, expect } from 'vitest'
import { generateCharacterPrefab, generateCharacterFiles, characterPortraitAssets } from '../../generators/character'
import { generateSpeechFile } from '../../generators/speech'
import { sampleCharacter } from '../fixtures'

describe('generateCharacterPrefab', () => {
  const character = sampleCharacter
  const code = generateCharacterPrefab(character)

  it('uses MakePlayerCharacter with the character id', () => {
    expect(code).toContain('require("prefabs/player_common")')
    expect(code).toContain('return MakePlayerCharacter("testchar", prefabs, assets, common_postinit, master_postinit)')
  })

  // Confirmed in the real prefabs/player_common.lua: passing starting_inventory
  // as MakePlayerCharacter's 6th constructor arg is explicitly commented "now
  // deprecated -- set .starting_inventory property during master_postinit
  // instead" — this only still works via a `starting_inventory == nil` fallback
  // check, so setting it directly is the more reliable, current-recommended path.
  it('sets inst.starting_inventory directly in master_postinit instead of passing the deprecated 6th constructor arg', () => {
    expect(code).toContain('inst.starting_inventory = { "torch", "flint" }')
    expect(code).not.toContain('start_inv')
  })

  it('does not set inst.starting_inventory at all when startingInventory is empty', () => {
    const noItems = { ...character, startingInventory: [] }
    const noItemsCode = generateCharacterPrefab(noItems)
    expect(noItemsCode).not.toContain('starting_inventory')
  })

  it('sets health/hunger/sanity from TUNING', () => {
    expect(code).toContain('inst.components.health:SetMaxHealth(TUNING.TESTCHAR_HEALTH)')
    expect(code).toContain('inst.components.hunger:SetMax(TUNING.TESTCHAR_HUNGER)')
    expect(code).toContain('inst.components.sanity:SetMax(TUNING.TESTCHAR_SANITY)')
  })

  it('emits a snippet for every selected perk', () => {
    expect(code).toContain('inst:AddTag("freezeimmune")')
  })

  it('wires stat multipliers and food type affinity, sourced from dryad.lua (patterns.md#21)', () => {
    expect(code).toContain('inst.components.combat.damagemultiplier = 0.75')
    expect(code).toContain('inst.components.hunger.hungerrate = 0 * TUNING.WILSON_HUNGER_RATE')
    expect(code).toContain('inst.components.locomotor:SetExternalSpeedMultiplier(inst, "testchar_speed_mod", 1.25)')
    expect(code).toContain('inst.components.foodaffinity:AddFoodtypeAffinity(FOODTYPE.VEGGIE, 1.33)')
  })

  it('omits multiplier lines entirely when none are set', () => {
    const plain = { ...character, damageMultiplier: undefined, hungerRateMultiplier: undefined, walkSpeedMultiplier: undefined, foodTypeAffinities: [] }
    const plainCode = generateCharacterPrefab(plain)
    expect(plainCode).not.toContain('damagemultiplier')
    expect(plainCode).not.toContain('hungerrate')
    expect(plainCode).not.toContain('SetExternalSpeedMultiplier')
    expect(plainCode).not.toContain('foodaffinity')
  })

  it('defaults to a custom build named after its own id when no animation is chosen, with real ghost-build naming (global.lua)', () => {
    const custom = { ...character, animation: undefined }
    const customCode = generateCharacterPrefab(custom)
    expect(customCode).toContain('Asset("ANIM", "anim/testchar.zip")')
    expect(customCode).toContain('Asset("ANIM", "anim/ghost_testchar_build.zip")')
    expect(customCode).not.toContain('SetBuild(')
  })

  // Reproduced in-game: the file must sit at exactly the path Asset("ATLAS", ...)
  // declares (no "images/" prefix — bigportraits is its own top-level databundle,
  // unlike images.zip-backed inventoryimages/anim) or resolvefilepath crashes at
  // PrefabFiles load time with "Could not find an asset matching bigportraits/
  // <id>.xml", even though the file exists one folder over.
  it('writes the portrait alias file at the exact path the modmain Asset("ATLAS", ...) declaration expects', () => {
    const files = generateCharacterFiles(character, '')
    expect(files['bigportraits/testchar.xml']).toBeTruthy()
    expect(files['bigportraits/testchar.xml']).toContain('wilson.tex')
    expect(files['images/bigportraits/testchar.xml']).toBeUndefined()
  })

  // Reproduced in-game separately from the portrait crash: opening the
  // crafting menu's character filter tab looks up images/avatars/avatar_<id>.xml
  // at runtime (widgets/redux/bantab.lua's GetAvatarAtlas) — a different path
  // convention (has the "images/" prefix, unlike bigportraits) but the SAME
  // modmain-level Asset("ATLAS", ...) requirement (see characterPortraitAssets).
  it('writes an avatar alias file for a vanilla build with known avatar UV data, reusing the shared avatars.tex sheet', () => {
    const files = generateCharacterFiles(character, '')
    expect(files['images/avatars/avatar_testchar.xml']).toBeTruthy()
    expect(files['images/avatars/avatar_testchar.xml']).toContain('avatars.tex')
    expect(files['images/avatars/avatar_testchar.xml']).toContain('avatar_testchar.tex')
  })

  it('skips the avatar alias for a vanilla build with no known avatar UV data (not one of the curated base characters)', () => {
    const obscure = { ...character, animation: { source: 'vanilla' as const, build: 'pigman' } }
    const files = generateCharacterFiles(obscure, '')
    expect(files['images/avatars/avatar_testchar.xml']).toBeUndefined()
  })

  it('reuses a vanilla build without declaring an ANIM asset, overriding SetBuild after MakePlayerCharacter\'s own default', () => {
    const wendy = { ...character, animation: { source: 'vanilla' as const, build: 'wendy' } }
    const wendyCode = generateCharacterPrefab(wendy)
    expect(wendyCode).not.toContain('Asset("ANIM"')
    expect(wendyCode).toContain('inst.AnimState:SetBuild("wendy")')
  })

  // Confirmed against a real published character mod's own "fear" resource —
  // see characterManaSchema for the full source breakdown.
  it('wires the mana component with SetMax when mana is set, without a regen rate by default', () => {
    const mage = { ...character, mana: { max: 100 } }
    const manaCode = generateCharacterPrefab(mage)
    expect(manaCode).toContain('inst:AddComponent("mana")')
    expect(manaCode).toContain('inst.components.mana:SetMax(TUNING.TESTCHAR_MANA_MAX)')
    expect(manaCode).not.toContain('SetRegenRate')
  })

  it('wires SetRegenRate only when a regen rate is configured', () => {
    const mage = { ...character, mana: { max: 100, regenPerSecond: 2 } }
    const manaCode = generateCharacterPrefab(mage)
    expect(manaCode).toContain('inst.components.mana:SetRegenRate(TUNING.TESTCHAR_MANA_REGEN)')
  })

  it('does not add the mana component when mana is not set', () => {
    expect(code).not.toContain('mana')
  })

  it('wires a customdamagemultfn that checks the angle behind the target when backstab is set', () => {
    const rogue = { ...character, backstab: { multiplier: 3, arcDegrees: 90 } }
    const rogueCode = generateCharacterPrefab(rogue)
    expect(rogueCode).toContain('local function CustomCombatDamage(inst, target, weapon, multiplier, mount)')
    expect(rogueCode).toContain('local angletoattacker = target:GetAngleToPoint(inst.Transform:GetWorldPosition())')
    expect(rogueCode).toContain('local isbehind = DiffAngle(target.Transform:GetRotation(), angletoattacker) >= (180 - TUNING.TESTCHAR_BACKSTAB_ARC)')
    expect(rogueCode).toContain('if isbehind then')
    expect(rogueCode).toContain('return TUNING.TESTCHAR_BACKSTAB_MULT')
    expect(rogueCode).toContain('inst.components.combat.customdamagemultfn = CustomCombatDamage')
    expect(rogueCode).not.toContain('isdistracted')
  })

  it('also checks whether the target is distracted (fighting someone else) when bonusWhenTargetDistracted is set', () => {
    const rogue = { ...character, backstab: { multiplier: 3, arcDegrees: 90, bonusWhenTargetDistracted: true } }
    const rogueCode = generateCharacterPrefab(rogue)
    expect(rogueCode).toContain(
      'local isdistracted = target.components.combat ~= nil and target.components.combat:HasTarget() and target.components.combat.target ~= inst',
    )
    expect(rogueCode).toContain('if isbehind or isdistracted then')
  })

  it('does not wire a customdamagemultfn when backstab is not set', () => {
    expect(code).not.toContain('CustomCombatDamage')
    expect(code).not.toContain('customdamagemultfn')
  })

  it('wires shadow damage dealt/taken multipliers, keyed off the real shadowcreature tag', () => {
    const wanda = { ...character, shadowAffinity: { damageDealtMultiplier: 2, damageTakenMultiplier: 1.5 } }
    const wandaCode = generateCharacterPrefab(wanda)
    expect(wandaCode).toContain('local function CustomCombatDamage(inst, target, weapon, multiplier, mount)')
    expect(wandaCode).toContain('if target:HasTag("shadowcreature") then')
    expect(wandaCode).toContain('return 2')
    expect(wandaCode).toContain('inst.components.combat.customdamagemultfn = CustomCombatDamage')
    expect(wandaCode).toContain('local function ShadowDamageTakenMultiplier(inst, attacker, weapon)')
    expect(wandaCode).toContain('return (attacker ~= nil and attacker:HasTag("shadowcreature")) and 1.5 or 1')
    expect(wandaCode).toContain('inst.components.combat:AddConditionExternalDamageTakenMultiplier(ShadowDamageTakenMultiplier)')
  })

  it('combines backstab and shadow affinity into one customdamagemultfn instead of one overwriting the other', () => {
    const rogue = {
      ...character,
      backstab: { multiplier: 3, arcDegrees: 90 },
      shadowAffinity: { damageDealtMultiplier: 2, damageTakenMultiplier: 1.5 },
    }
    const rogueCode = generateCharacterPrefab(rogue)
    expect(rogueCode).toContain('local mult = 1')
    expect(rogueCode).toContain('mult = mult * TUNING.TESTCHAR_BACKSTAB_MULT')
    expect(rogueCode).toContain('mult = mult * 2')
    expect(rogueCode).toContain('return mult')
    expect((rogueCode.match(/local function CustomCombatDamage/g) ?? []).length).toBe(1)
  })

  it('recalculates max health/hunger/sanity by season, preserving current percent, and grants a summer speed bonus', () => {
    const sunwitch = { ...character, summerStatBonus: 75, summerWalkSpeedBonusPercent: 15, winterStatPenalty: 50 }
    const seasonCode = generateCharacterPrefab(sunwitch)
    expect(seasonCode).toContain('local function OnSeasonChange(inst, season)')
    expect(seasonCode).toContain('local statbonus = (season == "summer" and 75) or (season == "winter" and -50) or 0')
    expect(seasonCode).toContain('local healthpercent = inst.components.health:GetPercent()')
    expect(seasonCode).toContain('inst.components.health:SetMaxHealth(TUNING.TESTCHAR_HEALTH + statbonus)')
    expect(seasonCode).toContain('inst.components.health:SetPercent(healthpercent)')
    expect(seasonCode).toContain('inst.components.locomotor:SetExternalSpeedMultiplier(inst, "testchar_summer_speed", 1.15)')
    expect(seasonCode).toContain('inst.components.locomotor:RemoveExternalSpeedMultiplier(inst, "testchar_summer_speed")')
    expect(seasonCode).toContain('inst:WatchWorldState("season", OnSeasonChange)')
    expect(seasonCode).toContain('OnSeasonChange(inst, TheWorld.state.season)')
  })

  it('omits season behavior entirely when no seasonal field is set', () => {
    expect(code).not.toContain('OnSeasonChange')
    expect(code).not.toContain('WatchWorldState')
  })

  it('adds the real reader component when the can_read_books perk is set', () => {
    const scholar = { ...character, perks: ['can_read_books' as const] }
    const scholarCode = generateCharacterPrefab(scholar)
    expect(scholarCode).toContain('inst:AddComponent("reader")')
  })
})

// Confirmed against a real published character mod (e00dan/naruto-dont-
// starve-together's modmain.lua): bigportraits/avatars must be declared in
// modmain.lua's OWN top-level Assets table, not the prefab file — see
// generateModMain's use of this function and character.ts's own comment for
// the "Invalid resource handle... did you remember to load the asset?" crash
// this fixes.
describe('characterPortraitAssets', () => {
  const character = sampleCharacter

  it('declares only ATLAS (no IMAGE) for a vanilla-sourced character with no real portrait art', () => {
    const lines = characterPortraitAssets(character)
    expect(lines).toContain('Asset("ATLAS", "bigportraits/testchar.xml")')
    expect(lines.some((l) => l.includes('Asset("IMAGE", "bigportraits'))).toBe(false)
  })

  it('also declares IMAGE when hasCustomPortrait is set (a real <id>.tex was supplied)', () => {
    const withArt = { ...character, hasCustomPortrait: true }
    const lines = characterPortraitAssets(withArt)
    expect(lines).toContain('Asset("ATLAS", "bigportraits/testchar.xml")')
    expect(lines).toContain('Asset("IMAGE", "bigportraits/testchar.tex")')
  })

  it('declares the avatar ATLAS only when the reused build has known avatar UV data', () => {
    const known = characterPortraitAssets(character) // build: wilson
    expect(known).toContain('Asset("ATLAS", "images/avatars/avatar_testchar.xml")')

    const obscure = { ...character, animation: { source: 'vanilla' as const, build: 'pigman' } }
    const unknown = characterPortraitAssets(obscure)
    expect(unknown.some((l) => l.includes('avatars'))).toBe(false)
  })

  it('declares nothing at all for a custom-sourced character (no animation set)', () => {
    const custom = { ...character, animation: undefined }
    expect(characterPortraitAssets(custom)).toEqual([])
  })
})

describe('generateSpeechFile', () => {
  const character = sampleCharacter
  const code = generateSpeechFile(character)

  it('falls back to speech_wilson via metatable instead of generating full speech', () => {
    expect(code).toContain('require("speech_wilson")')
    expect(code).toContain('setmetatable({}, { __index = wilson_speech })')
  })

  it('only overrides the keys the user customized', () => {
    expect(code).toContain('speech["ANNOUNCE_COLD"] = "It is cold, for science."')
  })
})
