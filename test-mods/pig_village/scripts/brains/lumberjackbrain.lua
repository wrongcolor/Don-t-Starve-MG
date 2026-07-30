require "behaviours/wander"
require "behaviours/chaseandattack"
require "behaviours/doaction"

local BrainClass = require "brain"

local MAX_WANDER_DIST = 20
local SEE_TARGET_DIST = 10
local CHOP_RADIUS = 12
local COLLECT_RADIUS = 10

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

local CHOPPED_LOOT_PREFABS = { log = true, twigs = true, pinecone = true, twiggy_nut = true }

local function FindChoppedLoot(inst)
    return FindEntity(inst, COLLECT_RADIUS, function(ent) return CHOPPED_LOOT_PREFABS[ent.prefab] end, { "_inventoryitem" })
end

local function CollectChoppedLootAction(inst)
    local item = FindChoppedLoot(inst)
    return item ~= nil and BufferedAction(inst, item, ACTIONS.PICKUP) or nil
end

local LumberjackBrain = Class(BrainClass, function(self, inst)
    BrainClass._ctor(self, inst)
end)

function LumberjackBrain:OnStart()
    local root = PriorityNode(
    {
        WhileNode(function() return self.inst.components.combat:HasTarget() end, "Retaliate", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),
        DoAction(self.inst, ChopTreeAction, "ChopTree"),
        DoAction(self.inst, CollectChoppedLootAction, "CollectChoppedLoot"),
        Wander(self.inst, GetHomePos, MAX_WANDER_DIST),
    }, .25)

    self.bt = BT(self.inst, root)
end

return LumberjackBrain
