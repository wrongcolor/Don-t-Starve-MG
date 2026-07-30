require "behaviours/wander"
require "behaviours/chaseandattack"

local BrainClass = require "brain"

local MAX_WANDER_DIST = 20
local SEE_TARGET_DIST = 10

local function GetHomePos(inst)
    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil
end

local PackwolfBrain = Class(BrainClass, function(self, inst)
    BrainClass._ctor(self, inst)
end)

function PackwolfBrain:OnStart()
    local root = PriorityNode(
    {
        WhileNode(function() return self.inst.components.combat:HasTarget() and self.inst.components.combat.target ~= (self.inst.components.follower ~= nil and self.inst.components.follower:GetLeader() or nil) end, "AttackTarget", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),
        Wander(self.inst, GetHomePos, MAX_WANDER_DIST),
    }, .25)

    self.bt = BT(self.inst, root)
end

return PackwolfBrain
