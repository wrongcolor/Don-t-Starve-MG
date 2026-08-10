require "behaviours/wander"
require "behaviours/panic"
require "behaviours/doaction"
require "behaviours/follow"

local BrainClass = require "brain"

local MAX_WANDER_DIST = 20
local CHOP_RADIUS = 12
local COLLECT_RADIUS = 10
local FOLLOW_MIN_DIST = 2
local FOLLOW_TARGET_DIST = 5
local FOLLOW_MAX_DIST = 9

local function GetHomePos(inst)
    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil
end

local function FindTreeToChop(inst)
    return FindEntity(inst, CHOP_RADIUS, function(ent)
        return ent.components.workable ~= nil
            and ent.components.workable:CanBeWorked()
            and ent.components.workable:GetWorkAction() == ACTIONS.CHOP
    end, { "tree" })
end

local function ChopTreeAction(inst)
    local tree = FindTreeToChop(inst)
    return tree ~= nil and BufferedAction(inst, tree, ACTIONS.CHOP) or nil
end

local NO_PICKUP_TAGS = { "FX", "NOCLICK", "DECOR", "INLIMBO", "outofreach" }

local function FindLooseItem(inst)
    return FindEntity(inst, COLLECT_RADIUS, nil, { "_inventoryitem" }, NO_PICKUP_TAGS)
end

local function CollectItemAction(inst)
    local item = FindLooseItem(inst)
    return item ~= nil and BufferedAction(inst, item, ACTIONS.PICKUP) or nil
end

local MeadowhopperBrain = Class(BrainClass, function(self, inst)
    BrainClass._ctor(self, inst)
end)

function MeadowhopperBrain:OnStart()
    local root = PriorityNode(
    {
        WhileNode(function() return self.inst.components.health.takingfiredamage end, "FirePanic", Panic(self.inst)),
        DoAction(self.inst, ChopTreeAction, "ChopTree"),
        DoAction(self.inst, CollectItemAction, "CollectItem"),
        Follow(self.inst, function() return FindClosestPlayerToInst(self.inst, 30, true) end, FOLLOW_MIN_DIST, FOLLOW_TARGET_DIST, FOLLOW_MAX_DIST),
        Wander(self.inst, GetHomePos, MAX_WANDER_DIST),
    }, .25)

    self.bt = BT(self.inst, root)
end

return MeadowhopperBrain
