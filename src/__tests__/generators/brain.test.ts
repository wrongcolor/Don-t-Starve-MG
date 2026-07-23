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
      'WhileNode(function() return self.inst.components.combat:HasTarget() end, "AttackTarget", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),',
    )
    expect(code).toContain('Wander(self.inst),')
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
    expect(code).toContain('Wander(self.inst),')
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
      'WhileNode(function() return self.inst.components.combat:HasTarget() and not self.inst.components.combat:InCooldown() end, "AttackTarget", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),',
    )
    expect(code).toContain(
      'RunAway(self.inst, function() return self.inst.components.combat.target end, RUN_AWAY_DIST, STOP_RUN_AWAY_DIST)),',
    )
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
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
    const wanderIdx = code.indexOf('Wander(self.inst),')
    expect(panicIdx).toBeGreaterThan(-1)
    expect(panicIdx).toBeLessThan(attackIdx)
    expect(attackIdx).toBeLessThan(wanderIdx)
  })
})
