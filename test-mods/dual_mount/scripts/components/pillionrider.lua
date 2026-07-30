local PillionRider = Class(function(self, inst)
    self.inst = inst
    self.mount = nil
end)

function PillionRider:SetMount(mount)
    self.mount = mount
end

function PillionRider:Dismount()
    if self.mount ~= nil and self.mount.components.pillion ~= nil then
        self.mount.components.pillion:RemovePassenger()
    end
end

return PillionRider
