local ACTIONS = GLOBAL.ACTIONS
local State = GLOBAL.State

-- Confirmed against the real prefabs/wobybig.lua (the grown, rideable stage —
-- wobysmall isn't rideable, canride only ever gets set on this one): adds the
-- second seat directly onto her, instead of a separate prototype creature.
-- AddComponent("pillion") is the ONLY thing this needs — pillion.lua reads
-- self.inst.components.rideable (already there, real) and, for the driver's
-- own visuals, rideable/rider.lua already calls target:ApplyBuildOverrides
-- and target:ClearBuildOverrides on any mount that defines them — wobybig.lua
-- already defines both (for her own reins overlay), so pillion.lua's own
-- "if self.inst.ApplyBuildOverrides ~= nil then ... end" calls pick those up
-- automatically for the PASSENGER's seat too, no changes needed there.
AddPrefabPostInit("wobybig", function(inst)
    -- GLOBAL.TheWorld (unlike GLOBAL.ACTIONS/GLOBAL.State above) doesn't exist
    -- yet while modmain.lua itself is loading — it's only assigned once a
    -- world is actually created/loaded, so it must be read fresh here at
    -- call time, not cached into a top-level local (that would freeze a nil
    -- forever). Confirmed against the TS generator's own modmain.ts, which
    -- always writes "GLOBAL.TheWorld.ismastersim" inline for this exact reason.
    if not GLOBAL.TheWorld.ismastersim then
        return
    end
    inst:AddComponent("pillion")
end)

local DISMOUNT_PILLION = AddAction("DISMOUNT_PILLION", "Descer da garupa", function(act)
    if act.doer.components.pillionrider ~= nil then
        act.doer.components.pillionrider:Dismount()
        return true
    end
    return false
end)
DISMOUNT_PILLION.rmb = true
DISMOUNT_PILLION.instant = true

-- Self-targeting works fine through the normal right-click menu — clicking
-- yourself never has the "who's actually clickable" problem below, since
-- you're always fully visible to yourself. No changes needed here.
AddComponentAction("SCENE", "pillionrider", function(inst, doer, actions, right)
    if inst == doer then
        table.insert(actions, ACTIONS.DISMOUNT_PILLION)
    end
end)

-- Reproduced in-game (confirmed against components/rider.lua): mounting a
-- creature calls :RemoveFromScene() on the MOUNT itself (same technique this
-- mod's own SetPassenger uses for the passenger) — so once someone's riding,
-- the Woby is no longer independently clickable; only the RIDER is, since the
-- rider becomes the "parent" via AddChild. A right-click menu action targeting
-- "whichever entity is under the cursor" therefore can only ever resolve to
-- the RIDER, and — also confirmed in-game — the SCENE dispatch system's own
-- client/server split made this genuinely unreliable to wire correctly (multiple
-- attempts using tags + a custom net_entity reference on the rider never
-- produced a working right-click option in practice, despite matching the
-- real "rideable" SCENE handler's own documented approach).
--
-- Sidesteps the whole click-targeting problem: a slash command runs entirely
-- SERVER-SIDE (serverfn) with `caller` as the real player entity — no client/
-- server visibility split, no classified data, no netvar replication timing
-- to get wrong. The passenger just types /pillion while standing near a
-- mounted Woby.
AddUserCommand("pillion", {
    prettyname = "Sentar na garupa",
    desc = "Senta na garupa de uma montaria por perto que já tem condutor.",
    permission = GLOBAL.COMMAND_PERMISSION.USER,
    slash = true,
    usermenu = false,
    servermenu = false,
    params = {},
    vote = false,
    serverfn = function(params, caller)
        if caller == nil or caller.Transform == nil then
            return
        end
        local x, y, z = caller.Transform:GetWorldPosition()
        local ents = GLOBAL.TheSim:FindEntities(x, y, z, 6, { "pillion_hasdriver" })
        for _, mount in ipairs(ents) do
            if mount.components.pillion ~= nil and mount.components.pillion:CanAcceptPassenger(caller) then
                mount.components.pillion:SetPassenger(caller)
                return
            end
        end
    end,
})

-- Reproduced in-game (likely cause of the world-ending disconnect the
-- passenger hit right when SetPassenger first actually ran): "wilson" is the
-- SERVER-side player stategraph, but scripts/stategraphs/SGwilson_client.lua
-- is a SEPARATE, real client-side prediction stategraph — confirmed via its
-- own `return StateGraph("wilson_client", ...)`. Registering pillion_idle/
-- pillion_moving only on "wilson" left the PASSENGER's own client with no
-- such state in its prediction stategraph the moment rider.sg:GoToState
-- (pillion.lua) tried to enter it — the same client/server split that's
-- caused every other bug in this mod, just manifesting as a hard
-- disconnect/crash instead of a catchable Lua error this time. Fix: register
-- both states on both stategraphs, exactly like this project's own
-- AddStategraphActionHandler("wilson"/"wilson_client", ...) pattern already
-- does for actions.
-- Reproduced in-game: "busy" (widely used across this game for eating/
-- crafting/etc.) blocks the player from executing ANY action while tagged
-- with it — including the passenger's own DISMOUNT_PILLION, which is
-- confirmed as why "Descer da garupa" showed up in the menu but clicking it
-- did nothing at all. Dropped from both states — "canrotate" alone is
-- already what stops them from freely walking off (their own locomotor is
-- also actively stopped every tick in pillion.lua).
for _, sg in ipairs({ "wilson", "wilson_client" }) do
    AddStategraphState(sg, State{
        name = "pillion_idle",
        tags = { "canrotate" },

        onenter = function(inst)
            inst.AnimState:PlayAnimation("idle_loop", true)
        end,
    })

    AddStategraphState(sg, State{
        name = "pillion_moving",
        tags = { "moving", "canrotate" },

        onenter = function(inst)
            inst.AnimState:PlayAnimation("run_loop", true)
        end,
    })
end
