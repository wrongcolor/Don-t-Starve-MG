import { describe, it, expect } from 'vitest'
import { generateCreatureFiles, generateCreaturePrefab } from '../../generators/creature'
import { sampleProject } from '../fixtures'

describe('generateCreatureFiles', () => {
  const creature = sampleProject.creatures[0]

  it('produces prefab, stategraph and brain files with matching require paths', () => {
    const files = generateCreatureFiles(creature)
    expect(Object.keys(files).sort()).toEqual(
      ['scripts/prefabs/testmob.lua', 'scripts/stategraphs/SGtestmob.lua', 'scripts/brains/testmobbrain.lua'].sort(),
    )
    const prefab = files['scripts/prefabs/testmob.lua']
    expect(prefab).toContain('inst:SetStateGraph("SGtestmob")')
    expect(prefab).toContain('inst:SetBrain(require("brains/testmobbrain"))')
  })

  it('checks TheWorld.ismastersim before adding server components', () => {
    const code = generateCreaturePrefab(creature)
    const ismastersimIdx = code.indexOf('if not TheWorld.ismastersim then')
    const healthIdx = code.indexOf('inst:AddComponent("health")')
    expect(ismastersimIdx).toBeGreaterThan(-1)
    expect(healthIdx).toBeGreaterThan(ismastersimIdx)
  })

  it('tags hostile creatures as monster+hostile', () => {
    const code = generateCreaturePrefab(creature)
    expect(code).toContain('inst:AddTag("monster")')
    expect(code).toContain('inst:AddTag("hostile")')
  })

  it('adds chanced loot drops', () => {
    const code = generateCreaturePrefab(creature)
    expect(code).toContain('inst.components.lootdropper:AddChancedLoot("monstermeat", 1)')
  })
})
