import { describe, it, expect } from 'vitest'
import { parseModFiles } from '../../parsers/modReader'
import { buildModFiles } from '../../generators/zipBuilder'
import { sampleProject } from '../fixtures'

describe('parseModFiles (dogfooding our own generator output)', () => {
  const files = buildModFiles(sampleProject)
  const summary = parseModFiles(files)

  it('extracts modinfo.lua metadata', () => {
    expect(summary.meta.name).toBe('Test Mod')
    expect(summary.meta.author).toBe('Tester')
    expect(summary.meta.api_version).toBe(10)
    expect(summary.meta.dst_compatible).toBe(true)
  })

  it('extracts PrefabFiles', () => {
    expect(summary.prefabFiles).toEqual(
      expect.arrayContaining(['testsword', 'teststructure', 'teststructure_placer', 'testchar', 'testmob']),
    )
  })

  it('extracts recipes with ingredients, tech and filters', () => {
    const sword = summary.recipes.find((r) => r.name === 'testsword')
    expect(sword).toBeTruthy()
    expect(sword?.ingredients).toEqual([
      { prefab: 'twigs', amount: 2 },
      { prefab: 'flint', amount: 1 },
    ])
    expect(sword?.tech).toBe('SCIENCE_ONE')
    expect(sword?.filters).toEqual(['WEAPONS'])

    const structure = summary.recipes.find((r) => r.name === 'teststructure')
    expect(structure?.placer).toBe('teststructure_placer')
  })

  it('extracts registered characters with gender', () => {
    expect(summary.characters).toEqual([{ id: 'testchar', gender: 'NEUTRAL' }])
  })

  it('extracts STRINGS.NAMES and TUNING values', () => {
    expect(summary.names.TESTSWORD).toBe('Test Sword')
    expect(summary.tuning.TESTSWORD_DAMAGE).toBe(34)
    expect(summary.tuning.TESTCHAR_HEALTH).toBe(150)
  })

  it('reports no file errors for well-formed generated Lua', () => {
    expect(summary.fileErrors).toEqual([])
    expect(summary.filesParsed).toBeGreaterThan(0)
  })
})

describe('parseModFiles (hand-written community-style mod)', () => {
  // Loosely mimics common real-world style: locals aliasing GLOBAL tables, recipe
  // wrapped with extra whitespace/comments, filters/config omitted for one recipe.
  const modmain = `
    local require = GLOBAL.require
    local STRINGS = GLOBAL.STRINGS
    local TUNING = GLOBAL.TUNING

    PrefabFiles =
    {
        "cool_axe",
    }

    STRINGS.NAMES.COOL_AXE = "Cool Axe"
    TUNING.COOL_AXE_DAMAGE = 40

    -- a comment describing the recipe
    AddRecipe2("cool_axe", {Ingredient("twigs", 1), Ingredient("goldnugget", 1)}, TECH.SCIENCE_TWO, {
        atlas = "images/inventoryimages/cool_axe.xml",
        image = "cool_axe.tex",
    }, {"TOOLS", "WEAPONS"})

    AddModCharacter("coolguy", "MALE")
  `

  const summary = parseModFiles({ 'modmain.lua': modmain })

  it('extracts recipe, character and tuning from an unfamiliar file layout', () => {
    expect(summary.prefabFiles).toEqual(['cool_axe'])
    expect(summary.recipes).toHaveLength(1)
    expect(summary.recipes[0]).toMatchObject({
      name: 'cool_axe',
      tech: 'SCIENCE_TWO',
      filters: ['TOOLS', 'WEAPONS'],
    })
    expect(summary.characters).toEqual([{ id: 'coolguy', gender: 'MALE' }])
    expect(summary.tuning.COOL_AXE_DAMAGE).toBe(40)
    expect(summary.names.COOL_AXE).toBe('Cool Axe')
  })
})

describe('parseModFiles error handling', () => {
  it('records a parse error per malformed file without throwing', () => {
    const summary = parseModFiles({ 'broken.lua': 'this is not ((valid lua' })
    expect(summary.fileErrors).toHaveLength(1)
    expect(summary.fileErrors[0].path).toBe('broken.lua')
    expect(summary.filesParsed).toBe(0)
  })

  it('ignores non-.lua files', () => {
    const summary = parseModFiles({ 'README.md': '# hello', 'modinfo.lua': 'name = "X"' })
    expect(summary.meta.name).toBe('X')
    expect(summary.filesParsed).toBe(1)
  })
})
