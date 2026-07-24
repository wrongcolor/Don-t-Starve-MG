import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { generateManaComponentFile, generateManaBadgeWidgetFile } from '../../generators/mana'

describe('generateManaComponentFile', () => {
  const code = generateManaComponentFile()

  it('exposes SetMax/SetRegenRate/GetPercent/DoDelta/Spend, and returns the Class', () => {
    expect(code).toContain('function Mana:SetMax(max)')
    expect(code).toContain('function Mana:SetRegenRate(regenpersecond)')
    expect(code).toContain('function Mana:GetPercent()')
    expect(code).toContain('function Mana:DoDelta(delta)')
    expect(code).toContain('function Mana:Spend(amount)')
    expect(code).toContain('return Mana')
  })

  it('only starts updating (regen ticks) when a positive regen rate is set', () => {
    expect(code).toContain('self.inst:StartUpdatingComponent(self)')
    expect(code).toContain('regenpersecond ~= nil and regenpersecond > 0')
  })

  it('Spend fails without consuming when there is not enough mana', () => {
    expect(code).toContain('if self.current < amount then')
    expect(code).toContain('return false')
  })

  it('SetMax fills current to the new max, so a freshly spawned character starts full', () => {
    expect(code).toContain('self.current = max')
    expect(code).not.toContain('math.min(self.current, self.max)')
  })

  it('persists current mana across save/load', () => {
    expect(code).toContain('function Mana:OnSave()')
    expect(code).toContain('function Mana:OnLoad(data)')
  })

  it('is valid Lua', () => {
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })
})

describe('generateManaBadgeWidgetFile', () => {
  const code = generateManaBadgeWidgetFile()

  it('extends the base game\'s own generic widgets/badge, no bespoke art required', () => {
    expect(code).toContain('require("widgets/badge")')
    expect(code).toContain('Class(Badge, function(self, owner)')
    expect(code).toContain('Badge._ctor(self, nil, owner,')
    expect(code).toContain('return ManaBadge')
  })

  it('is valid Lua', () => {
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })
})
