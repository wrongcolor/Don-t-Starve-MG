import { describe, it, expect } from 'vitest'
import { generateItemFiles, generateItemPrefab } from '../../generators/item'
import { itemDefSchema } from '../../types/modProject'
import { sampleProject } from '../fixtures'

describe('generateItemFiles', () => {
  const [sword, structure, trinket, axe, firestaff] = sampleProject.items

  it('checks TheWorld.ismastersim right after SetPristine, before server components', () => {
    const code = generateItemPrefab(sword)
    const pristineIdx = code.indexOf('inst.entity:SetPristine()')
    const ismastersimIdx = code.indexOf('if not TheWorld.ismastersim then')
    const componentIdx = code.indexOf('inst:AddComponent("inventoryitem")')

    expect(pristineIdx).toBeGreaterThan(-1)
    expect(ismastersimIdx).toBeGreaterThan(pristineIdx)
    expect(componentIdx).toBeGreaterThan(ismastersimIdx)
  })

  it('only generates a placer prefab file when recipe.placer is true', () => {
    const swordFiles = generateItemFiles(sword)
    expect(Object.keys(swordFiles)).toEqual(['scripts/prefabs/testsword.lua'])

    const structureFiles = generateItemFiles(structure)
    expect(Object.keys(structureFiles).sort()).toEqual(
      ['scripts/prefabs/teststructure.lua', 'scripts/prefabs/teststructure_placer.lua'].sort(),
    )
  })

  it('wires weapon/finiteuses components to TUNING-driven values', () => {
    const code = generateItemPrefab(sword)
    expect(code).toContain('inst:AddComponent("weapon")')
    expect(code).toContain('inst.components.weapon:SetDamage(TUNING.TESTSWORD_DAMAGE)')
    expect(code).toContain('inst:AddComponent("finiteuses")')
  })

  it('defaults to a custom build named after the item id when no animation is chosen', () => {
    const code = generateItemPrefab(sword)
    expect(code).toContain('Asset("ANIM", "anim/testsword.zip")')
    expect(code).toContain('inst.AnimState:SetBank("testsword")')
    expect(code).toContain('inst.AnimState:SetBuild("testsword")')
  })

  it('reuses a vanilla build without declaring an ANIM asset when animation.source is vanilla', () => {
    const code = generateItemPrefab(trinket)
    expect(code).not.toContain('Asset("ANIM"')
    expect(code).toContain('inst.AnimState:SetBank("trinket_1")')
    expect(code).toContain('inst.AnimState:SetBuild("trinket_1")')
    expect(code).toContain('Asset("INV_IMAGE", "testtrinket")')
  })

  it('wires the tool component + SetAction for tool-category items, and ties finiteuses consumption to that action', () => {
    const code = generateItemPrefab(axe)
    expect(code).toContain('inst:AddComponent("tool")')
    expect(code).toContain('inst.components.tool:SetAction(ACTIONS.CHOP)')
    expect(code).toContain('inst.components.finiteuses:SetConsumption(ACTIONS.CHOP, 1)')
  })

  it('generates equippable + swap_object handling and a separate swap build asset for handheld items (tool or weapon)', () => {
    const axeCode = generateItemPrefab(axe)
    expect(axeCode).toContain('inst:AddComponent("equippable")')
    expect(axeCode).toContain('inst.components.equippable:SetOnEquip(onequip)')
    expect(axeCode).toContain('inst.components.equippable:SetOnUnequip(onunequip)')
    expect(axeCode).toContain('owner.AnimState:OverrideSymbol("swap_object", "swap_testaxe", "swap_testaxe")')
    expect(axeCode).toContain('Asset("ANIM", "anim/swap_testaxe.zip")')

    const swordCode = generateItemPrefab(sword)
    expect(swordCode).toContain('inst:AddComponent("equippable")')
    expect(swordCode).toContain('Asset("ANIM", "anim/swap_testsword.zip")')

    expect(generateItemPrefab(trinket)).not.toContain('equippable')
  })

  it('warns when a handheld item reuses a vanilla build, instead of assuming a swap build exists', () => {
    const vanillaAxe = {
      ...axe,
      animation: { source: 'vanilla' as const, build: 'trinket_1' },
    }
    const code = generateItemPrefab(vanillaAxe)
    expect(code).toContain('ATENÇÃO')
    expect(code).toContain('swap_trinket_1')
  })

  it('requires toolAction when category is tool', () => {
    const withoutAction = { ...axe, toolAction: undefined }
    const result = itemDefSchema.safeParse(withoutAction)
    expect(result.success).toBe(false)

    const withAction = itemDefSchema.safeParse(axe)
    expect(withAction.success).toBe(true)
  })

  it('flags finiteuses.ignoreCombatDurabilityLoss when set', () => {
    const code = generateItemPrefab(axe)
    expect(code).toContain('inst.components.finiteuses:SetIgnoreCombatDurabilityLoss(true)')
  })

  it('wires a ranged weapon: SetRange, SetProjectile, and TUNING range constants', () => {
    const code = generateItemPrefab(firestaff)
    expect(code).toContain('inst.components.weapon:SetRange(TUNING.TESTFIRESTAFF_MIN_RANGE, TUNING.TESTFIRESTAFF_MAX_RANGE)')
    expect(code).toContain('inst.components.weapon:SetProjectile("fire_projectile")')
  })

  it('combines sanity cost and on-hit effect into a single onattack callback', () => {
    const code = generateItemPrefab(firestaff)
    expect(code).toContain('local function onattack(inst, attacker, target)')
    expect(code).toContain('attacker.components.sanity:DoDelta(-TUNING.TESTFIRESTAFF_SANITY_COST)')
    expect(code).toContain('target.components.burnable:Ignite(true, attacker)')
    expect(code).toContain('inst.components.weapon:SetOnAttack(onattack)')
  })

  it('does not generate an onattack callback when neither sanity cost nor a hit effect is set', () => {
    const code = generateItemPrefab(axe)
    expect(code).not.toContain('local function onattack')
    expect(code).not.toContain('SetOnAttack')
  })

  it('sets equippable.walkspeedmult when equipWalkSpeedMult is configured', () => {
    const code = generateItemPrefab(firestaff)
    expect(code).toContain('inst.components.equippable.walkspeedmult = 1.25')
  })

  it('wires the createLight spell effect via spellcaster + reticule', () => {
    const code = generateItemPrefab(firestaff)
    expect(code).toContain('inst:AddComponent("reticule")')
    expect(code).toContain('inst:AddComponent("spellcaster")')
    expect(code).toContain('inst.components.spellcaster:SetSpellFn(createlight)')
    expect(code).toContain('SpawnPrefab("stafflight")')
  })

  it('rejects a ranged weapon whose maxRange is smaller than minRange', () => {
    const invalid = {
      ...firestaff,
      weapon: { ...firestaff.weapon, ranged: { ...firestaff.weapon!.ranged!, minRange: 10, maxRange: 5 } },
    }
    expect(itemDefSchema.safeParse(invalid).success).toBe(false)
  })
})
