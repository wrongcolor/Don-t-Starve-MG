require "behaviours/wander"
require "behaviours/panic"
require "behaviours/chaseandattack"
require "behaviours/runaway"

local MAX_WANDER_DIST = 20
local SEE_TARGET_DIST = 15
local RUN_AWAY_DIST = 6
local STOP_RUN_AWAY_DIST = 10

local function GetHomePos(inst)
    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil
end

local BoglurkerBrain = Class(Brain, function(self, inst)
    Brain._ctor(self, inst)
end)

function BoglurkerBrain:OnStart()
    local root = PriorityNode(
    {
        WhileNode(function() return self.inst.components.health.takingfiredamage end, "FirePanic", Panic(self.inst)),
        WhileNode(function() return self.inst.components.hauntable ~= nil and self.inst.components.hauntable.panic end, "HauntedPanic", Panic(self.inst)),
        WhileNode(function() return self.inst.components.combat:HasTarget() and self.inst.components.combat.target ~= (self.inst.components.follower ~= nil and self.inst.components.follower:GetLeader() or nil) and not self.inst.components.combat:InCooldown() end, "AttackTarget", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),
        WhileNode(function() return self.inst.components.combat:HasTarget() and self.inst.components.combat.target ~= (self.inst.components.follower ~= nil and self.inst.components.follower:GetLeader() or nil) and self.inst.components.combat:InCooldown() end, "Dodge",
            RunAway(self.inst, function() return self.inst.components.combat.target end, RUN_AWAY_DIST, STOP_RUN_AWAY_DIST)),
        Wander(self.inst, GetHomePos, MAX_WANDER_DIST),
    }, .25)

    self.bt = BT(self.inst, root)
end

return BoglurkerBrain
