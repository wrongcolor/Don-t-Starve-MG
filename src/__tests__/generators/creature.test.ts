import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { generateCreatureFiles, generateCreaturePrefab } from '../../generators/creature'
import { generateStategraph } from '../../generators/stategraph'
import { sampleProject } from '../fixtures'
import type { CreatureDef } from '../../types/modProject'

describe('generateCreatureFiles', () => {
  const [creature, spiderMob, hound] = sampleProject.creatures

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

  it('builds a custom build named after the creature id when animation is explicitly custom', () => {
    const code = generateCreaturePrefab(creature)
    expect(code).toContain('Asset("ANIM", "anim/testmob.zip")')
    expect(code).toContain('inst.AnimState:SetBank("testmob")')
    expect(code).toContain('inst.AnimState:SetBuild("testmob")')
    expect(code).toContain('inst.AnimState:PlayAnimation("idle")')
  })

  it('defaults to the vanilla pigman build (no Asset needed) when no animation is chosen at all', () => {
    const noAnimation: CreatureDef = { ...creature, animation: undefined }
    const code = generateCreaturePrefab(noAnimation)
    expect(code).not.toContain('Asset("ANIM"')
    expect(code).toContain('inst.AnimState:SetBank("pigman")')
    expect(code).toContain('inst.AnimState:SetBuild("pigman")')
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

  it('defaults attack range to 2 unless attackRange is set', () => {
    expect(generateCreaturePrefab(creature)).toContain('inst.components.combat:SetRange(2)')

    const code = generateCreaturePrefab(hound)
    expect(code).toContain('inst.components.combat:SetRange(TUNING.TESTHOUND_ATTACK_RANGE)')
    expect(code).not.toContain('SetRange(2)')
  })

  it('wires a sanity aura when sanityAura is set', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('sanityaura')

    const code = generateCreaturePrefab(hound)
    expect(code).toContain('inst:AddComponent("sanityaura")')
    expect(code).toContain('inst.components.sanityaura.aura = TUNING.TESTHOUND_SANITYAURA')
  })

  it('wires flammable/freezable susceptibility when set', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('MakeMediumBurnableCharacter')

    const code = generateCreaturePrefab(hound)
    expect(code).toContain('MakeMediumBurnableCharacter(inst, "body")')
    expect(code).toContain('MakeMediumFreezableCharacter(inst, "body")')
  })

  it('wires the cookable component when set', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('cookable')

    const code = generateCreaturePrefab(hound)
    expect(code).toContain('inst:AddComponent("cookable")')
    expect(code).toContain('inst.components.cookable.product = "cookedsmallmeat"')
  })

  it('wires herdmember + generates a second herd manager prefab when herd is set (patterns.md#27)', () => {
    const herdCreature: CreatureDef = {
      ...creature,
      herd: { maxSize: 8, gatherRange: 40, spawnIntervalDays: { min: 4, max: 6 } },
    }
    expect(generateCreatureFiles(creature)['scripts/prefabs/testmobherd.lua']).toBeUndefined()

    const files = generateCreatureFiles(herdCreature)
    expect(Object.keys(files).sort()).toEqual(
      [
        'scripts/prefabs/testmob.lua',
        'scripts/prefabs/testmobherd.lua',
        'scripts/stategraphs/SGtestmob.lua',
        'scripts/brains/testmobbrain.lua',
      ].sort(),
    )

    const mainCode = files['scripts/prefabs/testmob.lua']
    expect(mainCode).toContain('inst:AddComponent("herdmember")')
    expect(mainCode).toContain('inst.components.herdmember:SetHerdPrefab("testmobherd")')

    const herdCode = files['scripts/prefabs/testmobherd.lua']
    expect(herdCode).toContain('inst:AddComponent("herd")')
    expect(herdCode).toContain('inst.components.herd:SetMemberTag("testmob")')
    expect(herdCode).toContain('inst.components.herd:SetMaxSize(TUNING.TESTMOBHERD_MAX_SIZE)')
    expect(herdCode).toContain('inst.components.herd:SetOnEmptyFn(inst.Remove)')
    expect(herdCode).toContain('inst:AddComponent("periodicspawner")')
    expect(herdCode).toContain('inst.components.periodicspawner:SetPrefab("testmob")')
    expect(herdCode).not.toContain('AddNetwork')
    expect(herdCode).not.toContain('ismastersim')

    expect(() => parse(herdCode, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires the hauntable component when "haunted" is a panic cause (patterns.md#46-51)', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('hauntable')

    const hauntableCreature: CreatureDef = { ...creature, panicCauses: ['haunted'] }
    expect(generateCreaturePrefab(hauntableCreature)).toContain('inst:AddComponent("hauntable")')
  })

  it('wires worker/inventory components for a companion creature\'s chopTrees/collectItems tasks', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('worker')
    expect(generateCreaturePrefab(creature)).not.toContain('inventory')

    const chopper: CreatureDef = { ...creature, companion: { followDistance: 5, tasks: ['chopTrees'] } }
    const chopCode = generateCreaturePrefab(chopper)
    expect(chopCode).toContain('inst:AddComponent("worker")')
    expect(chopCode).toContain('inst.components.worker:SetAction(ACTIONS.CHOP, 1)')
    expect(chopCode).not.toContain('inst:AddComponent("inventory")')

    const collector: CreatureDef = { ...creature, companion: { followDistance: 5, tasks: ['collectItems'] } }
    const collectCode = generateCreaturePrefab(collector)
    expect(collectCode).toContain('inst:AddComponent("inventory")')
    expect(collectCode).not.toContain('inst:AddComponent("worker")')
  })
})
