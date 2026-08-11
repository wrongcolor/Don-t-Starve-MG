require "behaviours/wander"
require "behaviours/chaseandattack"
require "behaviours/doaction"

local MAX_WANDER_DIST = 20
local SEE_TARGET_DIST = 10
local MINE_RADIUS = 12
local COLLECT_RADIUS = 10

local function GetHomePos(inst)
    return inst.components.homeseeker ~= nil and inst.components.homeseeker.home ~= nil and inst.components.homeseeker:GetHomePos() or nil
end

local function FindRockToMine(inst)
    return FindEntity(inst, MINE_RADIUS, function(ent)
        return ent.components.workable ~= nil
            and ent.components.workable:CanBeWorked()
            and ent.components.workable:GetWorkAction() == ACTIONS.MINE
    end, { "rock" })
end

local function MineRockAction(inst)
    local rock = FindRockToMine(inst)
    return rock ~= nil and BufferedAction(inst, rock, ACTIONS.MINE) or nil
end

local MINED_LOOT_PREFABS = { rocks = true, flint = true, nitre = true, goldnugget = true }

local function FindMinedLoot(inst)
    return FindEntity(inst, COLLECT_RADIUS, function(ent) return MINED_LOOT_PREFABS[ent.prefab] end, { "_inventoryitem" })
end

local function CollectMinedLootAction(inst)
    local item = FindMinedLoot(inst)
    return item ~= nil and BufferedAction(inst, item, ACTIONS.PICKUP) or nil
end

local MinerBrain = Class(Brain, function(self, inst)
    Brain._ctor(self, inst)
end)

function MinerBrain:OnStart()
    local root = PriorityNode(
    {
        WhileNode(function() return self.inst.components.combat:HasTarget() end, "Retaliate", ChaseAndAttack(self.inst, SEE_TARGET_DIST)),
        DoAction(self.inst, MineRockAction, "MineRock"),
        DoAction(self.inst, CollectMinedLootAction, "CollectMinedLoot"),
        Wander(self.inst, GetHomePos, MAX_WANDER_DIST),
    }, .25)

    self.bt = BT(self.inst, root)
end

return MinerBrain
