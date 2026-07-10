import { describe, it, expect } from 'vitest'
import { generateModMain } from '../../generators/modmain'
import { sampleProject } from '../fixtures'

describe('generateModMain', () => {
  const code = generateModMain(sampleProject)

  it('lists every prefab (including the placer) in PrefabFiles', () => {
    expect(code).toContain('PrefabFiles =')
    expect(code).toContain('"testsword"')
    expect(code).toContain('"teststructure"')
    expect(code).toContain('"teststructure_placer"')
    expect(code).toContain('"testchar"')
    expect(code).toContain('"testmob"')
  })

  it('uses AddRecipe2, not the deprecated AddRecipe', () => {
    expect(code).toContain('AddRecipe2(')
    expect(code).not.toContain('AddRecipe(')
  })

  it('passes recipe filters as a string array, not RECIPETABS', () => {
    expect(code).toContain('{ "WEAPONS" }')
    expect(code).not.toContain('RECIPETABS')
  })

  it('registers the placer prefab name in the recipe config for structures', () => {
    expect(code).toContain('placer = "teststructure_placer"')
  })

  it('registers every character with AddModCharacter and its gender', () => {
    expect(code).toContain('AddModCharacter("testchar", "NEUTRAL")')
  })

  it('wires up character strings and speech require', () => {
    expect(code).toContain('STRINGS.CHARACTER_TITLES.testchar = "the tester"')
    expect(code).toContain('STRINGS.CHARACTERS.TESTCHAR = require("speech_testchar")')
  })

  it('sets TUNING values for items, characters and creatures', () => {
    expect(code).toContain('GLOBAL.TUNING.TESTSWORD_DAMAGE = 34')
    expect(code).toContain('GLOBAL.TUNING.TESTCHAR_HEALTH = 150')
    expect(code).toContain('GLOBAL.TUNING.TESTMOB_HEALTH = 100')
  })
})
