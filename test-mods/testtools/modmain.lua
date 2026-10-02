-- Dev-only testing convenience: always day, and no hunger/sanity/health loss,
-- so spell/mod testing never gets interrupted by starving, going insane, or
-- dying. Only ever enabled on the local, disposable ModTestCluster test
-- server (see scripts/test-mod-server.ps1) - never meant to be shipped, and
-- never enabled alongside a real save.
--
-- Confirmed real APIs, all server-only (ismastersim-gated):
-- - components/clock.lua listens for the real world event "ms_setclocksegs"
--   ({day, dusk, night}, must sum to the real NUM_SEGS = 16) and reassigns
--   the day/dusk/night segment counts from it - {day = 16, dusk = 0,
--   night = 0} makes every one of the 16 segments "day", forever.
-- - components/hunger.lua's own Hunger:Pause()/Resume() (same real method
--   this project's own character.ts already uses for pauseHungerDuringDay).
-- - components/sanity.lua has no Pause() equivalent, but self.rate_modifier
--   is a plain public field (default 1) multiplied into the computed rate
--   right before DoDelta ever runs - no dedicated setter exists, direct
--   assignment is the real, idiomatic way to use it (matches how wendy.lua
--   itself sets sibling fields like night_drain_mult/neg_aura_mult).
-- - components/health.lua's own Health:SetInvincible(val).

AddPrefabPostInit("world", function(inst)
    if not GLOBAL.TheWorld.ismastersim then
        return
    end
    -- Next tick: the clock component's own "ms_setclocksegs" listener is
    -- registered as part of the world's own construction, but giving it one
    -- frame margin avoids depending on exactly when in that construction
    -- order this postinit itself fires.
    inst:DoTaskInTime(0, function()
        inst:PushEvent("ms_setclocksegs", { day = 16, dusk = 0, night = 0 })
    end)
end)

AddPlayerPostInit(function(inst)
    if not GLOBAL.TheWorld.ismastersim then
        return
    end
    inst:DoTaskInTime(0, function()
        if inst.components.hunger ~= nil then
            inst.components.hunger:Pause()
        end
        if inst.components.sanity ~= nil then
            inst.components.sanity.rate_modifier = 0
        end
        if inst.components.health ~= nil then
            inst.components.health:SetInvincible(true)
        end
    end)
end)
