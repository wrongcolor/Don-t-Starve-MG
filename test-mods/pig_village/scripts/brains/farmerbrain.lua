require "behaviours/wander"
require "behaviours/chaseandattack"
require "behaviours/doaction"

local BrainClass = require "brain"

local MAX_WANDER_DIST = 20
local SEE_TARGET_DIST = 10
local HARVEST_RADIUS = 10

local function GetHomePos(inst)
    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil
end

local function FindCropToHarvest(inst)
    return FindEntity(inst, HARVEST_RADIUS, nil, { "readyforharvest" })
end

local function HarvestCropAction(inst)
    local crop = FindCropToHarvest(inst)
    return crop ~= nil and BufferedAction(inst, crop, ACTIONS.HARVEST) or nil
end

local FarmerBrain = Class(BrainClass, function(self, inst)
    BrainClass._ctor(self, inst)
end)

function FarmerBrain:OnStart()
    local root = PriorityNode(
    {
        WhileNode(function() return self.inst.components.combat:HasTarget() end, "Retaliate", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),
        DoAction(self.inst, HarvestCropAction, "HarvestCrop"),
        Wander(self.inst, GetHomePos, MAX_WANDER_DIST),
    }, .25)

    self.bt = BT(self.inst, root)
end

return FarmerBrain
