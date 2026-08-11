require "behaviours/wander"

local MAX_WANDER_DIST = 20

local function GetHomePos(inst)
    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil
end

local SolarpillarBrain = Class(Brain, function(self, inst)
    Brain._ctor(self, inst)
end)

function SolarpillarBrain:OnStart()
    local root = PriorityNode(
    {
    }, .25)

    self.bt = BT(self.inst, root)
end

return SolarpillarBrain
