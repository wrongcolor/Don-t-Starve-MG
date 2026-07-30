local SEAT_OFFSET = { x = -1.3, z = 0 }

local function IsMovingStateName(statename)
    return statename ~= nil and (statename:find("run") ~= nil or statename:find("dash") ~= nil)
end

local Pillion = Class(function(self, inst)
    self.inst = inst
    self.passenger = nil
    self.driver = nil
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

    rider.AnimState:SetBank("wilsonbeefalo")
    if self.inst.ApplyBuildOverrides ~= nil then
        self.inst:ApplyBuildOverrides(rider.AnimState)
    end

    driver:AddChild(rider)
    rider.Transform:SetPosition(SEAT_OFFSET.x, 0, SEAT_OFFSET.z)
    rider.Transform:SetRotation(0)
    rider.Transform:SetSixFaced()
    rider:RemoveFromScene()

    rider:AddComponent("pillionrider")
    rider.components.pillionrider:SetMount(self.inst)

    rider.sg:GoToState("pillion_idle")

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

        if driver ~= nil then
            driver:RemoveChild(rider)
        end
        rider:ReturnToScene()
        rider.Transform:SetFourFaced()

        if self.inst.ClearBuildOverrides ~= nil then
            self.inst:ClearBuildOverrides(rider.AnimState)
        end
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
