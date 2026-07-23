import type { CreatureDef } from '../types/modProject'

const DEFAULT_SEE_TARGET_DIST = 10

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

// PriorityNode/WhileNode/BT and the behaviour node constructors (Wander, Panic,
// ChaseAndAttack, RunAway) are engine globals set up by behaviourtree.lua and
// behaviours/*.lua, which are already loaded by the engine — only the specific
// behaviour modules used need an explicit require here, matching vanilla brain
// files (e.g. spiderbrain.lua).
export function generateBrain(creature: CreatureDef): string {
  const className = `${capitalize(creature.id)}Brain`

  const requires = ['require "behaviours/wander"']
  const localConstants: string[] = []
  const behaviorNodes: string[] = []

  if (creature.panicCauses.length > 0) {
    requires.push('require "behaviours/panic"')
    behaviorNodes.push(...panicBehaviorNodes(creature))
  }

  if (creature.behavior === 'hostile' || creature.behavior === 'neutral') {
    const attackLabel = creature.behavior === 'hostile' ? 'AttackTarget' : 'Retaliate'
    requires.push('require "behaviours/chaseandattack"')
    localConstants.push(`local SEE_TARGET_DIST = ${creature.stats.aggroRange ?? DEFAULT_SEE_TARGET_DIST}`)

    if (creature.kiting) {
      // Confirmed independently in bee/pig/merm brains (docs/dst-knowledge/
      // patterns.md#46) — the #1 transversal finding of the brain sweep
      // (patterns.md#51): attack only while off combat cooldown, retreat to a
      // safe distance in between, instead of standing and trading hits.
      requires.push('require "behaviours/runaway"')
      localConstants.push(`local RUN_AWAY_DIST = ${creature.kiting.runDistance}`)
      localConstants.push(`local STOP_RUN_AWAY_DIST = ${creature.kiting.safeDistance}`)
      behaviorNodes.push(
        `        WhileNode(function() return self.inst.components.combat:HasTarget() and not self.inst.components.combat:InCooldown() end, "${attackLabel}", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),`,
        '        WhileNode(function() return self.inst.components.combat:HasTarget() and self.inst.components.combat:InCooldown() end, "Dodge",',
        '            RunAway(self.inst, function() return self.inst.components.combat.target end, RUN_AWAY_DIST, STOP_RUN_AWAY_DIST)),',
      )
    } else {
      behaviorNodes.push(
        `        WhileNode(function() return self.inst.components.combat:HasTarget() end, "${attackLabel}", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),`,
      )
    }
  }

  behaviorNodes.push('        Wander(self.inst),')

  const lines = [...requires, '', 'local BrainClass = require "brain"']
  if (localConstants.length > 0) lines.push('', ...localConstants)
  lines.push(
    '',
    `local ${className} = Class(BrainClass, function(self, inst)`,
    '    BrainClass._ctor(self, inst)',
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
