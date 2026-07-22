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

  it('wires a spellbook item with multiple spells, each spawning its own prefab', () => {
    const spellbookItem: ItemDef = {
      ...trinket,
      id: 'testspellbook',
      spellbook: {
        spells: [
          { label: 'Summon Light', summonPrefab: 'stafflight' },
          { label: 'Summon Fireflies', summonPrefab: 'firefly' },
        ],
      },
    }
    const code = generateItemPrefab(spellbookItem)
    expect(code).toContain('inst:AddComponent("spellbook")')
    expect(code).toContain('inst.components.spellbook:SetItems(SPELLBOOK_SPELLS)')
    expect(code).toContain('local function spellbook_cast_1(inst, user)')
    expect(code).toContain('SpawnPrefab("stafflight")')
    expect(code).toContain('local function spellbook_cast_2(inst, user)')
    expect(code).toContain('SpawnPrefab("firefly")')
    expect(code).toContain('label = "Summon Light"')
    expect(code).toContain('inventory:CastSpellBookFromInv(inst)')
  })

  it('rejects an item with both spellbook and spellEffect set', () => {
    const both: ItemDef = {
      ...trinket,
      spellEffect: 'createLight',
      spellbook: {
        spells: [
          { label: 'A', summonPrefab: 'x' },
          { label: 'B', summonPrefab: 'y' },
        ],
      },
    }
    expect(itemDefSchema.safeParse(both).success).toBe(false)
  })

  it('rejects a spellbook with fewer than 2 spells', () => {
    const oneSpell: ItemDef = { ...trinket, spellbook: { spells: [{ label: 'A', summonPrefab: 'x' }] } }
    expect(itemDefSchema.safeParse(oneSpell).success).toBe(false)
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

  it('initializes armor condition from its own TUNING constant, not finiteuses', () => {
    const code = generateItemPrefab(armor)
    expect(code).toContain('inst.components.armor:InitCondition(TUNING.TESTARMOR_CONDITION, TUNING.TESTARMOR_ABSORPTION)')
    expect(code).not.toContain('_USES or 1')
  })

  it('rejects armor with no condition set', () => {
    const withoutCondition = { ...armor, armor: { ...armor.armor!, condition: undefined as unknown as number } }
    expect(itemDefSchema.safeParse(withoutCondition).success).toBe(false)
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

  it('wires a temporary combat damage buff on eat via SetOnEatenFn + externaldamagemultipliers', () => {
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
    expect(code).toContain('inst.components.edible:SetOnEatenFn(oneaten)')
  })

  it('does not call SetOnEatenFn when the food has no eat buff configured', () => {
    const plainFood = { ...food, onEatBuff: undefined }
    const code = generateItemPrefab(plainFood)
    expect(code).not.toContain('SetOnEatenFn')
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

  it('wires CombineWith + the combinable_item tag when combinable is set (patterns.md#19)', () => {
    const combinableSword = { ...sword, combinable: true }
    const code = generateItemPrefab(combinableSword)
    expect(code).toContain('inst:AddTag("combinable_item")')
    expect(code).toContain('local function CombineWith(inst, material)')
    expect(code).toContain(
      'inst.components.finiteuses:SetPercent(math.min(inst.components.finiteuses:GetPercent() + material.components.finiteuses:GetPercent(), 1))',
    )
    expect(code).toContain('inst.CombineWith = CombineWith')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('does not add combinable wiring when combinable is not set', () => {
    const code = generateItemPrefab(sword)
    expect(code).not.toContain('combinable_item')
    expect(code).not.toContain('CombineWith')
  })

  it('rejects combinable on an item with no durability model', () => {
    const noDurability = { ...trinket, combinable: true }
    expect(itemDefSchema.safeParse(noDurability).success).toBe(false)

    const withDurability = { ...sword, combinable: true }
    expect(itemDefSchema.safeParse(withDurability).success).toBe(true)
  })

  it('wires AddComponent("container") + WidgetSetup when container is set (patterns.md#20)', () => {
    const bag: ItemDef = {
      ...trinket,
      id: 'testbag',
      container: { widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: true },
    }
    const code = generateItemPrefab(bag)
    expect(code).toContain('inst:AddComponent("container")')
    expect(code).toContain('inst.components.container:WidgetSetup("testbag")')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('declares a placeholder UI art asset for a custom container widget, not for a vanilla one', () => {
    const vanillaBag: ItemDef = {
      ...trinket,
      id: 'testbag',
      container: { widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: true },
    }
    expect(generateItemPrefab(vanillaBag)).not.toContain('ui_testbag')

    const customBag: ItemDef = {
      ...trinket,
      id: 'testcustombag',
      container: { widget: { source: 'custom', slots: 8, columns: 2 }, sideWidget: false, acceptsTag: 'pocketwatch' },
    }
    const customCode = generateItemPrefab(customBag)
    expect(customCode).toContain('Asset("ANIM", "anim/ui_testcustombag.zip")')
    expect(customCode).toContain('PLACEHOLDER')
  })

  it('wires the preserver component when container.preservation is set (patterns.md#20)', () => {
    const cooler: ItemDef = {
      ...trinket,
      id: 'testcooler',
      container: {
        widget: { source: 'vanilla', reusePrefab: 'sacred_chest' },
        sideWidget: false,
        preservation: { perishRateMultiplier: 0.25, temperatureRateMultiplier: 0.5 },
      },
    }
    const code = generateItemPrefab(cooler)
    expect(code).toContain('inst:AddComponent("preserver")')
    expect(code).toContain('inst.components.preserver:SetPerishRateMultiplier(0.25)')
    expect(code).toContain('inst.components.preserver:SetTemperatureRateMultiplier(0.5)')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('does not add a preserver when the container has no preservation configured', () => {
    const plainBag: ItemDef = {
      ...trinket,
      id: 'testplainbag',
      container: { widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: true },
    }
    const code = generateItemPrefab(plainBag)
    expect(code).not.toContain('preserver')
  })

  it('closes the container when it is put away, for every container item (patterns.md#20)', () => {
    const bag: ItemDef = {
      ...trinket,
      id: 'testbag',
      container: { widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: true },
    }
    const code = generateItemPrefab(bag)
    expect(code).toContain('inst.components.inventoryitem:SetOnPutInInventoryFn(function(inst)')
    expect(code).toContain('inst.components.container:Close()')
  })

  it('wires teleporter + auto-pairing via a shared GLOBAL table when teleportPair is set (patterns.md#23)', () => {
    const teleporter: ItemDef = { ...structure, id: 'testteleporter', teleportPair: true }
    const code = generateItemPrefab(teleporter)
    expect(code).toContain('inst:AddComponent("teleporter")')
    expect(code).toContain('LinkTeleportPair(inst)')
    expect(code).toContain('GLOBAL.TELEPORT_PAIRS = GLOBAL.TELEPORT_PAIRS or {}')
    expect(code).toContain('a.components.teleporter:Target(b)')
    expect(code).toContain('b.components.teleporter:Target(a)')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('rejects a teleporter pair on a non-structure item', () => {
    const handheldTeleporter = { ...sword, teleportPair: true }
    expect(itemDefSchema.safeParse(handheldTeleporter).success).toBe(false)

    const structureTeleporter = { ...structure, teleportPair: true }
    expect(itemDefSchema.safeParse(structureTeleporter).success).toBe(true)
  })

  it('treats a structure (recipe.placer) as never an inventory item (patterns.md#25)', () => {
    const code = generateItemPrefab(structure)
    expect(code).toContain('MakeObstaclePhysics(inst, 0.5)')
    expect(code).not.toContain('MakeInventoryPhysics')
    expect(code).toContain('inst:AddTag("structure")')
    expect(code).not.toContain('inst:AddTag("item")')
    expect(code).not.toContain('inst:AddComponent("inventoryitem")')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires workable + hammer-destroy for a structure, dropping loot if any', () => {
    const code = generateItemPrefab(structure)
    expect(code).toContain('inst:AddComponent("lootdropper")')
    expect(code).toContain('inst:AddComponent("workable")')
    expect(code).toContain('inst.components.workable:SetWorkAction(ACTIONS.HAMMER)')
    expect(code).toContain('inst.components.workable:SetOnFinishCallback(onhammered)')
    expect(code).toContain('local function onhammered(inst)')
    expect(code).toContain('inst.components.lootdropper:DropLoot()')
    expect(code).toContain('inst:Remove()')
  })

  it('keeps a non-structure item as a normal inventory item', () => {
    const code = generateItemPrefab(sword)
    expect(code).toContain('MakeInventoryPhysics(inst)')
    expect(code).toContain('inst:AddTag("item")')
    expect(code).toContain('inst:AddComponent("inventoryitem")')
    expect(code).not.toContain('MakeObstaclePhysics')
    expect(code).not.toContain('onhammered')
  })

  it('does not wire the container auto-close-on-pickup for a structure container (no inventoryitem to hook)', () => {
    const structureContainer: ItemDef = {
      ...structure,
      id: 'teststructurebag',
      container: { widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: false },
    }
    const code = generateItemPrefab(structureContainer)
    expect(code).toContain('inst:AddComponent("container")')
    expect(code).not.toContain('SetOnPutInInventoryFn')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires rechargeable + Discharge inside onattack for a weapon (patterns.md#26)', () => {
    const rechargeableWeapon = { ...firestaff, finiteuses: undefined, rechargeable: { cooldownSeconds: 30 } }
    const code = generateItemPrefab(rechargeableWeapon)
    expect(code).toContain('inst:AddComponent("rechargeable")')
    expect(code).toContain('inst.components.rechargeable:SetChargeTime(TUNING.TESTFIRESTAFF_COOLDOWN)')
    expect(code).toContain('if inst.components.rechargeable ~= nil then')
    expect(code).toContain('inst.components.rechargeable:Discharge(TUNING.TESTFIRESTAFF_COOLDOWN)')
    expect(code).toContain('inst.components.weapon:SetOnAttack(onattack)')
    expect(code).toContain('inst.components.inspectable.getstatus = function(inst)')
    expect(code).toContain('return (inst.components.rechargeable ~= nil and not inst.components.rechargeable:IsCharged()) and "RECHARGING" or nil')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires rechargeable + Discharge inside the spellcaster effect for a non-weapon magic item', () => {
    const rechargeableStaff: ItemDef = {
      id: 'testrechargewand',
      displayName: 'Test Recharge Wand',
      description: 'A wand for testing',
      category: 'generic',
      spellEffect: 'createLight',
      rechargeable: { cooldownSeconds: 45 },
      recipe: { ingredients: [{ prefab: 'nightmarefuel', amount: 1 }], techLevel: 'MAGIC_TWO', filters: ['MAGIC'], placer: false },
    }
    expect(itemDefSchema.safeParse(rechargeableStaff).success).toBe(true)

    const code = generateItemPrefab(rechargeableStaff)
    expect(code).toContain('inst:AddComponent("rechargeable")')
    expect(code).toContain('if staff.components.rechargeable ~= nil then')
    expect(code).toContain('staff.components.rechargeable:Discharge(TUNING.TESTRECHARGEWAND_COOLDOWN)')
    expect(code).not.toContain('local function onattack')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('rejects rechargeable without a weapon or magic effect, and rejects it alongside finiteuses/perishable', () => {
    const noTrigger = { ...trinket, rechargeable: { cooldownSeconds: 10 } }
    expect(itemDefSchema.safeParse(noTrigger).success).toBe(false)

    const withFiniteuses = { ...firestaff, rechargeable: { cooldownSeconds: 10 } }
    expect(itemDefSchema.safeParse(withFiniteuses).success).toBe(false)

    const valid = { ...firestaff, finiteuses: undefined, rechargeable: { cooldownSeconds: 10 } }
    expect(itemDefSchema.safeParse(valid).success).toBe(true)
  })

  it('wires named + writeable when nameable is set, without touching featherpencil (patterns.md#24)', () => {
    const nameableItem: ItemDef = { ...trinket, id: 'testwatch', nameable: true }
    const code = generateItemPrefab(nameableItem)
    expect(code).toContain('inst:AddComponent("named")')
    expect(code).toContain('inst:AddComponent("writeable")')
    expect(code).toContain('inst.components.writeable:SetDefaultWriteable(false)')
    expect(code).toContain('inst.components.writeable:SetOnWrittenFn(onnamed)')
    expect(code).toContain('local function onnamed(inst, name)')
    expect(code).not.toContain('featherpencil')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })
})
