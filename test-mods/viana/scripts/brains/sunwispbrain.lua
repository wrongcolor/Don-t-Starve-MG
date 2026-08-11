require "behaviours/wander"
require "behaviours/follow"

local MAX_WANDER_DIST = 20
local FOLLOW_MIN_DIST = 2
local FOLLOW_TARGET_DIST = 4
local FOLLOW_MAX_DIST = 8

local function GetHomePos(inst)
    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil
end


local SunwispBrain = Class(Brain, function(self, inst)
    Brain._ctor(self, inst)
end)

function SunwispBrain:OnStart()
    local root = PriorityNode(
    {
        Follow(self.inst, function() return FindClosestPlayerToInst(self.inst, 30, true) end, FOLLOW_MIN_DIST, FOLLOW_TARGET_DIST, FOLLOW_MAX_DIST),
        Wander(self.inst, GetHomePos, MAX_WANDER_DIST),
    }, .25)

    self.bt = BT(self.inst, root)
end

return SunwispBrain
