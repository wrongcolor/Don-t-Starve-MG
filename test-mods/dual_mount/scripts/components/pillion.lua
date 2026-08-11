-- Tune these two if the passenger still looks too close/off-angle — pure
-- cosmetics, safe to tweak freely (doesn't touch the driver's own position,
-- see this file's SetPassenger comment for why that side is left alone).
local SEAT_ANGLE_OFFSET_DEG = 100 -- to the driver's side, relative to their own facing
local SEAT_DISTANCE = 1.8

local function IsMovingStateName(statename)
    return statename ~= nil and (statename:find("run") ~= nil or statename:find("dash") ~= nil)
end

-- Reproduced in-game: real vanilla mounting (components/rider.lua) always
-- parents the MOUNT (a plain creature, never independently simulated by any
-- client) under the DRIVER — never the other way around. Our passenger is a
-- full player with their OWN client-side movement prediction/camera running
-- independently; forcing their Transform to become a CHILD of another entity
-- (driver:AddChild(rider), tried earlier) fights that prediction and was the
-- real cause of the passenger's client crashing on mount. Fix: never parent
-- the passenger at all — just keep teleporting them next to the driver every
-- frame, the same plain Physics:Teleport already used elsewhere in this file
-- for a normal, one-off reposition (nothing structurally different about
-- doing it repeatedly).
local function GetSeatPosition(driver)
    local x, y, z = driver.Transform:GetWorldPosition()
    local rot = driver.Transform:GetRotation()
    local offset = Vector3FromTheta(math.rad(rot + SEAT_ANGLE_OFFSET_DEG), SEAT_DISTANCE)
    return x + offset.x, y, z + offset.z, rot
end

local Pillion = Class(function(self, inst)
    self.inst = inst
    self.passenger = nil
    self.driver = nil

    -- "pillion_hasdriver" is a plain tag (always replicated to everyone,
    -- unlike inst.components/classified data) reflecting whether this mount
    -- currently has a driver. modmain.lua's own /pillion command finds
    -- candidate mounts with GLOBAL.TheSim:FindEntities(..., {"pillion_hasdriver"})
    -- entirely server-side, so this tag only needs to be correct on the
    -- server — no client-visibility concerns for it at all.
    self.inst:ListenForEvent("riderchanged", function(_, data)
        if data ~= nil and data.newrider ~= nil then
            self.inst:AddTag("pillion_hasdriver")
        else
            self.inst:RemoveTag("pillion_hasdriver")
        end
    end)
end)

function Pillion:CanAcceptPassenger(doer)
    local rideable = self.inst.components.rideable
    local driver = rideable ~= nil and rideable:GetRider() or nil
    return driver ~= nil
        and self.passenger == nil
        and doer ~= driver
        and doer.components.pillionrider == nil
        and doer.components.rider ~= nil
        and not doer.components.rider:IsRiding()
end

function Pillion:_MirrorDriverState(data)
    if self.passenger == nil or self.passenger.sg == nil then
        return
    end

    local wantstate = IsMovingStateName(data.statename) and "pillion_moving" or "pillion_idle"
    if self.passenger.sg.currentstate == nil or self.passenger.sg.currentstate.name ~= wantstate then
        self.passenger.sg:GoToState(wantstate)
    end
end

function Pillion:SetPassenger(rider)
    local driver = self.inst.components.rideable:GetRider()
    assert(driver ~= nil)

    self.passenger = rider
    self.driver = driver

    -- Reproduced in-game: "wilsonbeefalo" alone (no ApplyBuildOverrides) is
    -- the real, generic riding-pose bank any character uses to ride ANY
    -- mount (components/rider.lua sets exactly this on the DRIVER too,
    -- before ApplyBuildOverrides ever runs). ApplyBuildOverrides itself
    -- (wobybig.lua) is a DIFFERENT thing — it overlays Woby's own body build
    -- (AddOverrideBuild(base_build), her real skin/fur symbols) onto whoever
    -- calls it, meant only for the actual driver sitting exactly in her
    -- saddle position. Calling it a second time for the passenger (sitting
    -- off to the side, not in that position) painted Woby's own body symbols
    -- onto the passenger too — the "second Woby" the passenger saw. Simply
    -- not calling it for the passenger fixes that; the plain riding pose
    -- bank is all a seat that isn't the actual saddle needs.
    rider.AnimState:SetBank("wilsonbeefalo")
    rider.Transform:SetSixFaced()

    rider:AddComponent("pillionrider")
    rider.components.pillionrider:SetMount(self.inst)

    rider.sg:GoToState("pillion_idle")

    -- Not parented (see this file's own top comment for why) — just
    -- teleported next to the driver every frame instead. Also stops the
    -- passenger's own locomotor each tick so they can't walk out from
    -- under the seat on their own.
    --
    -- Reproduced in-game: unconditionally calling Physics:Teleport/
    -- SetRotation every single frame (even while the driver stands still)
    -- made the passenger's own right-click-on-self action need several
    -- attempts before it registered — plausibly fighting with the action/
    -- click validation pipeline, which likely re-checks position/facing.
    --
    -- Gating on whether the DESIRED seat position had changed (an earlier
    -- version of this code) broke seat-holding instead: while the driver
    -- stood still, the desired position never changed, so nothing corrected
    -- the passenger's own client-predicted movement and they could freely
    -- walk off — only snapping back once the driver moved again and the
    -- desired position finally changed. Comparing against the rider's own
    -- CURRENT position instead fixes both: no corrective write (and no
    -- fighting with the click pipeline) while the passenger is already
    -- exactly seated, but any drift — from the passenger trying to walk, or
    -- the driver moving — gets corrected every tick until it's gone.
    local EPSILON = 0.01
    self._onupdateseat = function()
        if not (driver:IsValid() and rider:IsValid()) then
            return
        end
        if rider.components.locomotor ~= nil then
            rider.components.locomotor:Stop()
        end
        local x, y, z, rot = GetSeatPosition(driver)
        local rx, ry, rz = rider.Transform:GetWorldPosition()
        if math.abs(rx - x) > EPSILON or math.abs(ry - y) > EPSILON or math.abs(rz - z) > EPSILON then
            rider.Physics:Teleport(x, y, z)
        end
        local rrot = rider.Transform:GetRotation()
        local rotdiff = (rot - rrot + 180) % 360 - 180
        if math.abs(rotdiff) > 0.1 then
            rider.Transform:SetRotation(rot)
        end
    end
    self._seattask = rider:DoPeriodicTask(FRAMES, self._onupdateseat)

    self._ondriverstate = function(_, data) self:_MirrorDriverState(data) end
    self._ondriverremoved = function() self:RemovePassenger() end
    self._onriderchanged = function(_, data)
        if data == nil or data.newrider == nil then
            self:RemovePassenger()
        end
    end
    self._onpassengerremoved = function() self:RemovePassenger() end

    driver:ListenForEvent("newstate", self._ondriverstate)
    driver:ListenForEvent("onremove", self._ondriverremoved)
    self.inst:ListenForEvent("riderchanged", self._onriderchanged)
    rider:ListenForEvent("onremove", self._onpassengerremoved)

    self.inst:PushEvent("passengerchanged", { passenger = rider })
end

function Pillion:RemovePassenger()
    local rider = self.passenger
    if rider == nil then
        return
    end

    local driver = self.driver
    self.passenger = nil
    self.driver = nil

    if self._seattask ~= nil then
        self._seattask:Cancel()
        self._seattask = nil
    end
    self._onupdateseat = nil

    if driver ~= nil then
        driver:RemoveEventCallback("newstate", self._ondriverstate)
        driver:RemoveEventCallback("onremove", self._ondriverremoved)
    end
    self.inst:RemoveEventCallback("riderchanged", self._onriderchanged)
    self._ondriverstate = nil
    self._ondriverremoved = nil
    self._onriderchanged = nil

    if rider:IsValid() then
        rider:RemoveEventCallback("onremove", self._onpassengerremoved)
        self._onpassengerremoved = nil

        rider.Transform:SetFourFaced()
        -- Confirmed against the real components/rider.lua (Rider:ActualDismount):
        -- this is hardcoded to "wilson" for every character, not the rider's own
        -- prefab id. "wilson" is the shared base humanoid animation SKELETON every
        -- survivor character animates on; the character-specific look comes from
        -- the AnimState BUILD (never touched here), which is untouched by any of
        -- this. A previous version of this code guessed SetBank(rider.prefab)
        -- instead, which is wrong for anyone but Wilson himself — most prefab
        -- names aren't valid animation banks at all, so the AnimState had nothing
        -- to render, which is why the passenger came back fully invisible.
        rider.AnimState:SetBank("wilson")

        local anchor = (driver ~= nil and driver:IsValid()) and driver or self.inst
        local x, y, z = anchor.Transform:GetWorldPosition()
        if rider.Physics ~= nil then
            rider.Physics:Teleport(x, y, z)
        else
            rider.Transform:SetPosition(x, y, z)
        end

        if rider.sg ~= nil then
            rider.sg:GoToState("idle")
        end

        if rider.components.pillionrider ~= nil then
            rider:RemoveComponent("pillionrider")
        end
    end

    self.inst:PushEvent("passengerchanged", { passenger = nil })
end

function Pillion:OnRemoveFromEntity()
    self:RemovePassenger()
end

return Pillion
