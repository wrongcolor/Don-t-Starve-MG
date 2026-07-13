import { describe, it, expect } from 'vitest'
import { generateCreatureFiles, generateCreaturePrefab } from '../../generators/creature'
import { generateStategraph } from '../../generators/stategraph'
import { sampleProject } from '../fixtures'

describe('generateCreatureFiles', () => {
  const [creature, spiderMob] = sampleProject.creatures

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

  it('escapes quotes in loot prefabs and tags so they cannot break out of the Lua string', () => {
    const malicious = {
      ...creature,
      tags: ['a" ) end -- '],
      loot: [{ prefab: 'x") end --', chance: 1 }],
    }
    const code = generateCreaturePrefab(malicious)
    expect(code).toContain('inst:AddTag("a\\" ) end -- ")')
    expect(code).toContain('inst.components.lootdropper:AddChancedLoot("x\\") end --", 1)')
    expect(code).not.toContain('inst:AddTag("a" ) end -- ")')
  })

  it('defaults to a custom build named after the creature id when no animation is chosen', () => {
    const code = generateCreaturePrefab(creature)
    expect(code).toContain('Asset("ANIM", "anim/testmob.zip")')
    expect(code).toContain('inst.AnimState:SetBank("testmob")')
    expect(code).toContain('inst.AnimState:SetBuild("testmob")')
    expect(code).toContain('inst.AnimState:PlayAnimation("idle")')
  })

  it('reuses a vanilla build without declaring an ANIM asset when animation.source is vanilla', () => {
    const code = generateCreaturePrefab(spiderMob)
    expect(code).not.toContain('Asset("ANIM"')
    expect(code).toContain('inst.AnimState:SetBank("spider")')
    expect(code).toContain('inst.AnimState:SetBuild("spider")')
  })

  it('threads the same vanilla clip names into the generated stategraph', () => {
    const withCustomClips = {
      ...spiderMob,
      animation: {
        source: 'vanilla' as const,
        build: 'spider',
        clips: { idle: 'idle', walk: 'walk', atk: 'atk_pre', hit: 'hit', death: 'death' },
      },
    }
    const sg = generateStategraph(withCustomClips)
    expect(sg).toContain('inst.AnimState:PlayAnimation("atk_pre")')
    expect(sg).not.toContain('inst.AnimState:PlayAnimation("atk")')
  })

  it('escapes quotes in custom animation clip names', () => {
    const malicious = {
      ...spiderMob,
      animation: {
        source: 'vanilla' as const,
        build: 'spider',
        clips: { idle: 'idle" ) end -- ', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' },
      },
    }
    const code = generateCreaturePrefab(malicious)
    expect(code).toContain('inst.AnimState:PlayAnimation("idle\\" ) end -- ")')
  })
})
