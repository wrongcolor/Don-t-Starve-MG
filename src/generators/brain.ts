import type { CreatureDef } from '../types/modProject'

const DEFAULT_SEE_TARGET_DIST = 10

// Confirmed across dozens of real brains (e.g. beefalobrain.lua, deerbrain.lua,
// centipedebrain.lua): FindClosestPlayerToInst(inst, dist, isalive) is the standard
// global helper for "the nearest player within range."
const FOLLOW_SEARCH_DIST = 30
const FOLLOW_MIN_DIST = 2
const CHOP_RADIUS = 12
const COLLECT_RADIUS = 10
const MINE_RADIUS = 12
const HARVEST_RADIUS = 10
const MAX_WANDER_DIST = 20

function capitalize(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

// "onFire" and "haunted" are the two panic causes confirmed generalizable
// across real brains (docs/dst-knowledge/patterns.md#46-51) without requiring
// components this tool doesn't already model: takingfiredamage only ticks
// while the burnable component (creature.flammable) is active, and hauntable
// drives its own .panic flag once added, with no extra wiring needed.
function panicBehaviorNodes(creature: CreatureDef): string[] {
  const nodes: string[] = []
  if (creature.panicCauses.includes('onFire')) {
    nodes.push(
      '        WhileNode(function() return self.inst.components.health.takingfiredamage end, "FirePanic", Panic(self.inst)),',
    )
  }
  if (creature.panicCauses.includes('haunted')) {
    nodes.push(
      '        WhileNode(function() return self.inst.components.hauntable ~= nil and self.inst.components.hauntable.panic end, "HauntedPanic", Panic(self.inst)),',
    )
  }
  return nodes
}

function chopTreesFunctionBlock(): string[] {
  return [
    'local function FindTreeToChop(inst)',
    '    return FindEntity(inst, CHOP_RADIUS, function(ent)',
    '        return ent.components.workable ~= nil',
    '            and ent.components.workable:CanBeWorked()',
    '            and ent.components.workable:GetWorkAction() == ACTIONS.CHOP',
    '    end, { "tree" })',
    'end',
    '',
    'local function ChopTreeAction(inst)',
    '    local tree = FindTreeToChop(inst)',
    '    return tree ~= nil and BufferedAction(inst, tree, ACTIONS.CHOP) or nil',
    'end',
  ]
}

function collectItemsFunctionBlock(): string[] {
  return [
    'local NO_PICKUP_TAGS = { "FX", "NOCLICK", "DECOR", "INLIMBO", "outofreach" }',
    '',
    'local function FindLooseItem(inst)',
    '    return FindEntity(inst, COLLECT_RADIUS, nil, { "_inventoryitem" }, NO_PICKUP_TAGS)',
    'end',
    '',
    'local function CollectItemAction(inst)',
    '    local item = FindLooseItem(inst)',
    '    return item ~= nil and BufferedAction(inst, item, ACTIONS.PICKUP) or nil',
    'end',
  ]
}

function mineRocksFunctionBlock(): string[] {
  return [
    'local function FindRockToMine(inst)',
    '    return FindEntity(inst, MINE_RADIUS, function(ent)',
    '        return ent.components.workable ~= nil',
    '            and ent.components.workable:CanBeWorked()',
    '            and ent.components.workable:GetWorkAction() == ACTIONS.MINE',
    '    end, { "rock" })',
    'end',
    '',
    'local function MineRockAction(inst)',
    '    local rock = FindRockToMine(inst)',
    '    return rock ~= nil and BufferedAction(inst, rock, ACTIONS.MINE) or nil',
    'end',
  ]
}

function harvestFarmFunctionBlock(): string[] {
  return [
    'local function FindCropToHarvest(inst)',
    '    return FindEntity(inst, HARVEST_RADIUS, nil, { "readyforharvest" })',
    'end',
    '',
    'local function HarvestCropAction(inst)',
    '    local crop = FindCropToHarvest(inst)',
    '    return crop ~= nil and BufferedAction(inst, crop, ACTIONS.HARVEST) or nil',
    'end',
  ]
}

function collectChoppedLootFunctionBlock(): string[] {
  return [
    'local CHOPPED_LOOT_PREFABS = { log = true, twigs = true, pinecone = true, twiggy_nut = true }',
    '',
    'local function FindChoppedLoot(inst)',
    '    return FindEntity(inst, COLLECT_RADIUS, function(ent) return CHOPPED_LOOT_PREFABS[ent.prefab] end, { "_inventoryitem" })',
    'end',
    '',
    'local function CollectChoppedLootAction(inst)',
    '    local item = FindChoppedLoot(inst)',
    '    return item ~= nil and BufferedAction(inst, item, ACTIONS.PICKUP) or nil',
    'end',
  ]
}

function collectMinedLootFunctionBlock(): string[] {
  return [
    'local MINED_LOOT_PREFABS = { rocks = true, flint = true, nitre = true, goldnugget = true }',
    '',
    'local function FindMinedLoot(inst)',
    '    return FindEntity(inst, COLLECT_RADIUS, function(ent) return MINED_LOOT_PREFABS[ent.prefab] end, { "_inventoryitem" })',
    'end',
    '',
    'local function CollectMinedLootAction(inst)',
    '    local item = FindMinedLoot(inst)',
    '    return item ~= nil and BufferedAction(inst, item, ACTIONS.PICKUP) or nil',
    'end',
  ]
}

// Confirmed real APIs, heavily simplified from the real "assist the leader" system
// (see COMPANION_TASKS in modProject.ts for exactly what's dropped): worker/workable
// + BufferedAction(ACTIONS.CHOP) for chopping (spooked.lua/wildfires.lua), and
// inventory + ACTIONS.PICKUP for collecting (batbrain.lua/braincommon.lua). Both work
// autonomously near the companion itself, not near whatever the player is doing.
function companionTaskFunctions(creature: CreatureDef): { functions: string[]; nodes: string[] } {
  const tasks = creature.companion?.tasks ?? []
  const functions: string[] = []
  const nodes: string[] = []

  if (tasks.includes('chopTrees')) {
    functions.push(...chopTreesFunctionBlock())
    nodes.push('        DoAction(self.inst, ChopTreeAction, "ChopTree"),')
  }

  if (tasks.includes('collectItems')) {
    if (functions.length > 0) functions.push('')
    functions.push(...collectItemsFunctionBlock())
    nodes.push('        DoAction(self.inst, CollectItemAction, "CollectItem"),')
  }

  return { functions, nodes }
}

function workTaskFunctions(creature: CreatureDef): { functions: string[]; nodes: string[] } {
  const tasks = creature.work?.tasks ?? []
  const functions: string[] = []
  const nodes: string[] = []

  if (tasks.includes('chopTrees')) {
    functions.push(...chopTreesFunctionBlock())
    nodes.push('        DoAction(self.inst, ChopTreeAction, "ChopTree"),')

    functions.push('', ...collectChoppedLootFunctionBlock())
    nodes.push('        DoAction(self.inst, CollectChoppedLootAction, "CollectChoppedLoot"),')
  }

  if (tasks.includes('mineRocks')) {
    if (functions.length > 0) functions.push('')
    functions.push(...mineRocksFunctionBlock())
    nodes.push('        DoAction(self.inst, MineRockAction, "MineRock"),')

    functions.push('', ...collectMinedLootFunctionBlock())
    nodes.push('        DoAction(self.inst, CollectMinedLootAction, "CollectMinedLoot"),')
  }

  if (tasks.includes('harvestFarm')) {
    if (functions.length > 0) functions.push('')
    functions.push(...harvestFarmFunctionBlock())
    nodes.push('        DoAction(self.inst, HarvestCropAction, "HarvestCrop"),')
  }

  return { functions, nodes }
}

// PriorityNode/WhileNode/BT and the behaviour node constructors (Wander, Panic,
// ChaseAndAttack, RunAway, Follow, DoAction) are engine globals set up by
// behaviourtree.lua and behaviours/*.lua, which are already loaded by the engine —
// only the specific behaviour modules used need an explicit require here, matching
// vanilla brain files (e.g. spiderbrain.lua).
export function generateBrain(creature: CreatureDef): string {
  const className = `${capitalize(creature.id)}Brain`

  const requires = ['require "behaviours/wander"']
  const localConstants: string[] = [`local MAX_WANDER_DIST = ${MAX_WANDER_DIST}`]
  const localFunctions: string[] = [
    'local function GetHomePos(inst)',
    '    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil',
    'end',
  ]
  const behaviorNodes: string[] = []
  const stationary = creature.sentry !== undefined

  if (creature.panicCauses.length > 0) {
    requires.push('require "behaviours/panic"')
    behaviorNodes.push(...panicBehaviorNodes(creature))
  }

  // A sentry (see creatureDefSchema.sentry) fights entirely through its own
  // periodic proximity scan (see creature.ts's sentryFunctionBlock), not the
  // brain — ChaseAndAttack/Wander would both move it, contradicting "stays
  // put", so both are skipped below regardless of its behavior/kiting.
  if ((creature.behavior === 'hostile' || creature.behavior === 'neutral') && !stationary) {
    const attackLabel = creature.behavior === 'hostile' ? 'AttackTarget' : 'Retaliate'
    requires.push('require "behaviours/chaseandattack"')
    localConstants.push(`local SEE_TARGET_DIST = ${creature.stats.aggroRange ?? DEFAULT_SEE_TARGET_DIST}`)

    // Confirmed in hound.lua/spider.lua: a hostile creature that's been given
    // a follower leader (e.g. by ItemDef.tameBomb's tame cloud) never fights
    // that leader — same real, unconditional check those two already ship
    // with (they carry `follower` from spawn, tamed or not). Only relevant
    // for `hostile` — only hostile creatures get the "hostile" tag the tame
    // cloud searches for, so `neutral` never needs this.
    const hasTarget =
      creature.behavior === 'hostile'
        ? 'self.inst.components.combat:HasTarget() and self.inst.components.combat.target ~= (self.inst.components.follower ~= nil and self.inst.components.follower:GetLeader() or nil)'
        : 'self.inst.components.combat:HasTarget()'

    if (creature.kiting) {
      // Confirmed independently in bee/pig/merm brains (docs/dst-knowledge/
      // patterns.md#46) — the #1 transversal finding of the brain sweep
      // (patterns.md#51): attack only while off combat cooldown, retreat to a
      // safe distance in between, instead of standing and trading hits.
      requires.push('require "behaviours/runaway"')
      localConstants.push(`local RUN_AWAY_DIST = ${creature.kiting.runDistance}`)
      localConstants.push(`local STOP_RUN_AWAY_DIST = ${creature.kiting.safeDistance}`)
      behaviorNodes.push(
        `        WhileNode(function() return ${hasTarget} and not self.inst.components.combat:InCooldown() end, "${attackLabel}", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),`,
        `        WhileNode(function() return ${hasTarget} and self.inst.components.combat:InCooldown() end, "Dodge",`,
        '            RunAway(self.inst, function() return self.inst.components.combat.target end, RUN_AWAY_DIST, STOP_RUN_AWAY_DIST)),',
      )
    } else {
      behaviorNodes.push(`        WhileNode(function() return ${hasTarget} end, "${attackLabel}", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),`)
    }
  }

  const orbiting = creature.companion?.orbit !== undefined

  if (creature.companion) {
    const tasks = creature.companion.tasks
    if (tasks.length > 0) requires.push('require "behaviours/doaction"')
    if (tasks.includes('chopTrees')) localConstants.push(`local CHOP_RADIUS = ${CHOP_RADIUS}`)
    if (tasks.includes('collectItems')) localConstants.push(`local COLLECT_RADIUS = ${COLLECT_RADIUS}`)

    const { functions, nodes } = companionTaskFunctions(creature)
    localFunctions.push('', ...functions)
    behaviorNodes.push(...nodes)

    if (!orbiting) {
      requires.push('require "behaviours/follow"')
      localConstants.push(
        `local FOLLOW_MIN_DIST = ${FOLLOW_MIN_DIST}`,
        `local FOLLOW_TARGET_DIST = ${creature.companion.followDistance}`,
        `local FOLLOW_MAX_DIST = ${creature.companion.followDistance + 4}`,
      )
      behaviorNodes.push(
        `        Follow(self.inst, function() return FindClosestPlayerToInst(self.inst, ${FOLLOW_SEARCH_DIST}, true) end, FOLLOW_MIN_DIST, FOLLOW_TARGET_DIST, FOLLOW_MAX_DIST),`,
      )
    }
  }

  if (creature.work) {
    const tasks = creature.work.tasks
    requires.push('require "behaviours/doaction"')
    if (tasks.includes('chopTrees')) localConstants.push(`local CHOP_RADIUS = ${CHOP_RADIUS}`)
    if (tasks.includes('mineRocks')) localConstants.push(`local MINE_RADIUS = ${MINE_RADIUS}`)
    if (tasks.includes('harvestFarm')) localConstants.push(`local HARVEST_RADIUS = ${HARVEST_RADIUS}`)
    if (tasks.includes('chopTrees') || tasks.includes('mineRocks')) localConstants.push(`local COLLECT_RADIUS = ${COLLECT_RADIUS}`)

    const { functions, nodes } = workTaskFunctions(creature)
    localFunctions.push('', ...functions)
    behaviorNodes.push(...nodes)
  }

  if (!orbiting && !stationary) {
    behaviorNodes.push('        Wander(self.inst, GetHomePos, MAX_WANDER_DIST),')
  }

  // Reproduced in-game (real crash, killed the whole game): "attempt to
  // index upvalue 'BrainClass' (a boolean value)". Confirmed against the
  // real scripts/brain.lua: it assigns the GLOBAL `Brain = Class(...)` and
  // never returns anything — per standard Lua 5.1 require() semantics, a
  // module with no explicit return value caches/returns `true` as a stand-in,
  // not the class table. `Brain` is already loaded once by the engine at
  // boot and available as a bare global everywhere (confirmed against every
  // real vanilla brain, e.g. eyeturretbrain.lua's own
  // `Class(Brain, function(self, inst) Brain._ctor(self, inst) end)`) — no
  // require needed or possible.
  const lines = [...requires]
  if (localConstants.length > 0) lines.push('', ...localConstants)
  if (localFunctions.length > 0) lines.push('', ...localFunctions)
  lines.push(
    '',
    `local ${className} = Class(Brain, function(self, inst)`,
    '    Brain._ctor(self, inst)',
    'end)',
    '',
    `function ${className}:OnStart()`,
    '    local root = PriorityNode(',
    '    {',
    ...behaviorNodes,
    '    }, .25)',
    '',
    '    self.bt = BT(self.inst, root)',
    'end',
    '',
    `return ${className}`,
  )

  return lines.join('\n') + '\n'
}
