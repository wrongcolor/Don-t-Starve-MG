local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local ACTIONS = GLOBAL.ACTIONS
local State = GLOBAL.State

PrefabFiles = { "twinsteed" }

GLOBAL.TUNING.TWINSTEED_WALKSPEED = 4
GLOBAL.TUNING.TWINSTEED_RUNSPEED = 7

STRINGS.NAMES.TWINSTEED = "Twinsteed"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TWINSTEED = "Tem espaco pra dois."

local RIDE_PILLION = AddAction("RIDE_PILLION", "Sentar na garupa", function(act)
    if act.target ~= nil and act.target.components.pillion ~= nil and act.target.components.pillion:CanAcceptPassenger(act.doer) then
        act.target.components.pillion:SetPassenger(act.doer)
        return true
    end
    return false
end)
RIDE_PILLION.rmb = true
RIDE_PILLION.instant = true

local DISMOUNT_PILLION = AddAction("DISMOUNT_PILLION", "Descer da garupa", function(act)
    if act.doer.components.pillionrider ~= nil then
        act.doer.components.pillionrider:Dismount()
        return true
    end
    return false
end)
DISMOUNT_PILLION.rmb = true
DISMOUNT_PILLION.instant = true

AddComponentAction("SCENE", "pillion", function(inst, doer, actions, right)
    if right and inst.components.pillion:CanAcceptPassenger(doer) then
        table.insert(actions, ACTIONS.RIDE_PILLION)
    end
end)

AddComponentAction("SCENE", "pillionrider", function(inst, doer, actions, right)
    if inst == doer then
        table.insert(actions, ACTIONS.DISMOUNT_PILLION)
    end
end)

AddStategraphState("wilson", State{
    name = "pillion_idle",
    tags = { "busy", "canrotate" },

    onenter = function(inst)
        inst.AnimState:PlayAnimation("idle_loop", true)
    end,
})

AddStategraphState("wilson", State{
    name = "pillion_moving",
    tags = { "busy", "moving", "canrotate" },

    onenter = function(inst)
        inst.AnimState:PlayAnimation("run_loop", true)
    end,
})
