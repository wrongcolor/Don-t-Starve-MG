import { describe, it, expect } from 'vitest'
import { generateItemFiles, generateItemPrefab } from '../../generators/item'
import { sampleProject } from '../fixtures'

describe('generateItemFiles', () => {
  const [sword, structure, trinket] = sampleProject.items

  it('checks TheWorld.ismastersim right after SetPristine, before server components', () => {
    const code = generateItemPrefab(sword)
    const pristineIdx = code.indexOf('inst.entity:SetPristine()')
    const ismastersimIdx = code.indexOf('if not TheWorld.ismastersim then')
    const componentIdx = code.indexOf('inst:AddComponent("inventoryitem")')

    expect(pristineIdx).toBeGreaterThan(-1)
    expect(ismastersimIdx).toBeGreaterThan(pristineIdx)
    expect(componentIdx).toBeGreaterThan(ismastersimIdx)
  })

  it('only generates a placer prefab file when recipe.placer is true', () => {
    const swordFiles = generateItemFiles(sword)
    expect(Object.keys(swordFiles)).toEqual(['scripts/prefabs/testsword.lua'])

    const structureFiles = generateItemFiles(structure)
    expect(Object.keys(structureFiles).sort()).toEqual(
      ['scripts/prefabs/teststructure.lua', 'scripts/prefabs/teststructure_placer.lua'].sort(),
    )
  })

  it('wires weapon/finiteuses components to TUNING-driven values', () => {
    const code = generateItemPrefab(sword)
    expect(code).toContain('inst:AddComponent("weapon")')
    expect(code).toContain('inst.components.weapon:SetDamage(TUNING.TESTSWORD_DAMAGE)')
    expect(code).toContain('inst:AddComponent("finiteuses")')
  })

  it('defaults to a custom build named after the item id when no animation is chosen', () => {
    const code = generateItemPrefab(sword)
    expect(code).toContain('Asset("ANIM", "anim/testsword.zip")')
    expect(code).toContain('inst.AnimState:SetBank("testsword")')
    expect(code).toContain('inst.AnimState:SetBuild("testsword")')
  })

  it('reuses a vanilla build without declaring an ANIM asset when animation.source is vanilla', () => {
    const code = generateItemPrefab(trinket)
    expect(code).not.toContain('Asset("ANIM"')
    expect(code).toContain('inst.AnimState:SetBank("trinket_1")')
    expect(code).toContain('inst.AnimState:SetBuild("trinket_1")')
    expect(code).toContain('Asset("INV_IMAGE", "testtrinket")')
  })
})
