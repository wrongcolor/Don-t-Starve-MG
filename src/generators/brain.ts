import type { CreatureDef } from '../types/modProject'

// PriorityNode/WhileNode/BT and the behaviour node constructors (Wander, Panic,
// ChaseAndAttack) are engine globals set up by behaviourtree.lua and behaviours/*.lua,
// which are already loaded by the engine — only the specific behaviour modules used
// need an explicit require here, matching vanilla brain files (e.g. spiderbrain.lua).
export function generateBrain(creature: CreatureDef): string {
  const className = `${capitalize(creature.id)}Brain`

  const requires = ['require "behaviours/wander"']
  const behaviorNodes: string[] = []

  if (creature.behavior === 'hostile') {
    requires.push('require "behaviours/chaseandattack"')
    requires.push('require "behaviours/panic"')
    behaviorNodes.push(
      '        WhileNode(function() return self.inst.components.combat:HasTarget() end, "AttackTarget", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),',
    )
    behaviorNodes.push('        Wander(self.inst),')
  } else if (creature.behavior === 'neutral') {
    requires.push('require "behaviours/panic"')
    requires.push('require "behaviours/chaseandattack"')
    behaviorNodes.push(
      '        WhileNode(function() return self.inst.components.combat:HasTarget() end, "Retaliate", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),',
    )
    behaviorNodes.push('        Wander(self.inst),')
  } else {
    behaviorNodes.push('        Wander(self.inst),')
  }

  return `${requires.join('\n')}

local BrainClass = require "brain"

local SEE_TARGET_DIST = 10

local ${className} = Class(BrainClass, function(self, inst)
    BrainClass._ctor(self, inst)
end)

function ${className}:OnStart()
    local root = PriorityNode(
    {
${behaviorNodes.join('\n')}
    }, .25)

    self.bt = BT(self.inst, root)
end

return ${className}
`
}

function capitalize(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1)
}
