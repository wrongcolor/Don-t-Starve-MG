import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { generateItemFiles, generateItemPrefab } from '../../generators/item'
import { itemDefSchema, type ItemDef } from '../../types/modProject'
import { sampleProject } from '../fixtures'

describe('generateItemFiles', () => {
  const [sword, structure, trinket, axe, firestaff, armor, food] = sampleProject.items

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

  it('rejects an item with both finiteuses and perishable set as durability', () => {
    const both = { ...sword, perishable: { perishTimeDays: 3 } }
    expect(itemDefSchema.safeParse(both).success).toBe(false)

    const perishableOnly = { ...sword, finiteuses: undefined, perishable: { perishTimeDays: 3 } }
    expect(itemDefSchema.safeParse(perishableOnly).success).toBe(true)
  })

  it('rejects a ranged weapon whose maxRange is smaller than minRange', () => {
    const invalid = {
      ...firestaff,
      weapon: { ...firestaff.weapon, ranged: { ...firestaff.weapon!.ranged!, minRange: 10, maxRange: 5 } },
    }
    expect(itemDefSchema.safeParse(invalid).success).toBe(false)
  })

  it('equips body armor via swap_body (reusing its own build) instead of swap_object', () => {
    const code = generateItemPrefab(armor)
    expect(code).toContain('inst:AddComponent("equippable")')
    expect(code).toContain('inst.components.equippable.equipslot = EQUIPSLOTS.BODY')
    expect(code).toContain('owner.AnimState:OverrideSymbol("swap_body", "testarmor", "swap_body")')
    expect(code).toContain('owner.AnimState:ClearOverrideSymbol("swap_body")')
    expect(code).not.toContain('swap_object')
    expect(code).not.toContain('Asset("ANIM", "anim/swap_testarmor.zip")')
  })

  it('plays the blocked sound and does not use the handheld arm show/hide for armor', () => {
    const code = generateItemPrefab(armor)
    expect(code).toContain('inst:ListenForEvent("blocked", onblocked_armor, owner)')
    expect(code).not.toContain('ARM_carry')
  })

  it('wires armor weakness, flammability, and sanity-loss-on-hit', () => {
    const code = generateItemPrefab(armor)
    expect(code).toContain('inst.components.armor:AddWeakness("beaver", 5)')
    expect(code).toContain('inst:AddComponent("fuel")')
    expect(code).toContain('MakeSmallBurnable(inst, TUNING.SMALL_BURNTIME)')
    expect(code).toContain('local function onarmortakedamage(inst, damage_amount)')
    expect(code).toContain('owner.components.sanity:DoDelta(-damage_amount * TUNING.TESTARMOR_SANITY_LOSS_PERCENT, false)')
    expect(code).toContain('inst.components.armor.ontakedamage = onarmortakedamage')
  })

  it('sets equippable.dapperness for armor with a sanity effect while worn', () => {
    const code = generateItemPrefab(armor)
    expect(code).toContain('inst.components.equippable.dapperness = -0.5')
  })

  it('wires the edible component with foodtype and TUNING-driven hunger/health/sanity values', () => {
    const code = generateItemPrefab(food)
    expect(code).toContain('inst:AddComponent("edible")')
    expect(code).toContain('inst.components.edible.foodtype = FOODTYPE.MEAT')
    expect(code).toContain('inst.components.edible.healthvalue = TUNING.TESTFOOD_HEALTH')
    expect(code).toContain('inst.components.edible.hungervalue = TUNING.TESTFOOD_HUNGER')
    expect(code).toContain('inst.components.edible.sanityvalue = TUNING.TESTFOOD_SANITY')
  })

  it('requires edible values when category is food', () => {
    const withoutEdible = { ...food, edible: undefined }
    expect(itemDefSchema.safeParse(withoutEdible).success).toBe(false)

    const withEdible = itemDefSchema.safeParse(food)
    expect(withEdible.success).toBe(true)
  })

  it('wires a temporary combat damage buff on eat via oneatenfn + externaldamagemultipliers', () => {
    const code = generateItemPrefab(food)
    expect(code).toContain('local function oneaten(inst, eater)')
    expect(code).toContain('if eater == nil or eater.components.combat == nil then return end')
    expect(code).toContain(
      'eater.components.combat.externaldamagemultipliers:SetModifier(inst, 1 + TUNING.TESTFOOD_DAMAGE_BUFF_MULT, "testfood_damage_buff")',
    )
    expect(code).toContain('eater:DoTaskInTime(TUNING.TESTFOOD_DAMAGE_BUFF_DURATION, function()')
    expect(code).toContain(
      'eater.components.combat.externaldamagemultipliers:RemoveModifier(inst, "testfood_damage_buff")',
    )
    expect(code).toContain('inst.components.edible.oneatenfn = oneaten')
  })

  it('does not generate an oneatenfn when the food has no eat buff configured', () => {
    const plainFood = { ...food, onEatBuff: undefined }
    const code = generateItemPrefab(plainFood)
    expect(code).not.toContain('oneatenfn')
    expect(code).not.toContain('local function oneaten')
  })

  it('rejects a temporary combat buff on a non-food item', () => {
    const buffOnWeapon = { ...sword, onEatBuff: { damageMultiplier: 0.25, durationSeconds: 120 } }
    expect(itemDefSchema.safeParse(buffOnWeapon).success).toBe(false)
  })

  it('supports a weapon that fires a projectile on attack AND casts createLight on a point — two independent components, no collision', () => {
    const projectileAndLightStaff: ItemDef = {
      id: 'teststormstaff',
      displayName: 'Test Storm Staff',
      description: 'Fires a projectile and can light up an area',
      category: 'weapon',
      weapon: {
        damage: 0,
        ranged: { minRange: 6, maxRange: 10, projectilePrefab: 'fire_projectile' },
      },
      spellEffect: 'createLight',
      recipe: { ingredients: [{ prefab: 'twigs', amount: 1 }], techLevel: 'NONE', filters: ['MAGIC'], placer: false },
    }

    expect(itemDefSchema.safeParse(projectileAndLightStaff).success).toBe(true)

    const code = generateItemPrefab(projectileAndLightStaff)
    // Normal attack: weapon component fires the projectile, no onattack needed
    // since there's no sanity cost or on-hit effect configured.
    expect(code).toContain('inst.components.weapon:SetRange(TUNING.TESTSTORMSTAFF_MIN_RANGE, TUNING.TESTSTORMSTAFF_MAX_RANGE)')
    expect(code).toContain('inst.components.weapon:SetProjectile("fire_projectile")')
    expect(code).not.toContain('local function onattack')
    // Point-cast: separate spellcaster + reticule pair, triggered when the item
    // is used on the ground instead of on a combat target (patterns.md#7).
    expect(code).toContain('inst:AddComponent("reticule")')
    expect(code).toContain('inst:AddComponent("spellcaster")')
    expect(code).toContain('inst.components.spellcaster:SetSpellFn(createlight)')
    expect(code).toContain('inst.components.spellcaster.canuseonpoint = true')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })
})
