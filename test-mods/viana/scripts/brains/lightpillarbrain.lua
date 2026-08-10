require "behaviours/wander"

local BrainClass = require "brain"

local MAX_WANDER_DIST = 20

local function GetHomePos(inst)
    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil
end

local LightpillarBrain = Class(BrainClass, function(self, inst)
    BrainClass._ctor(self, inst)
end)

function LightpillarBrain:OnStart()
    local root = PriorityNode(
    {
    }, .25)

    self.bt = BT(self.inst, root)
end

return LightpillarBrain
