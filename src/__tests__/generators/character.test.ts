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
