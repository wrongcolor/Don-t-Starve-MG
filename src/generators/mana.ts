// Confirmed against a real published character mod's own "fear" component
// (a from-scratch resource, not a vanilla mechanic) — a custom component is
// just a plain Class returned from scripts/components/<name>.lua; the engine
// resolves AddComponent("mana") to that file automatically, no registration
// call needed. Regen is opt-in (StartUpdatingComponent only when a rate is
// actually set) — same "only tick what you configured" idiom already used
// by sleepingbag/tameBomb elsewhere in this tool. Shared by every character
// with CharacterDef.mana set, so it's generated once per mod, not per
// character (see zipBuilder.ts).
export function generateManaComponentFile(): string {
  return `local Mana = Class(function(self, inst)
    self.inst = inst
    self.current = 0
    self.max = 100
    self.regenpersecond = nil
end)

function Mana:SetMax(max)
    self.max = max
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
`
}

// Confirmed in the same real character mod: the badge itself just extends the
// base game's own generic widgets/badge (the same class health/hunger/sanity
// badges use) with a custom tint — no bespoke art required, unlike Wigfrid's
// dedicated inspirationbadge.lua. Shared by every character with mana, same as
// the component above.
export function generateManaBadgeWidgetFile(): string {
  return `local Badge = require("widgets/badge")

local ManaBadge = Class(Badge, function(self, owner)
    Badge._ctor(self, nil, owner, { 0.3, 0.5, 1, 1 }, nil, nil, nil, true)
end)

return ManaBadge
`
}
