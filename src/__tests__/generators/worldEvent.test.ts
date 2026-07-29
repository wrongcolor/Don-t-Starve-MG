import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { generateWorldEventBlock, isWorldScopedTrigger, pickRandomOnlinePlayerBlock, worldEventTuningBlock } from '../../generators/worldEvent'
import type { WorldEventDef } from '../../types/worldEvent'

const baseEvent: WorldEventDef = {
  id: 'testduskambush',
  displayName: 'Test Dusk Ambush',
  description: 'Spawns a mob group at dusk',
  trigger: { kind: 'phaseChange', phase: 'dusk' },
  chance: 0.3,
  spawnRadius: 20,
  spawnGroup: [{ prefabId: 'testmob', count: { min: 2, max: 4 } }],
  loot: [{ prefab: 'monstermeat', chance: 0.5 }],
}

describe('worldEventTuningBlock', () => {
  it('sets chance and radius TUNING values', () => {
    expect(worldEventTuningBlock(baseEvent)).toEqual(['GLOBAL.TUNING.TESTDUSKAMBUSH_CHANCE = 0.3', 'GLOBAL.TUNING.TESTDUSKAMBUSH_RADIUS = 20'])
  })
})

describe('isWorldScopedTrigger', () => {
  it('is true for phaseChange/moonPhase, false for every player-scoped kind', () => {
    expect(isWorldScopedTrigger({ kind: 'phaseChange', phase: 'dusk' })).toBe(true)
    expect(isWorldScopedTrigger({ kind: 'moonPhase', moonPhase: 'full' })).toBe(true)
    expect(isWorldScopedTrigger({ kind: 'playerDeath' })).toBe(false)
    expect(isWorldScopedTrigger({ kind: 'killCreature', prefabId: 'spider' })).toBe(false)
    expect(isWorldScopedTrigger({ kind: 'eatItem' })).toBe(false)
    expect(isWorldScopedTrigger({ kind: 'craftItem', prefabId: 'axe' })).toBe(false)
    expect(isWorldScopedTrigger({ kind: 'harvestItem', prefabId: 'sapling' })).toBe(false)
  })
})

describe('generateWorldEventBlock', () => {
  it('generates a shared spawn function with per-entry group spawns and loot drops', () => {
    const code = generateWorldEventBlock(baseEvent).join('\n')
    expect(code).toContain('local function DoTestduskambush(anchor)')
    expect(code).toContain('if math.random() > TUNING.TESTDUSKAMBUSH_CHANCE then')
    expect(code).toContain(
      'local offset = FindWalkableOffset(Vector3(x, y, z), math.random() * TWOPI, TUNING.TESTDUSKAMBUSH_RADIUS, 12, true, false)',
    )
    expect(code).toContain('for i = 1, math.random(2, 4) do')
    expect(code).toContain('local spawned = SpawnPrefab("testmob")')
    expect(code).toContain('if math.random() <= 0.5 then')
    expect(code).toContain('local loot = SpawnPrefab("monstermeat")')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('spawns each spawnGroup entry independently', () => {
    const event = { ...baseEvent, spawnGroup: [{ prefabId: 'testmob', count: { min: 1, max: 1 } }, { prefabId: 'testhound', count: { min: 2, max: 3 } }] }
    const code = generateWorldEventBlock(event).join('\n')
    expect(code).toContain('for i = 1, math.random(1, 1) do')
    expect(code).toContain('local spawned = SpawnPrefab("testmob")')
    expect(code).toContain('for i = 1, math.random(2, 3) do')
    expect(code).toContain('local spawned = SpawnPrefab("testhound")')
  })

  it('wires TheWorld:ListenForEvent("phasechanged", ...) for a phaseChange trigger, anchored to a random player', () => {
    const code = generateWorldEventBlock(baseEvent).join('\n')
    expect(code).toContain('TheWorld:ListenForEvent("phasechanged", function(inst, data)')
    expect(code).toContain('if data.newphase == "dusk" then')
    expect(code).toContain('local player = PickRandomOnlinePlayer()')
    expect(code).toContain('DoTestduskambush(player)')
  })

  it('wires TheWorld:ListenForEvent("moonphasechanged2", ...) for a moonPhase trigger', () => {
    const event: WorldEventDef = { ...baseEvent, trigger: { kind: 'moonPhase', moonPhase: 'full' } }
    const code = generateWorldEventBlock(event).join('\n')
    expect(code).toContain('TheWorld:ListenForEvent("moonphasechanged2", function(inst, data)')
    expect(code).toContain('if data.moonphase == "full" then')
    expect(code).toContain('local player = PickRandomOnlinePlayer()')
  })

  it('wires a plain AddPlayerPostInit + "death" listener for playerDeath, with no data check', () => {
    const event: WorldEventDef = { ...baseEvent, trigger: { kind: 'playerDeath' } }
    const code = generateWorldEventBlock(event).join('\n')
    expect(code).toContain('AddPlayerPostInit(function(inst)')
    expect(code).toContain('inst:ListenForEvent("death", function(inst)')
    expect(code).toContain('DoTestduskambush(inst)')
    expect(code).not.toContain('if data')
  })

  it('wires "killed" filtered by data.victim.prefab for killCreature', () => {
    const event: WorldEventDef = { ...baseEvent, trigger: { kind: 'killCreature', prefabId: 'spider' } }
    const code = generateWorldEventBlock(event).join('\n')
    expect(code).toContain('inst:ListenForEvent("killed", function(inst, data)')
    expect(code).toContain('if data.victim ~= nil and data.victim.prefab == "spider" then')
  })

  it('wires "oneat" filtered by data.food.prefab when eatItem has a prefabId', () => {
    const event: WorldEventDef = { ...baseEvent, trigger: { kind: 'eatItem', prefabId: 'berries' } }
    const code = generateWorldEventBlock(event).join('\n')
    expect(code).toContain('inst:ListenForEvent("oneat", function(inst, data)')
    expect(code).toContain('if data.food ~= nil and data.food.prefab == "berries" then')
  })

  it('wires "oneat" with no filter when eatItem has no prefabId (any food)', () => {
    const event: WorldEventDef = { ...baseEvent, trigger: { kind: 'eatItem' } }
    const code = generateWorldEventBlock(event).join('\n')
    expect(code).toContain('inst:ListenForEvent("oneat", function(inst)')
    expect(code).toContain('DoTestduskambush(inst)')
    expect(code).not.toContain('data.food')
  })

  it('wires "makerecipe" filtered by data.recipe.product for craftItem', () => {
    const event: WorldEventDef = { ...baseEvent, trigger: { kind: 'craftItem', prefabId: 'gunpowder' } }
    const code = generateWorldEventBlock(event).join('\n')
    expect(code).toContain('inst:ListenForEvent("makerecipe", function(inst, data)')
    expect(code).toContain('if data.recipe ~= nil and data.recipe.product == "gunpowder" then')
  })

  it('wires "picksomething" filtered by data.object.prefab for harvestItem', () => {
    const event: WorldEventDef = { ...baseEvent, trigger: { kind: 'harvestItem', prefabId: 'sapling' } }
    const code = generateWorldEventBlock(event).join('\n')
    expect(code).toContain('inst:ListenForEvent("picksomething", function(inst, data)')
    expect(code).toContain('if data.object ~= nil and data.object.prefab == "sapling" then')
  })
})

describe('pickRandomOnlinePlayerBlock', () => {
  it('filters out dead and ghost players, same as Original/components/piratespawner.lua', () => {
    const code = pickRandomOnlinePlayerBlock().join('\n')
    expect(code).toContain('local function PickRandomOnlinePlayer()')
    expect(code).toContain('for _, v in ipairs(AllPlayers) do')
    expect(code).toContain('if not (v.components.health:IsDead() or v:HasTag("playerghost")) then')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })
})
