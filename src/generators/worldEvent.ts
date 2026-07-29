import type { WorldEventDef, WorldEventTrigger } from '../types/worldEvent'
import { luaString, toUpperSnake } from './luaUtils'

function capitalize(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

export function isWorldScopedTrigger(trigger: WorldEventTrigger): boolean {
  return trigger.kind === 'phaseChange' || trigger.kind === 'moonPhase'
}

export function worldEventTuningBlock(event: WorldEventDef): string[] {
  const upper = toUpperSnake(event.id)
  return [`GLOBAL.TUNING.${upper}_CHANCE = ${event.chance}`, `GLOBAL.TUNING.${upper}_RADIUS = ${event.spawnRadius}`]
}

// Confirmed in the base game's own beefaloherd.lua / Original/components/piratespawner.lua:
// FindWalkableOffset(pos, angle, radius, ...) for a random valid ground point within a
// radius, and SpawnPrefab + Transform:SetPosition to place the new entity there —
// the same primitives StructureDef.daySpawner's own codegen already reuses.
function spawnFunctionBlock(event: WorldEventDef): string[] {
  const upper = toUpperSnake(event.id)
  const cap = capitalize(event.id)
  const lines: string[] = [
    `local function Do${cap}(anchor)`,
    `    if math.random() > TUNING.${upper}_CHANCE then`,
    '        return',
    '    end',
    '',
    '    local x, y, z = anchor.Transform:GetWorldPosition()',
    `    local offset = FindWalkableOffset(Vector3(x, y, z), math.random() * TWOPI, TUNING.${upper}_RADIUS, 12, true, false)`,
    '    if offset == nil then',
    '        return',
    '    end',
    '',
    '    local px, py, pz = x + offset.x, y + offset.y, z + offset.z',
  ]

  for (const entry of event.spawnGroup) {
    lines.push(
      '',
      `    for i = 1, math.random(${entry.count.min}, ${entry.count.max}) do`,
      `        local spawned = SpawnPrefab(${luaString(entry.prefabId)})`,
      '        if spawned ~= nil then',
      '            spawned.Transform:SetPosition(px, py, pz)',
      '        end',
      '    end',
    )
  }

  for (const drop of event.loot) {
    lines.push(
      '',
      `    if math.random() <= ${drop.chance} then`,
      `        local loot = SpawnPrefab(${luaString(drop.prefab)})`,
      '        if loot ~= nil then',
      '            loot.Transform:SetPosition(px, py, pz)',
      '        end',
      '    end',
    )
  }

  lines.push('end')
  return lines
}

// Confirmed in Original/components/piratespawner.lua's own AllPlayers loop: alive,
// non-ghost players are the pool a world-scoped event picks an anchor point from.
export function pickRandomOnlinePlayerBlock(): string[] {
  return [
    'local function PickRandomOnlinePlayer()',
    '    local candidates = {}',
    '    for _, v in ipairs(AllPlayers) do',
    '        if not (v.components.health:IsDead() or v:HasTag("playerghost")) then',
    '            table.insert(candidates, v)',
    '        end',
    '    end',
    '    return #candidates > 0 and candidates[math.random(#candidates)] or nil',
    'end',
    '',
  ]
}

function worldScopedWiringBlock(event: WorldEventDef, cap: string): string[] {
  const trigger = event.trigger
  let eventName: string
  let matchExpr: string
  if (trigger.kind === 'phaseChange') {
    eventName = 'phasechanged'
    matchExpr = `data.newphase == ${luaString(trigger.phase)}`
  } else if (trigger.kind === 'moonPhase') {
    eventName = 'moonphasechanged2'
    matchExpr = `data.moonphase == ${luaString(trigger.moonPhase)}`
  } else {
    throw new Error(`worldScopedWiringBlock called with a player-scoped trigger kind: ${trigger.kind}`)
  }

  return [
    `TheWorld:ListenForEvent(${luaString(eventName)}, function(inst, data)`,
    `    if ${matchExpr} then`,
    '        local player = PickRandomOnlinePlayer()',
    '        if player ~= nil then',
    `            Do${cap}(player)`,
    '        end',
    '    end',
    'end)',
  ]
}

// Real events pushed directly onto the player itself — components/combat.lua's
// "killed" (attacker:PushEvent("killed", {victim=...})), components/eater.lua's
// "oneat" (data.food), components/builder.lua's "makerecipe" (data.recipe.product,
// confirmed === the recipe's own name via scripts/recipe.lua), components/
// pickable.lua's "picksomething" (data.object), and the standard "death" event
// every player fires via prefabs/player_common.lua.
function playerScopedEventAndCheck(trigger: WorldEventTrigger): { event: string; check?: string } {
  switch (trigger.kind) {
    case 'playerDeath':
      return { event: 'death' }
    case 'killCreature':
      return { event: 'killed', check: `data.victim ~= nil and data.victim.prefab == ${luaString(trigger.prefabId)}` }
    case 'eatItem':
      return {
        event: 'oneat',
        check: trigger.prefabId ? `data.food ~= nil and data.food.prefab == ${luaString(trigger.prefabId)}` : undefined,
      }
    case 'craftItem':
      return { event: 'makerecipe', check: `data.recipe ~= nil and data.recipe.product == ${luaString(trigger.prefabId)}` }
    case 'harvestItem':
      return { event: 'picksomething', check: `data.object ~= nil and data.object.prefab == ${luaString(trigger.prefabId)}` }
    default:
      throw new Error(`playerScopedEventAndCheck called with a world-scoped trigger kind: ${trigger.kind}`)
  }
}

function playerScopedWiringBlock(event: WorldEventDef, cap: string): string[] {
  const { event: eventName, check } = playerScopedEventAndCheck(event.trigger)
  const lines: string[] = ['AddPlayerPostInit(function(inst)']

  if (check) {
    lines.push(
      `    inst:ListenForEvent(${luaString(eventName)}, function(inst, data)`,
      `        if ${check} then`,
      `            Do${cap}(inst)`,
      '        end',
      '    end)',
    )
  } else {
    lines.push(`    inst:ListenForEvent(${luaString(eventName)}, function(inst)`, `        Do${cap}(inst)`, '    end)')
  }

  lines.push('end)')
  return lines
}

export function generateWorldEventBlock(event: WorldEventDef): string[] {
  const cap = capitalize(event.id)
  const wiring = isWorldScopedTrigger(event.trigger) ? worldScopedWiringBlock(event, cap) : playerScopedWiringBlock(event, cap)
  return [...spawnFunctionBlock(event), '', ...wiring]
}
