require "behaviours/wander"
require "behaviours/chaseandattack"

local MAX_WANDER_DIST = 20
local SEE_TARGET_DIST = 10

local function GetHomePos(inst)
    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil
end


local SunorbBrain = Class(Brain, function(self, inst)
    Brain._ctor(self, inst)
end)

function SunorbBrain:OnStart()
    local root = PriorityNode(
    {
        WhileNode(function() return self.inst.components.combat:HasTarget() end, "Retaliate", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),
    }, .25)

    self.bt = BT(self.inst, root)
end

return SunorbBrain
