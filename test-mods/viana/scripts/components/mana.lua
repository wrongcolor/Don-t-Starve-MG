local Mana = Class(function(self, inst)
    self.inst = inst
    self.current = 0
    self.max = 100
    self.regenpersecond = nil
end)

-- Fills to full: the only caller is master_postinit at spawn, so this is
-- the character's initial mana amount, same as the game's own hunger/sanity
-- starting full. A loaded save's real amount overrides it via OnLoad right after.
function Mana:SetMax(max)
    self.max = max
    self.current = max
    self.inst:PushEvent("manadelta")
end

function Mana:SetRegenRate(regenpersecond)
    self.regenpersecond = regenpersecond
    if regenpersecond ~= nil and regenpersecond > 0 then
        self.inst:StartUpdatingComponent(self)
    end
end

function Mana:GetPercent()
    return self.max > 0 and (self.current / self.max) or 0
end

function Mana:DoDelta(delta)
    self.current = math.clamp(self.current + delta, 0, self.max)
    self.inst:PushEvent("manadelta")
end

function Mana:Spend(amount)
    if self.current < amount then
        return false
    end
    self:DoDelta(-amount)
    return true
end

function Mana:OnUpdate(dt)
    if self.regenpersecond ~= nil and self.regenpersecond > 0 then
        self:DoDelta(self.regenpersecond * dt)
    end
end

function Mana:OnSave()
    return { current = self.current }
end

function Mana:OnLoad(data)
    if data.current ~= nil then
        self.current = data.current
    end
end

return Mana
