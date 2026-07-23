import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { generateStructureFiles, generateStructurePrefab } from '../../generators/structure'
import type { StructureDef } from '../../types/modProject'
import { sampleProject } from '../fixtures'

describe('generateStructureFiles', () => {
  const [structure] = sampleProject.structures

  it('checks TheWorld.ismastersim right after SetPristine, before server components', () => {
    const code = generateStructurePrefab(structure)
    const pristineIdx = code.indexOf('inst.entity:SetPristine()')
    const ismastersimIdx = code.indexOf('if not TheWorld.ismastersim then')
    const componentIdx = code.indexOf('inst:AddComponent("lootdropper")')

    expect(pristineIdx).toBeGreaterThan(-1)
    expect(ismastersimIdx).toBeGreaterThan(pristineIdx)
    expect(componentIdx).toBeGreaterThan(ismastersimIdx)
  })

  it('always generates both the prefab and its placer — every structure gets one', () => {
    const files = generateStructureFiles(structure)
    expect(Object.keys(files).sort()).toEqual(
      ['scripts/prefabs/teststructure.lua', 'scripts/prefabs/teststructure_placer.lua'].sort(),
    )
  })

  it('is never an inventory item — MakeObstaclePhysics + tag "structure" instead (patterns.md#25)', () => {
    const code = generateStructurePrefab(structure)
    expect(code).toContain('MakeObstaclePhysics(inst, 0.5)')
    expect(code).not.toContain('MakeInventoryPhysics')
    expect(code).toContain('inst:AddTag("structure")')
    expect(code).not.toContain('inst:AddTag("item")')
    expect(code).not.toContain('inst:AddComponent("inventoryitem")')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires workable + hammer-destroy, dropping loot if any', () => {
    const code = generateStructurePrefab(structure)
    expect(code).toContain('inst:AddComponent("lootdropper")')
    expect(code).toContain('inst:AddComponent("workable")')
    expect(code).toContain('inst.components.workable:SetWorkAction(ACTIONS.HAMMER)')
    expect(code).toContain('inst.components.workable:SetOnFinishCallback(onhammered)')
    expect(code).toContain('local function onhammered(inst)')
    expect(code).toContain('inst.components.lootdropper:DropLoot()')
    expect(code).toContain('inst:Remove()')
  })

  it('adds AddChancedLoot calls for each configured loot drop', () => {
    const looted: StructureDef = { ...structure, id: 'testlootedstructure', loot: [{ prefab: 'boards', chance: 0.5 }] }
    const code = generateStructurePrefab(looted)
    expect(code).toContain('inst.components.lootdropper:AddChancedLoot("boards", 0.5)')
  })

  it('does not wire the container auto-close-on-pickup (no inventoryitem to hook)', () => {
    const container: StructureDef = {
      ...structure,
      id: 'teststructurebag',
      container: { widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: false },
    }
    const code = generateStructurePrefab(container)
    expect(code).toContain('inst:AddComponent("container")')
    expect(code).not.toContain('SetOnPutInInventoryFn')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires teleporter + auto-pairing via a shared GLOBAL table when teleportPair is set (patterns.md#23)', () => {
    const teleporter: StructureDef = { ...structure, id: 'testteleporter', teleportPair: true }
    const code = generateStructurePrefab(teleporter)
    expect(code).toContain('inst:AddComponent("teleporter")')
    expect(code).toContain('LinkTeleportPair(inst)')
    expect(code).toContain('GLOBAL.TELEPORT_PAIRS = GLOBAL.TELEPORT_PAIRS or {}')
    expect(code).toContain('a.components.teleporter:Target(b)')
    expect(code).toContain('b.components.teleporter:Target(a)')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires a day-start chance to spawn a prefab within a range, gated on phasechanged == "day" (beefaloherd.lua)', () => {
    const spawner: StructureDef = { ...structure, id: 'testspawner', daySpawner: { prefab: 'deerclops', chance: 0.1, range: 40 } }
    const code = generateStructurePrefab(spawner)
    expect(code).toContain('local function trydayspawn(inst, src, phase)')
    expect(code).toContain('if phase ~= "day" or math.random() > TUNING.TESTSPAWNER_SPAWN_CHANCE then')
    expect(code).toContain('FindWalkableOffset(Vector3(x, y, z), math.random() * TWOPI, TUNING.TESTSPAWNER_SPAWN_RANGE, 12, true, false)')
    expect(code).toContain('local spawned = SpawnPrefab("deerclops")')
    expect(code).toContain('inst:ListenForEvent("phasechanged", trydayspawn, TheWorld)')
    expect(code).toContain('local prefabs = { "deerclops" }')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('reuses a vanilla build without declaring an ANIM asset when animation.source is vanilla', () => {
    const vanilla: StructureDef = { ...structure, id: 'testvanillastructure', animation: { source: 'vanilla', build: 'researchlab' } }
    const code = generateStructurePrefab(vanilla)
    expect(code).not.toContain('Asset("ANIM"')
    expect(code).toContain('inst.AnimState:SetBank("researchlab")')
    expect(code).toContain('inst.AnimState:SetBuild("researchlab")')
  })

  it('defaults to a custom build named after its own id when no animation is chosen', () => {
    const code = generateStructurePrefab(structure)
    expect(code).toContain('Asset("ANIM", "anim/teststructure.zip")')
    expect(code).toContain('inst.AnimState:SetBank("teststructure")')
    expect(code).toContain('inst.AnimState:SetBuild("teststructure")')
  })
})
