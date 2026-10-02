require "behaviours/wander"
require "behaviours/follow"

local MAX_WANDER_DIST = 20
local FOLLOW_MIN_DIST = 2
local FOLLOW_TARGET_DIST = 3
local FOLLOW_MAX_DIST = 7
local ACQUIRE_DIST = 6
local LOSE_TARGET_DIST = 30

local function GetHomePos(inst)
    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil
end


local function GetFollowTarget(inst)
    local target = inst._followtarget
    if target ~= nil and (not target:IsValid() or IsEntityDeadOrGhost(target) or not inst:IsNear(target, LOSE_TARGET_DIST)) then
        target = nil
    end
    if target == nil then
        target = FindClosestPlayerToInst(inst, ACQUIRE_DIST, true)
    end
    inst._followtarget = target
    return target
end

-- Until someone walks by, drift around where it first appeared instead
-- of wandering off with no home at all.
local function GetIdleHomePos(inst)
    if inst._idlehome == nil then
        inst._idlehome = inst:GetPosition()
    end
    return inst._idlehome
end

local SunmothBrain = Class(Brain, function(self, inst)
    Brain._ctor(self, inst)
end)

function SunmothBrain:OnStart()
    local root = PriorityNode(
    {
        Follow(self.inst, function() return GetFollowTarget(self.inst) end, FOLLOW_MIN_DIST, FOLLOW_TARGET_DIST, FOLLOW_MAX_DIST),
        Wander(self.inst, GetIdleHomePos, MAX_WANDER_DIST),
    }, .25)

    self.bt = BT(self.inst, root)
end

return SunmothBrain
