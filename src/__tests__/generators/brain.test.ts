import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { generateBrain } from '../../generators/brain'
import { sampleProject } from '../fixtures'
import type { CreatureDef } from '../../types/modProject'

describe('generateBrain', () => {
  const [hostileMob] = sampleProject.creatures

  it('generates a plain ChaseAndAttack for hostile creatures with no kiting', () => {
    const code = generateBrain(hostileMob)
    expect(code).toContain('require "behaviours/chaseandattack"')
    expect(code).not.toContain('require "behaviours/runaway"')
    expect(code).toContain('local SEE_TARGET_DIST = 10')
    expect(code).toContain(
      'WhileNode(function() return self.inst.components.combat:HasTarget() and self.inst.components.combat.target ~= (self.inst.components.follower ~= nil and self.inst.components.follower:GetLeader() or nil) end, "AttackTarget", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),',
    )
    expect(code).toContain('Wander(self.inst, GetHomePos, MAX_WANDER_DIST),')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('labels a neutral creature\'s combat node "Retaliate" instead of "AttackTarget"', () => {
    const neutral: CreatureDef = { ...hostileMob, behavior: 'neutral' }
    const code = generateBrain(neutral)
    expect(code).toContain('"Retaliate"')
    expect(code).not.toContain('"AttackTarget"')
  })

  it('emits no combat behavior for passive creatures', () => {
    const passive: CreatureDef = { ...hostileMob, behavior: 'passive' }
    const code = generateBrain(passive)
    expect(code).not.toContain('require "behaviours/chaseandattack"')
    expect(code).not.toContain('SEE_TARGET_DIST')
    expect(code).toContain('Wander(self.inst, GetHomePos, MAX_WANDER_DIST),')
  })

  it('parametrizes SEE_TARGET_DIST from stats.aggroRange (patterns.md#46-51)', () => {
    const withAggroRange: CreatureDef = { ...hostileMob, stats: { ...hostileMob.stats, aggroRange: 25 } }
    expect(generateBrain(withAggroRange)).toContain('local SEE_TARGET_DIST = 25')
  })

  it('generates a hit-and-run kiting profile instead of plain ChaseAndAttack when kiting is set (patterns.md#46)', () => {
    const kiter: CreatureDef = { ...hostileMob, kiting: { runDistance: 6, safeDistance: 10 } }
    const code = generateBrain(kiter)
    expect(code).toContain('require "behaviours/runaway"')
    expect(code).toContain('local RUN_AWAY_DIST = 6')
    expect(code).toContain('local STOP_RUN_AWAY_DIST = 10')
    expect(code).toContain(
      'WhileNode(function() return self.inst.components.combat:HasTarget() and self.inst.components.combat.target ~= (self.inst.components.follower ~= nil and self.inst.components.follower:GetLeader() or nil) and not self.inst.components.combat:InCooldown() end, "AttackTarget", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),',
    )
    expect(code).toContain(
      'RunAway(self.inst, function() return self.inst.components.combat.target end, RUN_AWAY_DIST, STOP_RUN_AWAY_DIST)),',
    )
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  // Confirmed in hound.lua/spider.lua: both already carry `follower` from
  // spawn (tamed or not) and their own retarget logic already excludes
  // attacking `follower:GetLeader()` — this is the same real mechanism that
  // makes Webber's spider-whisperer effect and tamed pet hounds work, applied
  // unconditionally to every hostile creature this tool generates so
  // ItemDef.tameBomb's tame cloud has something to actually take effect on.
  it('never fights a hostile creature\'s own follower leader (hound.lua/spider.lua)', () => {
    const code = generateBrain(hostileMob)
    expect(code).toContain('self.inst.components.combat.target ~= (self.inst.components.follower ~= nil and self.inst.components.follower:GetLeader() or nil)')
  })

  it('does not add the leader-exclusion check for neutral creatures (nothing tags them "hostile" for the tame cloud to find)', () => {
    const neutral: CreatureDef = { ...hostileMob, behavior: 'neutral' }
    const code = generateBrain(neutral)
    expect(code).not.toContain('GetLeader()')
    expect(code).toContain(
      'WhileNode(function() return self.inst.components.combat:HasTarget() end, "Retaliate", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),',
    )
  })

  it('adds a FirePanic node driven by health.takingfiredamage when onFire is a panic cause', () => {
    const burns: CreatureDef = { ...hostileMob, flammable: true, panicCauses: ['onFire'] }
    const code = generateBrain(burns)
    expect(code).toContain('require "behaviours/panic"')
    expect(code).toContain(
      'WhileNode(function() return self.inst.components.health.takingfiredamage end, "FirePanic", Panic(self.inst)),',
    )
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('adds a HauntedPanic node driven by hauntable.panic when haunted is a panic cause', () => {
    const haunted: CreatureDef = { ...hostileMob, panicCauses: ['haunted'] }
    const code = generateBrain(haunted)
    expect(code).toContain('require "behaviours/panic"')
    expect(code).toContain(
      'WhileNode(function() return self.inst.components.hauntable ~= nil and self.inst.components.hauntable.panic end, "HauntedPanic", Panic(self.inst)),',
    )
  })

  it('omits the panic require entirely when no panic causes are set', () => {
    expect(generateBrain(hostileMob)).not.toContain('require "behaviours/panic"')
  })

  it('places panic nodes ahead of combat/wander nodes in priority order', () => {
    const code = generateBrain({ ...hostileMob, panicCauses: ['haunted'] })
    const panicIdx = code.indexOf('HauntedPanic')
    const attackIdx = code.indexOf('AttackTarget')
    const wanderIdx = code.indexOf('Wander(self.inst, GetHomePos, MAX_WANDER_DIST),')
    expect(panicIdx).toBeGreaterThan(-1)
    expect(panicIdx).toBeLessThan(attackIdx)
    expect(attackIdx).toBeLessThan(wanderIdx)
  })

  it('follows the nearest player when companion is set, with no tasks by default', () => {
    const companion: CreatureDef = { ...hostileMob, behavior: 'passive', companion: { followDistance: 5, tasks: [] } }
    const code = generateBrain(companion)
    expect(code).toContain('require "behaviours/follow"')
    expect(code).not.toContain('require "behaviours/doaction"')
    expect(code).toContain('local FOLLOW_MIN_DIST = 2')
    expect(code).toContain('local FOLLOW_TARGET_DIST = 5')
    expect(code).toContain('local FOLLOW_MAX_DIST = 9')
    expect(code).toContain(
      'Follow(self.inst, function() return FindClosestPlayerToInst(self.inst, 30, true) end, FOLLOW_MIN_DIST, FOLLOW_TARGET_DIST, FOLLOW_MAX_DIST),',
    )
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('adds a ChopTree DoAction node wired to worker/workable when chopTrees is a companion task', () => {
    const chopper: CreatureDef = {
      ...hostileMob,
      behavior: 'passive',
      companion: { followDistance: 5, tasks: ['chopTrees'] },
    }
    const code = generateBrain(chopper)
    expect(code).toContain('require "behaviours/doaction"')
    expect(code).toContain('local CHOP_RADIUS = 12')
    expect(code).toContain('ent.components.workable:GetWorkAction() == ACTIONS.CHOP')
    expect(code).toContain('DoAction(self.inst, ChopTreeAction, "ChopTree"),')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('adds a CollectItem DoAction node wired to ACTIONS.PICKUP when collectItems is a companion task', () => {
    const collector: CreatureDef = {
      ...hostileMob,
      behavior: 'passive',
      companion: { followDistance: 5, tasks: ['collectItems'] },
    }
    const code = generateBrain(collector)
    expect(code).toContain('local COLLECT_RADIUS = 10')
    expect(code).toContain('FindEntity(inst, COLLECT_RADIUS, nil, { "_inventoryitem" }, NO_PICKUP_TAGS)')
    expect(code).toContain('DoAction(self.inst, CollectItemAction, "CollectItem"),')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('places companion task nodes ahead of Follow, which comes ahead of Wander', () => {
    const both: CreatureDef = {
      ...hostileMob,
      behavior: 'passive',
      companion: { followDistance: 5, tasks: ['chopTrees', 'collectItems'] },
    }
    const code = generateBrain(both)
    const chopIdx = code.indexOf('DoAction(self.inst, ChopTreeAction')
    const collectIdx = code.indexOf('DoAction(self.inst, CollectItemAction')
    const followIdx = code.indexOf('Follow(self.inst,')
    const wanderIdx = code.indexOf('Wander(self.inst, GetHomePos, MAX_WANDER_DIST),')
    expect(chopIdx).toBeGreaterThan(-1)
    expect(chopIdx).toBeLessThan(collectIdx)
    expect(collectIdx).toBeLessThan(followIdx)
    expect(followIdx).toBeLessThan(wanderIdx)
  })

  it('skips Follow and the Wander fallback entirely when companion.orbit is set, since a periodic task drives its position instead', () => {
    const orbiter: CreatureDef = {
      ...hostileMob,
      behavior: 'neutral',
      companion: { followDistance: 5, tasks: [], orbit: { radius: 3, degreesPerSecond: 45 } },
    }
    const code = generateBrain(orbiter)
    expect(code).not.toContain('require "behaviours/follow"')
    expect(code).not.toContain('Follow(self.inst,')
    expect(code).not.toContain('Wander(self.inst, GetHomePos, MAX_WANDER_DIST),')
    expect(code).toContain('WhileNode(function() return self.inst.components.combat:HasTarget() end, "Retaliate", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  // A sentry (see creatureDefSchema.sentry) fights entirely through its own
  // periodic scan (creature.ts's SentryTick), not the brain — ChaseAndAttack
  // and Wander would both move it, contradicting "stays put".
  it('skips ChaseAndAttack and Wander entirely when sentry is set, since a periodic scan drives its attacks instead', () => {
    const sentry: CreatureDef = { ...hostileMob, behavior: 'neutral', sentry: { radius: 6 } }
    const code = generateBrain(sentry)
    expect(code).not.toContain('require "behaviours/chaseandattack"')
    expect(code).not.toContain('ChaseAndAttack(')
    expect(code).not.toContain('Wander(self.inst, GetHomePos, MAX_WANDER_DIST),')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('always wanders leashed to a home position, if the creature has one, instead of unleashed', () => {
    const code = generateBrain(hostileMob)
    expect(code).toContain('local MAX_WANDER_DIST = 20')
    expect(code).toContain(
      'local function GetHomePos(inst)\n    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil\nend',
    )
    expect(code).toContain('Wander(self.inst, GetHomePos, MAX_WANDER_DIST),')
  })

  it('adds a ChopTree/MineRock/HarvestCrop DoAction node for each work task, with no Follow behaviour', () => {
    const worker: CreatureDef = {
      ...hostileMob,
      behavior: 'passive',
      work: { tasks: ['chopTrees', 'mineRocks', 'harvestFarm'] },
    }
    const code = generateBrain(worker)
    expect(code).not.toContain('require "behaviours/follow"')
    expect(code).not.toContain('Follow(self.inst,')
    expect(code).toContain('local CHOP_RADIUS = 12')
    expect(code).toContain('local MINE_RADIUS = 12')
    expect(code).toContain('local HARVEST_RADIUS = 10')
    expect(code).toContain('ent.components.workable:GetWorkAction() == ACTIONS.MINE')
    expect(code).toContain('FindEntity(inst, HARVEST_RADIUS, nil, { "readyforharvest" })')
    expect(code).toContain('DoAction(self.inst, ChopTreeAction, "ChopTree"),')
    expect(code).toContain('DoAction(self.inst, MineRockAction, "MineRock"),')
    expect(code).toContain('DoAction(self.inst, HarvestCropAction, "HarvestCrop"),')
    expect(code).toContain('local COLLECT_RADIUS = 10')
    expect(code).toContain('DoAction(self.inst, CollectChoppedLootAction, "CollectChoppedLoot"),')
    expect(code).toContain('DoAction(self.inst, CollectMinedLootAction, "CollectMinedLoot"),')

    const chopIdx = code.indexOf('DoAction(self.inst, ChopTreeAction')
    const collectChoppedIdx = code.indexOf('DoAction(self.inst, CollectChoppedLootAction')
    const mineIdx = code.indexOf('DoAction(self.inst, MineRockAction')
    const collectMinedIdx = code.indexOf('DoAction(self.inst, CollectMinedLootAction')
    const harvestIdx = code.indexOf('DoAction(self.inst, HarvestCropAction')
    const wanderIdx = code.indexOf('Wander(self.inst, GetHomePos, MAX_WANDER_DIST),')
    expect(chopIdx).toBeLessThan(collectChoppedIdx)
    expect(collectChoppedIdx).toBeLessThan(mineIdx)
    expect(mineIdx).toBeLessThan(collectMinedIdx)
    expect(collectMinedIdx).toBeLessThan(harvestIdx)
    expect(harvestIdx).toBeLessThan(wanderIdx)

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('only lets a lumberjack/miner collect loot related to their own job (not any loose item)', () => {
    const worker: CreatureDef = { ...hostileMob, behavior: 'passive', work: { tasks: ['chopTrees', 'mineRocks'] } }
    const code = generateBrain(worker)
    expect(code).toContain('local CHOPPED_LOOT_PREFABS = { log = true, twigs = true, pinecone = true, twiggy_nut = true }')
    expect(code).toContain('local MINED_LOOT_PREFABS = { rocks = true, flint = true, nitre = true, goldnugget = true }')
    expect(code).toContain('FindEntity(inst, COLLECT_RADIUS, function(ent) return CHOPPED_LOOT_PREFABS[ent.prefab] end, { "_inventoryitem" })')
    expect(code).toContain('FindEntity(inst, COLLECT_RADIUS, function(ent) return MINED_LOOT_PREFABS[ent.prefab] end, { "_inventoryitem" })')
    expect(code).not.toContain('CollectItemAction')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('does not add a CollectItem node for a harvestFarm-only worker (HARVEST already gives straight to the doer)', () => {
    const farmer: CreatureDef = { ...hostileMob, behavior: 'passive', work: { tasks: ['harvestFarm'] } }
    const code = generateBrain(farmer)
    expect(code).not.toContain('CollectItemAction')
    expect(code).not.toContain('COLLECT_RADIUS')
  })
})
