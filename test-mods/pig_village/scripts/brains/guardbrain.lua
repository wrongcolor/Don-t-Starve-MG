require "behaviours/wander"
require "behaviours/chaseandattack"
require "behaviours/follow"

local MAX_WANDER_DIST = 20
local SEE_TARGET_DIST = 10
local FOLLOW_MIN_DIST = 2
local FOLLOW_TARGET_DIST = 5
local FOLLOW_MAX_DIST = 9

local function GetHomePos(inst)
    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil
end


local GuardBrain = Class(Brain, function(self, inst)
    Brain._ctor(self, inst)
end)

function GuardBrain:OnStart()
    local root = PriorityNode(
    {
        WhileNode(function() return self.inst.components.combat:HasTarget() end, "Retaliate", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),
        Follow(self.inst, function() return FindClosestPlayerToInst(self.inst, 30, true) end, FOLLOW_MIN_DIST, FOLLOW_TARGET_DIST, FOLLOW_MAX_DIST),
        Wander(self.inst, GetHomePos, MAX_WANDER_DIST),
    }, .25)

    self.bt = BT(self.inst, root)
end

return GuardBrain
