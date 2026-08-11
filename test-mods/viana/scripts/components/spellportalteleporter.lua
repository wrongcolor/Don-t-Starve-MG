local SpellPortalTeleporter = Class(function(self, inst)
    self.inst = inst
    self.bufferedmapaction = nil
    self._onbufferedmapactionremoved = function()
        self.bufferedmapaction = nil
    end
end)

function SpellPortalTeleporter:OnRemoveFromEntity()
    self:CancelMapAction()
end

function SpellPortalTeleporter:OnRemoveEntity()
    self:CancelMapAction()
end

function SpellPortalTeleporter:StartMapAction(doer)
    if self.bufferedmapaction ~= nil then
        return false
    end

    self.bufferedmapaction = SpawnPrefab("bufferedmapaction")
    self.inst:ListenForEvent("onremove", self._onbufferedmapactionremoved, self.bufferedmapaction)
    self.bufferedmapaction:SetupMapAction(ACTIONS.SPELLPORTAL_MAP, self.inst, doer)
    return true
end

function SpellPortalTeleporter:CancelMapAction()
    if self.bufferedmapaction ~= nil then
        self.bufferedmapaction:Remove()
        self.bufferedmapaction = nil
    end
end

function SpellPortalTeleporter:Activate(doer, x, z)
    self:CancelMapAction()

    if doer.Physics ~= nil then
        doer.Physics:Teleport(x, 0, z)
    else
        doer.Transform:SetPosition(x, 0, z)
    end

    if doer.SoundEmitter ~= nil then
        doer.SoundEmitter:PlaySound("dontstarve/common/teleportworm/swallow")
    end

    if doer.SnapCamera ~= nil then
        doer:SnapCamera()
    end

    self.inst:Remove()
    return true
end

return SpellPortalTeleporter
