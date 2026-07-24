import { describe, it, expect } from 'vitest'
import { generateCharacterPrefab } from '../../generators/character'
import { generateSpeechFile } from '../../generators/speech'
import { sampleProject } from '../fixtures'

describe('generateCharacterPrefab', () => {
  const character = sampleProject.characters[0]
  const code = generateCharacterPrefab(character)

  it('uses MakePlayerCharacter with the character id', () => {
    expect(code).toContain('require("prefabs/player_common")')
    expect(code).toContain('return MakePlayerCharacter("testchar", prefabs, assets, common_postinit, master_postinit, start_inv)')
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
    expect(code).toContain('Asset("ANIM", "anim/testchar.zip")')
    expect(code).toContain('Asset("ANIM", "anim/ghost_testchar_build.zip")')
    expect(code).not.toContain('SetBuild(')
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
})

describe('generateSpeechFile', () => {
  const character = sampleProject.characters[0]
  const code = generateSpeechFile(character)

  it('falls back to speech_wilson via metatable instead of generating full speech', () => {
    expect(code).toContain('require("speech_wilson")')
    expect(code).toContain('setmetatable({}, { __index = wilson_speech })')
  })

  it('only overrides the keys the user customized', () => {
    expect(code).toContain('speech["ANNOUNCE_COLD"] = "It is cold, for science."')
  })
})
