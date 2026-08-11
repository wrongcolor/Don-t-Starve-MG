local Mana = Class(function(self, inst)
    self.inst = inst
    self.current = 0
    self.basemax = 100
    self.max = 100
    self.regenpersecond = nil
end)

-- Fills to full: the only caller is master_postinit at spawn, so this is
-- the character's initial mana amount, same as the game's own hunger/sanity
-- starting full. A loaded save's real amount overrides it via OnLoad right after.
function Mana:SetMax(max)
    self.basemax = max
    self.max = max
    self.current = max
    self.inst:PushEvent("manadelta")
end

-- A ONE-TIME, permanent raise to the pool's cap (e.g. ItemDef.manaBoostOnUse)
-- — distinct from SetMaxOverride below, which is temporary. Grants the same
-- amount of current mana as capacity added, so the boost is immediately
-- usable instead of just extra empty headroom. Returns false (no-op) once
-- already at the cap.
function Mana:IncreaseMaxPermanent(amount, cap)
    local newbasemax = self.basemax + amount
    if cap ~= nil then
        newbasemax = math.min(newbasemax, cap)
    end
    local delta = newbasemax - self.basemax
    if delta <= 0 then
        return false
    end
    self.basemax = newbasemax
    self.max = self.max + delta
    self.current = self.current + delta
    self.inst:PushEvent("manadelta")
    return true
end

-- A TEMPORARY override of the pool's cap (e.g. doubling it while
-- overheating) — unlike SetMax, this never force-refills current: growing
-- just opens up headroom, shrinking clamps current down if it's above the
-- new cap. Always revert with ClearMaxOverride, which restores basemax
-- (whatever it currently is, accounting for any IncreaseMaxPermanent calls
-- made in the meantime) rather than a stale pre-override value.
function Mana:SetMaxOverride(newmax)
    self.max = newmax
    self.current = math.min(self.current, self.max)
    self.inst:PushEvent("manadelta")
end

function Mana:ClearMaxOverride()
    self.max = self.basemax
    self.current = math.min(self.current, self.max)
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

-- Non-destructive counterpart to Spend, used to grey out spell wheel entries
-- the caster can't currently afford (widgets/wheel.lua's own checkenabled
-- field) without actually spending anything.
function Mana:IsEnough(amount)
    return self.current >= amount
end

function Mana:OnUpdate(dt)
    if self.regenpersecond ~= nil and self.regenpersecond > 0 then
        self:DoDelta(self.regenpersecond * dt)
    end
end

function Mana:OnSave()
    return { current = self.current, basemax = self.basemax }
end

function Mana:OnLoad(data)
    if data.basemax ~= nil then
        self.basemax = data.basemax
        self.max = data.basemax
    end
    if data.current ~= nil then
        self.current = data.current
    end
end

return Mana
