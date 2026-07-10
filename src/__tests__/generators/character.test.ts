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
    expect(code).toContain('inst.components.hunger.hungerrate = 0')
    expect(code).toContain('SetExternalSpeedMultiplier(inst, "testchar_speed_perk", 1.25)')
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
