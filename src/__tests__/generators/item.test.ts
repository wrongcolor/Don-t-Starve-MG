import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { generateItemFiles, generateItemPrefab } from '../../generators/item'
import { itemDefSchema, type ItemDef } from '../../types/modProject'
import { sampleProject } from '../fixtures'

describe('generateItemFiles', () => {
  const [sword, trinket, axe, firestaff, armor, food] = sampleProject.items

  it('checks TheWorld.ismastersim right after SetPristine, before server components', () => {
    const code = generateItemPrefab(sword)
    const pristineIdx = code.indexOf('inst.entity:SetPristine()')
    const ismastersimIdx = code.indexOf('if not TheWorld.ismastersim then')
    const componentIdx = code.indexOf('inst:AddComponent("inventoryitem")')

    expect(pristineIdx).toBeGreaterThan(-1)
    expect(ismastersimIdx).toBeGreaterThan(pristineIdx)
    expect(componentIdx).toBeGreaterThan(ismastersimIdx)
  })

  it('generates exactly one prefab file — an item is never a placer (that is a Structure thing now)', () => {
    const swordFiles = generateItemFiles(sword)
    expect(Object.keys(swordFiles)).toEqual(['scripts/prefabs/testsword.lua'])
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

  it('wires a melee weapon with a custom range via a single-argument SetRange', () => {
    const longReach = { ...sword, weapon: { ...sword.weapon!, meleeRange: 3 } }
    const code = generateItemPrefab(longReach)
    expect(code).toContain('inst.components.weapon:SetRange(TUNING.TESTSWORD_MELEE_RANGE)')
    expect(code).not.toContain('SetProjectile')
  })

  it('does not call SetRange for a melee weapon with no custom range set', () => {
    const code = generateItemPrefab(sword)
    expect(code).not.toContain('SetRange')
  })

  it('rejects a weapon with both a melee range and ranged mode set', () => {
    const both = { ...firestaff, weapon: { ...firestaff.weapon!, meleeRange: 3 } }
    expect(itemDefSchema.safeParse(both).success).toBe(false)
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

  it('wires a tameBomb via the same reticule + spellcaster aim-a-point mechanism as spellEffect', () => {
    const bomb: ItemDef = {
      ...trinket,
      id: 'testtamebomb',
      tameBomb: { radius: 4, cloudDurationSeconds: 10, tameDurationSeconds: 60 },
    }
    const code = generateItemPrefab(bomb)
    expect(code).toContain('inst:AddComponent("reticule")')
    expect(code).toContain('inst:AddComponent("spellcaster")')
    expect(code).toContain('inst.components.spellcaster:SetSpellFn(throwtamecloud)')
    expect(code).toContain('local function throwtamecloud(staff, target, pos)')
    expect(code).toContain('local cloud = SpawnPrefab("testtamebomb_cloud")')
    expect(code).toContain('cloud:SetOwner(staff.components.inventoryitem.owner)')
    expect(code).toContain('local prefabs = { "testtamebomb_cloud" }')
    expect(code).not.toContain('createlight')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('rejects an item with both tameBomb and spellEffect set (both need the same spellcaster slot)', () => {
    const both: ItemDef = { ...trinket, tameBomb: { radius: 4, cloudDurationSeconds: 10, tameDurationSeconds: 60 }, spellEffect: 'createLight' }
    expect(itemDefSchema.safeParse(both).success).toBe(false)
  })

  it('generates a separate tame cloud prefab file that scans for hostile-tagged entities and tames them temporarily', () => {
    const bomb: ItemDef = {
      ...trinket,
      id: 'testtamebomb',
      tameBomb: { radius: 4, cloudDurationSeconds: 10, tameDurationSeconds: 60 },
    }
    const files = generateItemFiles(bomb)
    expect(Object.keys(files).sort()).toEqual(['scripts/prefabs/testtamebomb.lua', 'scripts/prefabs/testtamebomb_cloud.lua'].sort())

    const cloudCode = files['scripts/prefabs/testtamebomb_cloud.lua']
    expect(cloudCode).toContain('TheSim:FindEntities(x, y, z, TUNING.TESTTAMEBOMB_CLOUD_RADIUS, { "hostile" })')
    expect(cloudCode).toContain('ent:AddComponent("follower")')
    expect(cloudCode).toContain('ent.components.follower:SetLeader(inst.owner)')
    expect(cloudCode).toContain('ent.components.follower:AddLoyaltyTime(TUNING.TESTTAMEBOMB_CLOUD_TAME_DURATION)')
    expect(cloudCode).toContain('inst:DoTaskInTime(TUNING.TESTTAMEBOMB_CLOUD_DURATION, inst.Remove)')
    expect(cloudCode).toContain('return Prefab("testtamebomb_cloud", fn, assets)')

    expect(() => parse(cloudCode, { luaVersion: '5.1' })).not.toThrow()
  })

  // Confirmed against Original/stategraphs/stategraphs/SGantlion_angry.lua's
  // SpawnSpikes/SpawnBlocks — same reticule + spellcaster mechanism as
  // spellEffect/tameBomb, thrown at a point instead of at the caster.
  it('wires a groundAttack via the same reticule + spellcaster aim-a-point mechanism as spellEffect/tameBomb', () => {
    const bomb: ItemDef = {
      ...trinket,
      id: 'testgroundattack',
      groundAttack: { spikeCount: 5, wallCount: 2, radius: 6 },
    }
    const code = generateItemPrefab(bomb)
    expect(code).toContain('inst:AddComponent("reticule")')
    expect(code).toContain('inst:AddComponent("spellcaster")')
    expect(code).toContain('inst.components.spellcaster:SetSpellFn(throwgroundattack)')
    expect(code).toContain('local function dogroundattack(pos)')
    expect(code).toContain('for i = 1, TUNING.TESTGROUNDATTACK_SPIKE_COUNT do')
    expect(code).toContain('for i = 1, TUNING.TESTGROUNDATTACK_WALL_COUNT do')
    expect(code).toContain('local function throwgroundattack(staff, target, pos)')
    expect(code).toContain('dogroundattack(pos)')
    expect(code).not.toContain('createlight')
    expect(code).not.toContain('throwtamecloud')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('rejects an item with groundAttack alongside spellEffect or tameBomb (all three need the same spellcaster slot)', () => {
    const withSpellEffect: ItemDef = { ...trinket, groundAttack: { spikeCount: 5, wallCount: 0, radius: 6 }, spellEffect: 'createLight' }
    expect(itemDefSchema.safeParse(withSpellEffect).success).toBe(false)

    const withTameBomb: ItemDef = {
      ...trinket,
      groundAttack: { spikeCount: 5, wallCount: 0, radius: 6 },
      tameBomb: { radius: 4, cloudDurationSeconds: 10, tameDurationSeconds: 60 },
    }
    expect(itemDefSchema.safeParse(withTameBomb).success).toBe(false)
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

  it('equips head-slot armor via swap_hat (hats.lua) instead of swap_body, with no blocked-sound override', () => {
    const helm: ItemDef = { ...armor, armor: { ...armor.armor!, equipSlot: 'head' } }
    const code = generateItemPrefab(helm)
    expect(code).toContain('inst.components.equippable.equipslot = EQUIPSLOTS.HEAD')
    expect(code).toContain('owner.AnimState:OverrideSymbol("swap_hat", "testarmor", "swap_hat")')
    expect(code).toContain('owner.AnimState:Show("HAT")')
    expect(code).toContain('owner.AnimState:ClearOverrideSymbol("swap_hat")')
    expect(code).not.toContain('swap_body')
    expect(code).not.toContain('onblocked_armor')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('defaults armor to the body slot when equipSlot is not set', () => {
    const code = generateItemPrefab(armor)
    expect(code).toContain('inst.components.equippable.equipslot = EQUIPSLOTS.BODY')
  })

  it('wires the moonrelic component so the item can be given to the Celestial Portal', () => {
    expect(generateItemPrefab(armor)).not.toContain('moonrelic')

    const idol: ItemDef = { ...armor, moonrelic: true }
    const code = generateItemPrefab(idol)
    expect(code).toContain('inst:AddComponent("moonrelic")')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('reuses a vanilla hat build with its own bank/build/clip naming convention (hats.lua)', () => {
    const helm: ItemDef = {
      ...armor,
      armor: { ...armor.armor!, equipSlot: 'head' },
      animation: { source: 'vanillaHat', hatName: 'football' },
    }
    const code = generateItemPrefab(helm)
    expect(code).not.toContain('Asset("ANIM"')
    expect(code).toContain('-- Build "hat_football" reaproveitado do jogo base, sem asset próprio necessário.')
    expect(code).toContain('inst.AnimState:SetBank("footballhat")')
    expect(code).toContain('inst.AnimState:SetBuild("hat_football")')
    expect(code).toContain('inst.AnimState:PlayAnimation("anim")')
    expect(code).toContain('owner.AnimState:OverrideSymbol("swap_hat", "hat_football", "swap_hat")')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('keeps bank/build/clip identical (the non-hat convention) for a plain custom or vanilla build', () => {
    expect(generateItemPrefab(armor)).toContain('inst.AnimState:PlayAnimation("idle")')
    const vanillaBuild: ItemDef = { ...armor, animation: { source: 'vanilla', build: 'trinket_1' } }
    const code = generateItemPrefab(vanillaBuild)
    expect(code).toContain('inst.AnimState:SetBank("trinket_1")')
    expect(code).toContain('inst.AnimState:SetBuild("trinket_1")')
    expect(code).toContain('inst.AnimState:PlayAnimation("idle")')
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
      recipe: { ingredients: [{ prefab: 'twigs', amount: 1 }], techLevel: 'NONE', filters: ['MAGIC'] },
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

  it('keeps an item a normal inventory item, never obstacle-physics/hammerable (that is a Structure thing now)', () => {
    const code = generateItemPrefab(sword)
    expect(code).toContain('MakeInventoryPhysics(inst)')
    expect(code).toContain('inst:AddTag("item")')
    expect(code).toContain('inst:AddComponent("inventoryitem")')
    expect(code).not.toContain('MakeObstaclePhysics')
    expect(code).not.toContain('onhammered')
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
      recipe: { ingredients: [{ prefab: 'nightmarefuel', amount: 1 }], techLevel: 'MAGIC_TWO', filters: ['MAGIC'] },
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
