import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { generateItemFiles, generateItemPrefab, itemRecipeIcon } from '../../generators/item'
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
    const customBuildSword: ItemDef = { ...sword, animation: undefined }
    const code = generateItemPrefab(customBuildSword)
    expect(code).toContain('Asset("ANIM", "anim/testsword.zip")')
    expect(code).toContain('inst.AnimState:SetBank("testsword")')
    expect(code).toContain('inst.AnimState:SetBuild("testsword")')
  })

  it('reuses a vanilla build without declaring an ANIM asset when animation.source is vanilla', () => {
    const code = generateItemPrefab(trinket)
    expect(code).not.toContain('Asset("ANIM"')
    expect(code).toContain('inst.AnimState:SetBank("trinket_1")')
    expect(code).toContain('inst.AnimState:SetBuild("trinket_1")')
    // A vanilla-sourced item has no anim/<id>.zip to derive this from — see
    // itemRecipeIcon's crash-fix comment in item.ts.
    expect(code).not.toContain('Asset("INV_IMAGE"')
  })

  // Reproduced in-game (twice): InventoryItem:GetImage() (inventoryitem_replica.lua)
  // defaults to the item's OWN prefab id whenever `imagename` was never set —
  // completely separate from itemRecipeIcon's atlas/image, which only affects
  // the crafting-menu icon. Without this, the crafting menu showed the reused
  // build's icon fine, but the actual inventory slot / dropped-on-ground
  // sprite showed nothing at all (not even the name). `imagename` is a
  // LISTENABLE PROPERTY (components/inventoryitem.lua's Class() 3rd arg), not
  // a method — `:SetImage(...)` only exists on the replica and crashed with
  // "attempt to call method 'SetImage' (a nil value)" on the real server component.
  it('sets inventoryitem.imagename to the reused build for a vanilla-sourced item with no custom icon', () => {
    const code = generateItemPrefab(trinket)
    expect(code).toContain('inst.components.inventoryitem.imagename = "trinket_1"')
    expect(code).not.toContain(':SetImage')
  })

  it('does not override imagename for a vanilla-sourced item WITH hasCustomIcon (keeps the item\'s own real icon)', () => {
    const customIconTrinket = { ...trinket, hasCustomIcon: true }
    const code = generateItemPrefab(customIconTrinket)
    expect(code).not.toContain('imagename')
  })

  it('does not set imagename for a custom-sourced item (its own id is already the right default)', () => {
    const code = generateItemPrefab({ ...trinket, animation: undefined })
    expect(code).not.toContain('imagename')
  })

  // hasCustomIcon decouples the static icon from the body build: a mod can
  // ship a real images/inventoryimages/<id>.xml/.tex (see scripts/png_to_ktex.py)
  // for a vanilla-bodied item, instead of only ever reusing the build's own icon.
  it('declares a real ATLAS+IMAGE pair (not INV_IMAGE, which needs a real anim.zip to derive from) for a vanilla-build item with hasCustomIcon set', () => {
    const customIconItem = { ...trinket, hasCustomIcon: true }
    const code = generateItemPrefab(customIconItem)
    expect(code).toContain('Asset("ATLAS", "images/inventoryimages/testtrinket.xml")')
    expect(code).toContain('Asset("IMAGE", "images/inventoryimages/testtrinket.tex")')
    expect(code).not.toContain('Asset("INV_IMAGE"')
    expect(itemRecipeIcon(customIconItem)).toEqual({
      atlas: 'images/inventoryimages/testtrinket.xml',
      image: 'testtrinket.tex',
    })
  })

  // Confirmed directly against the real game scripts (staff.lua, books.lua):
  // a build shared across several item variants keeps bank === build but
  // plays its OWN idle clip, never a generic "idle" — see itemAnimationSchema.
  it('plays a custom idle clip for a shared vanilla build instead of the default "idle"', () => {
    const staffLike: ItemDef = {
      ...trinket,
      id: 'testyellowstaff',
      animation: { source: 'vanilla', build: 'staffs', idleClip: 'yellowstaff' },
    }
    const code = generateItemPrefab(staffLike)
    expect(code).toContain('inst.AnimState:SetBank("staffs")')
    expect(code).toContain('inst.AnimState:SetBuild("staffs")')
    expect(code).toContain('inst.AnimState:PlayAnimation("yellowstaff")')
    expect(code).not.toContain('PlayAnimation("idle")')
  })

  it('defaults to the "idle" clip for a vanilla build with no idleClip set', () => {
    const code = generateItemPrefab(trinket)
    expect(code).toContain('inst.AnimState:PlayAnimation("idle")')
  })

  it('wires the tool component + SetAction for tool-category items, and ties finiteuses consumption to that action', () => {
    const code = generateItemPrefab(axe)
    expect(code).toContain('inst:AddComponent("tool")')
    expect(code).toContain('inst.components.tool:SetAction(ACTIONS.CHOP)')
    expect(code).toContain('inst.components.finiteuses:SetConsumption(ACTIONS.CHOP, 1)')
  })

  it('generates equippable + swap_object handling and a separate swap build asset for handheld items (tool or weapon)', () => {
    const customBuildAxe: ItemDef = { ...axe, animation: undefined }
    const axeCode = generateItemPrefab(customBuildAxe)
    expect(axeCode).toContain('inst:AddComponent("equippable")')
    expect(axeCode).toContain('inst.components.equippable:SetOnEquip(onequip)')
    expect(axeCode).toContain('inst.components.equippable:SetOnUnequip(onunequip)')
    expect(axeCode).toContain('owner.AnimState:OverrideSymbol("swap_object", "swap_testaxe", "swap_testaxe")')
    expect(axeCode).toContain('Asset("ANIM", "anim/swap_testaxe.zip")')

    const customBuildSword: ItemDef = { ...sword, animation: undefined }
    const swordCode = generateItemPrefab(customBuildSword)
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

  it('wires a chain-return weapon to fire a self-generated projectile, keeping the plain ranged/melee fields off', () => {
    const chakram: ItemDef = {
      ...sword,
      weapon: { damage: 20, chainReturn: { range: 15, speed: 20, maxChainHits: 5, searchRadius: 8 } },
    }
    const code = generateItemPrefab(chakram)
    expect(code).toContain('inst.components.weapon:SetRange(TUNING.TESTSWORD_RANGE)')
    expect(code).toContain('inst.components.weapon:SetProjectile("testsword_proj")')
    expect(code).not.toContain('SetProjectile("fire_projectile")')
  })

  it('rejects a chain-return weapon combined with ranged or melee mode, since it generates its own projectile', () => {
    const chakram = { ...sword, weapon: { damage: 20, chainReturn: { range: 15, speed: 20, maxChainHits: 5, searchRadius: 8 } } }
    expect(itemDefSchema.safeParse(chakram).success).toBe(true)
    expect(itemDefSchema.safeParse({ ...chakram, weapon: { ...chakram.weapon, ranged: firestaff.weapon!.ranged } }).success).toBe(false)
    expect(itemDefSchema.safeParse({ ...chakram, weapon: { ...chakram.weapon, meleeRange: 3 } }).success).toBe(false)
  })

  it('generates a second prefab file for the chain-return projectile, reusing the weapon\'s own build', () => {
    const chakram: ItemDef = {
      ...sword,
      animation: { source: 'vanilla', build: 'boomerang' },
      weapon: { damage: 20, chainReturn: { range: 15, speed: 20, maxChainHits: 5, searchRadius: 8, projectileClip: 'spin_loop' } },
    }
    const files = generateItemFiles(chakram)
    expect(Object.keys(files).sort()).toEqual(['scripts/prefabs/testsword.lua', 'scripts/prefabs/testsword_proj.lua'].sort())

    const projCode = files['scripts/prefabs/testsword_proj.lua']
    expect(projCode).toContain('-- Build "boomerang" reaproveitado do jogo base, sem asset próprio necessário.')
    expect(projCode).toContain('inst.AnimState:SetBank("boomerang")')
    expect(projCode).toContain('inst.AnimState:SetBuild("boomerang")')
    expect(projCode).toContain('inst.AnimState:PlayAnimation("spin_loop", true)')
    expect(projCode).toContain('inst:AddComponent("projectile")')
    expect(projCode).toContain('inst.components.projectile:SetHoming(true)')
    expect(projCode).toContain('inst.components.projectile.has_damage_set = true')
    expect(() => parse(projCode, { luaVersion: '5.1' })).not.toThrow()
  })

  it('chains into the next nearby enemy on hit, up to the configured max, then returns to the player who threw it', () => {
    const chakram: ItemDef = {
      ...sword,
      weapon: { damage: 20, chainReturn: { range: 15, speed: 20, maxChainHits: 5, searchRadius: 8 } },
    }
    const files = generateItemFiles(chakram)
    const projCode = files['scripts/prefabs/testsword_proj.lua']
    expect(projCode).toContain('local function OnHit(inst, attacker, target)')
    expect(projCode).toContain('inst._hit[target] = true')
    expect(projCode).toContain('if inst._hitcount < TUNING.TESTSWORD_PROJ_MAX_CHAIN_HITS then')
    expect(projCode).toContain('inst.components.projectile:Throw(inst._weapon, nexttarget, inst._player)')
    expect(projCode).toContain('local function ReturnToOwner(inst)')
    expect(projCode).toContain('inst.components.projectile:Stop()')
    expect(projCode).toContain('local function OnMiss(inst)')
    expect(projCode).toContain('local function OnUpdate(inst, dt)')
    expect(projCode).toContain('local targetpos = inst._player:GetPosition()')
    expect(projCode).toContain('if distsq(pos, targetpos) < 1 then')
    expect(projCode).toContain('inst:Remove()')
  })

  it('tracks the wielding player (not the weapon item) for the return flight, since an equipped item does not track the player\'s live position', () => {
    const chakram: ItemDef = {
      ...sword,
      weapon: { damage: 20, chainReturn: { range: 15, speed: 20, maxChainHits: 5, searchRadius: 8 } },
    }
    const files = generateItemFiles(chakram)
    const projCode = files['scripts/prefabs/testsword_proj.lua']
    expect(projCode).toContain('local function OnThrown(inst, owner, target, attacker)')
    expect(projCode).toContain('if inst._weapon == nil then')
    expect(projCode).toContain('inst._weapon = owner')
    expect(projCode).toContain('inst._player = attacker')
    expect(projCode).toContain('if not inst._returning or inst._player == nil or not inst._player:IsValid() then')
    expect(projCode).not.toContain('inst._owner')
  })

  it('locks the chakram (via rechargeable, nulling range/projectile) the instant it is thrown, and only unlocks once the projectile is gone', () => {
    const chakram: ItemDef = {
      ...sword,
      weapon: { damage: 20, chainReturn: { range: 15, speed: 20, maxChainHits: 5, searchRadius: 8 } },
    }
    const code = generateItemPrefab(chakram)
    expect(code).toContain('inst:AddComponent("rechargeable")')
    expect(code).toContain('inst.components.rechargeable:SetOnDischargedFn(OnChakramDischarged)')
    expect(code).toContain('inst.components.rechargeable:SetOnChargedFn(OnChakramCharged)')
    expect(code).toContain('local function OnChakramDischarged(inst)')
    expect(code).toContain('inst.components.weapon:SetRange(nil)')
    expect(code).toContain('inst.components.weapon:SetProjectile(nil)')
    expect(code).toContain('local function OnChakramCharged(inst)')
    expect(code).toContain('inst.components.weapon:SetRange(TUNING.TESTSWORD_RANGE)')
    expect(code).toContain('inst.components.weapon:SetProjectile("testsword_proj")')

    const files = generateItemFiles(chakram)
    const projCode = files['scripts/prefabs/testsword_proj.lua']
    expect(projCode).toContain('inst._weapon.components.rechargeable:Discharge(999999)')
    expect(projCode).toContain('local function OnRemoved(inst)')
    expect(projCode).toContain('inst._weapon.components.rechargeable:SetPercent(1)')
    expect(projCode).toContain('inst.OnRemoveEntity = OnRemoved')
  })

  it('rejects a chain-return weapon combined with the generic rechargeable durability field, since both would fight over the same component', () => {
    const chakram: ItemDef = {
      ...sword,
      weapon: { damage: 20, chainReturn: { range: 15, speed: 20, maxChainHits: 5, searchRadius: 8 } },
    }
    expect(itemDefSchema.safeParse(chakram).success).toBe(true)
    expect(itemDefSchema.safeParse({ ...chakram, rechargeable: { cooldownSeconds: 5 } }).success).toBe(false)
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

  it('wires a smokeBomb via the same reticule + spellcaster aim-a-point mechanism as tameBomb', () => {
    const bomb: ItemDef = {
      ...trinket,
      id: 'testsmokebomb',
      smokeBomb: { radius: 5, cloudDurationSeconds: 8 },
    }
    const code = generateItemPrefab(bomb)
    expect(code).toContain('inst:AddComponent("reticule")')
    expect(code).toContain('inst:AddComponent("spellcaster")')
    expect(code).toContain('inst.components.spellcaster:SetSpellFn(throwsmokebomb)')
    expect(code).toContain('local function throwsmokebomb(staff, target, pos)')
    expect(code).toContain('local cloud = SpawnPrefab("testsmokebomb_smoke")')
    expect(code).toContain('cloud:SetOwner(staff.components.inventoryitem.owner)')
    expect(code).toContain('local prefabs = { "testsmokebomb_smoke" }')
    expect(code).not.toContain('createlight')
    expect(code).not.toContain('throwtamecloud')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('rejects an item with smokeBomb alongside spellEffect, tameBomb, or groundAttack (all need the same spellcaster slot)', () => {
    const withSpellEffect: ItemDef = { ...trinket, smokeBomb: { radius: 5, cloudDurationSeconds: 8 }, spellEffect: 'createLight' }
    expect(itemDefSchema.safeParse(withSpellEffect).success).toBe(false)

    const withTameBomb: ItemDef = {
      ...trinket,
      smokeBomb: { radius: 5, cloudDurationSeconds: 8 },
      tameBomb: { radius: 4, cloudDurationSeconds: 10, tameDurationSeconds: 60 },
    }
    expect(itemDefSchema.safeParse(withTameBomb).success).toBe(false)

    const withGroundAttack: ItemDef = {
      ...trinket,
      smokeBomb: { radius: 5, cloudDurationSeconds: 8 },
      groundAttack: { spikeCount: 5, wallCount: 0, radius: 6 },
    }
    expect(itemDefSchema.safeParse(withGroundAttack).success).toBe(false)
  })

  it('generates a separate smoke cloud prefab file that scans for hostile-tagged entities and drops their combat target', () => {
    const bomb: ItemDef = {
      ...trinket,
      id: 'testsmokebomb',
      smokeBomb: { radius: 5, cloudDurationSeconds: 8 },
    }
    const files = generateItemFiles(bomb)
    expect(Object.keys(files).sort()).toEqual(['scripts/prefabs/testsmokebomb.lua', 'scripts/prefabs/testsmokebomb_smoke.lua'].sort())

    const cloudCode = files['scripts/prefabs/testsmokebomb_smoke.lua']
    expect(cloudCode).toContain('TheSim:FindEntities(x, y, z, TUNING.TESTSMOKEBOMB_SMOKE_RADIUS, { "hostile" })')
    expect(cloudCode).toContain('ent.components.combat:DropTarget()')
    expect(cloudCode).toContain('inst:DoTaskInTime(TUNING.TESTSMOKEBOMB_SMOKE_DURATION, inst.Remove)')
    expect(cloudCode).toContain('return Prefab("testsmokebomb_smoke", fn, assets)')

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
        source: 'static',
        spells: [
          { label: 'Summon Light', summonPrefab: 'stafflight' },
          { label: 'Summon Fireflies', summonPrefab: 'firefly' },
        ],
      },
    }
    const code = generateItemPrefab(spellbookItem)
    expect(code).toContain('inst:AddComponent("spellbook")')
    expect(code).toContain('inst.components.spellbook:SetItems(SPELLBOOK_SPELLS)')
    expect(code).toContain('local function spellbook_cast_1(inst, user, pos)')
    expect(code).toContain('SpawnPrefab("stafflight")')
    expect(code).toContain('local function spellbook_cast_2(inst, user, pos)')
    expect(code).toContain('SpawnPrefab("firefly")')
    expect(code).toContain('label = "Summon Light"')
  })

  // Reproduced in-game: componentactions.lua's own spellbook inventory-action
  // handler reads inst.components.spellbook directly on the CLIENT (confirmed
  // in the real waxwelljournal.lua: AddComponent("spellbook") happens before
  // SetPristine()/the ismastersim check, unlike every other component here).
  // Adding it inside the server-only block left it nil on the client, crashing
  // as soon as the item's tooltip/action list was computed ("attempt to index
  // field 'spellbook' (a nil value)").
  it('adds the spellbook component on BOTH client and server (before SetPristine), not just the server', () => {
    const spellbookItem: ItemDef = {
      ...trinket,
      id: 'testspellbook',
      spellbook: { source: 'static', spells: [{ label: 'A', summonPrefab: 'x' }, { label: 'B', summonPrefab: 'y' }] },
    }
    const code = generateItemPrefab(spellbookItem)
    const addComponentIdx = code.indexOf('inst:AddComponent("spellbook")')
    const setPristineIdx = code.indexOf('inst.entity:SetPristine()')
    expect(addComponentIdx).toBeGreaterThan(-1)
    expect(setPristineIdx).toBeGreaterThan(-1)
    expect(addComponentIdx).toBeLessThan(setPristineIdx)
    expect(code).toContain('inventory:CastSpellBookFromInv(inst)')
  })

  // Confirmed against a real published character mod's own resource
  // component — see characterManaSchema. A caster with no `mana` component
  // (i.e. not the character that has CharacterDef.mana) always casts for
  // free, same as before manaCost existed.
  it('checks and spends mana before casting a spell with a manaCost, only for spells that set one', () => {
    const spellbookItem: ItemDef = {
      ...trinket,
      id: 'testmanastaff',
      spellbook: {
        source: 'static',
        spells: [
          { label: 'Sunbeam', summonPrefab: 'stafflight', manaCost: 10 },
          { label: 'Free Spark', summonPrefab: 'firefly' },
        ],
      },
    }
    const code = generateItemPrefab(spellbookItem)
    expect(code).toContain('if user.components.mana ~= nil and not user.components.mana:Spend(10) then')
    expect(code).toContain('local function spellbook_cast_1(inst, user, pos)')

    const cast1End = code.indexOf('local function spellbook_cast_2')
    expect(code.slice(0, cast1End)).toContain('return false')

    const cast2Body = code.slice(cast1End)
    expect(cast2Body).not.toContain('user.components.mana')
  })

  // Confirmed in the real widgets/wheel.lua: Wheel:Open() greys out (and,
  // per widgets/button.lua's OnControl, actually blocks clicks on) any wheel
  // entry whose checkenabled(owner) returns false — evaluated fresh every
  // time the wheel opens, so it can't be bypassed once mana regenerates back
  // above the cost either.
  //
  // Reproduced in-game (twice): checkenabled runs on the wheel WIDGET, which
  // only exists client-side, where `.components.mana` is always nil (this
  // custom "mana" component has no _replica.lua) — checking it there always
  // fell through to "no mana component, allow it" and never actually
  // blocked anything, letting every spell stay clickable/castable regardless
  // of the caster's real mana. Fixed by reading `owner.mana_current` instead
  // — a plain netvar modmain.ts's characterManaHudBlock mirrors from the
  // real server-side amount specifically for this kind of client-side check.
  it('adds checkenabled (reading the client-visible mana_current netvar) only for the spell that has a manaCost', () => {
    const spellbookItem: ItemDef = {
      ...trinket,
      id: 'testmanastaff2',
      spellbook: {
        source: 'static',
        spells: [
          { label: 'Sunbeam', summonPrefab: 'stafflight', manaCost: 10 },
          { label: 'Free Spark', summonPrefab: 'firefly' },
        ],
      },
    }
    const code = generateItemPrefab(spellbookItem)
    expect(code).toContain('checkenabled = function(owner) return owner.mana_current == nil or owner.mana_current:value() >= 10 end,')
    expect(code).not.toContain('owner.components.mana')

    const tableStart = code.indexOf('local SPELLBOOK_SPELLS =')
    const freeSparkEntry = code.indexOf('label = "Free Spark"', tableStart)
    const freeSparkEntryEnd = code.indexOf('},', freeSparkEntry)
    expect(code.slice(freeSparkEntry, freeSparkEntryEnd)).not.toContain('checkenabled')
  })

  it('wires a static spell\'s beam as a channeled, direction-facing area tick over its own duration', () => {
    const beamStaff: ItemDef = {
      ...trinket,
      id: 'testbeamstaff',
      spellbook: {
        source: 'static',
        spells: [
          { label: 'Solar Beam', beam: { damagePerTick: 20, tickIntervalSeconds: 0.5, range: 10, durationSeconds: 3 } },
          { label: 'Free Spark', summonPrefab: 'firefly' },
        ],
      },
    }
    const code = generateItemPrefab(beamStaff)
    expect(code).toContain('local function DoSpellBeamDamage(user, beam)')
    expect(code).toContain('local angle = user.Transform:GetRotation() * DEGREES')
    expect(code).toContain('local ents = TheSim:FindEntities(px, 0, pz, 2, nil, { "INLIMBO", "player" }, { "hostile" })')
    expect(code).toContain('v.components.health:DoDelta(-beam.damage, false, "solarbeam", false, user)')
    expect(code).toContain('local function StartSpellBeam(user, beam)')
    expect(code).toContain('task = user:DoPeriodicTask(beam.tickinterval, function()')
    expect(code).toContain('user:DoTaskInTime(beam.duration, function()')
    expect(code).toContain(
      'StartSpellBeam(user, { damage = 20, tickinterval = 0.5, range = 10, duration = 3, telegraph = nil })',
    )
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  // Confirmed against the real game scripts (components/aoespell.lua,
  // components/aoetargeting.lua, prefabs/abigail_flower.lua +
  // prefabs/ghostcommand_defs.lua): a beam spell casts through aoespell with
  // a real aimed pos (mouse-enabled reticule), while a non-beam spell in the
  // SAME wheel stays on the instant spellbook:SetSpellFn path — this is what
  // lets one item mix aimed and instant spells, same as Abigail's Flower.
  it('wires only the beam spell in a mixed wheel through aoetargeting/aoespell, leaving the other spell instant-cast', () => {
    const beamStaff: ItemDef = {
      ...trinket,
      id: 'testmixedaimstaff',
      spellbook: {
        source: 'static',
        spells: [
          { label: 'Solar Beam', beam: { damagePerTick: 20, tickIntervalSeconds: 0.5, range: 10, durationSeconds: 3 } },
          { label: 'Free Spark', summonPrefab: 'firefly' },
        ],
      },
    }
    const code = generateItemPrefab(beamStaff)
    expect(code).toContain('user:ForceFacePoint(pos:Get())')
    expect(code).toContain('inst:AddComponent("aoetargeting")')
    expect(code).toContain('inst.components.aoetargeting.reticule.mouseenabled = true')
    expect(code).toContain('inst:AddComponent("aoespell")')

    const beamEntryStart = code.indexOf('label = "Solar Beam"')
    const sparkEntryStart = code.indexOf('label = "Free Spark"')
    const beamEntry = code.slice(beamEntryStart, sparkEntryStart)
    expect(beamEntry).toContain('inst.components.spellbook:SetSpellFn(nil)')
    expect(beamEntry).toContain('inst.components.aoetargeting:SetRange(10)')
    expect(beamEntry).toContain('inst.components.aoespell:SetSpellFn(spellbook_cast_1)')
    expect(beamEntry).toContain('execute = StartAOETargeting,')

    const sparkEntry = code.slice(sparkEntryStart)
    expect(sparkEntry).toContain('inst.components.spellbook:SetSpellFn(spellbook_cast_2)')
    expect(sparkEntry).toContain('inst.components.aoespell:SetSpellFn(nil)')
    expect(sparkEntry).toContain('inventory:CastSpellBookFromInv(inst)')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  // A summon-only spell can also aim (spellbookSpellSchema.aimed) without
  // being a beam — e.g. placing a light or a companion where the player
  // points, instead of always at the caster's own feet.
  it('wires a summon-only spell marked aimed through aoetargeting/aoespell, spawning at the aimed pos instead of the caster', () => {
    const wispStaff: ItemDef = {
      ...trinket,
      id: 'testaimedsummonstaff',
      spellbook: {
        source: 'static',
        spells: [
          { label: 'Ember Wisp', summonPrefab: 'emberlight', aimed: true },
          { label: 'Free Spark', summonPrefab: 'firefly' },
        ],
      },
    }
    const code = generateItemPrefab(wispStaff)
    expect(code).not.toContain('DoSpellBeamDamage')
    expect(code).not.toContain('StartSpellBeam')
    expect(code).toContain('inst:AddComponent("aoetargeting")')
    expect(code).toContain('inst:AddComponent("aoespell")')

    const wispEntryStart = code.indexOf('label = "Ember Wisp"')
    const sparkEntryStart = code.indexOf('label = "Free Spark"')
    const wispEntry = code.slice(wispEntryStart, sparkEntryStart)
    expect(wispEntry).not.toContain('SetRange')
    expect(wispEntry).toContain('inst.components.aoespell:SetSpellFn(spellbook_cast_1)')
    expect(wispEntry).toContain('execute = StartAOETargeting,')

    const cast1Start = code.indexOf('local function spellbook_cast_1')
    const cast2Start = code.indexOf('local function spellbook_cast_2')
    const cast1Body = code.slice(cast1Start, cast2Start)
    expect(cast1Body).toContain('user:ForceFacePoint(pos:Get())')
    expect(cast1Body).toContain('fx.Transform:SetPosition(pos:Get())')

    const cast2Body = code.slice(cast2Start)
    expect(cast2Body).not.toContain('ForceFacePoint')
    expect(cast2Body).toContain('fx.Transform:SetPosition(user.Transform:GetWorldPosition())')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  // The staff side (linkedContainer) can't know ahead of time which slot
  // items are aimed — it decodes the "isaimed" field off the net_string
  // payload at cast time, same as it already does for beam/nova/refraction.
  it('sets inst.spell_aimed on a spellDef item marked aimed, and a linkedContainer staff branches on it at runtime', () => {
    const wispSpell: ItemDef = {
      ...trinket,
      id: 'testaimedwispspell',
      spellDef: { label: 'Ember Wisp', summonPrefab: 'emberlight', aimed: true },
    }
    expect(generateItemPrefab(wispSpell)).toContain('inst.spell_aimed = true')

    const noAimSpell: ItemDef = { ...trinket, id: 'testnoaimwispspell', spellDef: { label: 'Sunbeam', summonPrefab: 'stafflight' } }
    expect(generateItemPrefab(noAimSpell)).not.toContain('spell_aimed')

    const linked: ItemDef = {
      ...trinket,
      id: 'testlinkedaimedsummonstaff',
      spellbook: { source: 'linkedContainer', containerItemId: 'testcodex' },
    }
    const code = generateItemPrefab(linked)
    expect(code).toContain('if isaimed == "1" then')
    // Not a `cond and a() or b()` ternary: SetPosition takes 3 return values
    // (x, y, z) and Lua's and/or truncates a multi-value expression down to
    // just the first one, so each branch calls SetPosition directly instead
    // (see linkedContainerSpellbookFunctionBlock's own comment).
    expect(code).toContain('fx.Transform:SetPosition(pos:Get())')
    expect(code).toContain('fx.Transform:SetPosition(user.Transform:GetWorldPosition())')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('omits the beam helper functions and the aoetargeting/aoespell components from a static spellbook when no spell in it uses beam', () => {
    const code = generateItemPrefab({
      ...trinket,
      id: 'testnobeamstaff',
      spellbook: { source: 'static', spells: [{ label: 'A', summonPrefab: 'x' }, { label: 'B', summonPrefab: 'y' }] },
    })
    expect(code).not.toContain('DoSpellBeamDamage')
    expect(code).not.toContain('StartSpellBeam')
    expect(code).not.toContain('aoetargeting')
    expect(code).not.toContain('aoespell')
  })

  it('shows a reticule marker at the beam\'s starting point and delays the damage tick when telegraphSeconds is set', () => {
    const beamStaff: ItemDef = {
      ...trinket,
      id: 'testtelegraphstaff',
      spellbook: {
        source: 'static',
        spells: [
          {
            label: 'Solar Beam',
            beam: { damagePerTick: 20, tickIntervalSeconds: 0.5, range: 10, durationSeconds: 3, telegraphSeconds: 0.5 },
          },
          { label: 'Free Spark', summonPrefab: 'firefly' },
        ],
      },
    }
    const code = generateItemPrefab(beamStaff)
    expect(code).toContain('local function StartSpellBeamTicking(user, beam)')
    expect(code).toContain('local function StartSpellBeam(user, beam)')
    expect(code).toContain('if beam.telegraph == nil then')
    expect(code).toContain('local marker = SpawnPrefab("reticule")')
    expect(code).toContain('marker.Transform:SetPosition(x + math.cos(angle) * 3, 0, z - math.sin(angle) * 3)')
    expect(code).toContain('user:DoTaskInTime(beam.telegraph, function()')
    expect(code).toContain('marker:Remove()')
    expect(code).toContain('StartSpellBeamTicking(user, beam)')
    expect(code).toContain(
      'StartSpellBeam(user, { damage = 20, tickinterval = 0.5, range = 10, duration = 3, telegraph = 0.5 })',
    )
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('skips the telegraph marker entirely when telegraphSeconds is not set, starting the beam ticking immediately', () => {
    const code = generateItemPrefab({
      ...trinket,
      id: 'testnotelegraphspell',
      spellDef: { label: 'Solar Beam', beam: { damagePerTick: 20, tickIntervalSeconds: 0.5, range: 10, durationSeconds: 3 } },
    })
    expect(code).toContain('inst.spell_beam = { damage = 20, tickinterval = 0.5, range = 10, duration = 3, telegraph = nil }')
  })

  // Confirmed real APIs: TheSim:FindEntities(..., radius, {"hostile"}) for the
  // blast (same proximity-scan technique creature.ts's sentry/orbit contact
  // damage already use) and Freezable:Freeze(freezetime) for the instant,
  // direct "stuck in place" lock (docs/dst-knowledge/patterns.md#71) — not
  // the gradual coldness buildup ItemDef.weapon's onHitEffect "freeze" uses.
  it('wires a static spell\'s nova as a one-shot aimed blast that damages and freezes everything hostile in radius', () => {
    const novaStaff: ItemDef = {
      ...trinket,
      id: 'testnovastaff',
      spellbook: {
        source: 'static',
        spells: [
          { label: 'Solar Nova', nova: { damage: 40, radius: 5, stunSeconds: 3 } },
          { label: 'Free Spark', summonPrefab: 'firefly' },
        ],
      },
    }
    const code = generateItemPrefab(novaStaff)
    expect(code).toContain('local function DoSpellNova(user, pos, nova)')
    expect(code).toContain('local victims = TheSim:FindEntities(x, y, z, nova.radius, { "hostile" })')
    expect(code).toContain('victim.components.health:DoDelta(-nova.damage, false, "solarnova", false, user)')
    expect(code).toContain('victim.components.freezable:Freeze(nova.stun)')
    expect(code).toContain('user:ForceFacePoint(pos:Get())')
    expect(code).toContain('DoSpellNova(user, pos, { damage = 40, radius = 5, stun = 3 })')

    expect(code).toContain('inst:AddComponent("aoetargeting")')
    expect(code).toContain('inst:AddComponent("aoespell")')
    const novaEntryStart = code.indexOf('label = "Solar Nova"')
    const sparkEntryStart = code.indexOf('label = "Free Spark"')
    const novaEntry = code.slice(novaEntryStart, sparkEntryStart)
    expect(novaEntry).toContain('inst.components.aoespell:SetSpellFn(spellbook_cast_1)')
    expect(novaEntry).toContain('execute = StartAOETargeting,')
    expect(novaEntry).not.toContain('SetRange')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('omits the nova helper function from a static spellbook when no spell in it uses nova', () => {
    const code = generateItemPrefab({
      ...trinket,
      id: 'testnonovastaff',
      spellbook: { source: 'static', spells: [{ label: 'A', summonPrefab: 'x' }, { label: 'B', summonPrefab: 'y' }] },
    })
    expect(code).not.toContain('DoSpellNova')
  })

  it('sets inst.spell_nova on a spellDef item with a nova, and a linkedContainer staff casts it with the aimed pos', () => {
    const novaSpell: ItemDef = { ...trinket, id: 'testnovaspell', spellDef: { label: 'Solar Nova', nova: { damage: 40, radius: 5, stunSeconds: 3 } } }
    expect(generateItemPrefab(novaSpell)).toContain('inst.spell_nova = { damage = 40, radius = 5, stun = 3 }')

    const linked: ItemDef = { ...trinket, id: 'testlinkednovastaff', spellbook: { source: 'linkedContainer', containerItemId: 'testcodex' } }
    const code = generateItemPrefab(linked)
    expect(code).toContain('local function DoSpellNova(user, pos, nova)')
    expect(code).toContain('if novadamage ~= "" then')
    expect(code).toContain('DoSpellNova(user, pos, { damage = tonumber(novadamage), radius = tonumber(novaradius), stun = tonumber(novastun) })')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  // Confirmed real APIs (docs/dst-knowledge/patterns.md#72):
  // TheSim:FindEntities(..., radius, {"player"}) is the same nearby-allies
  // scan squadAlertFunctionBlock (creature.ts) already uses, and
  // Health:SetInvincible(val) is the same toggle CreatureDef.invincible
  // already uses permanently — here flipped off again after the duration.
  // Never aimed, unlike beam/nova — it centers on the caster herself.
  it('wires a static spell\'s refraction as an unaimed self-centered buff that shields nearby players temporarily', () => {
    const refractionStaff: ItemDef = {
      ...trinket,
      id: 'testrefractionstaff',
      spellbook: {
        source: 'static',
        spells: [
          { label: 'Refraction', refraction: { radius: 8, immuneSeconds: 5 } },
          { label: 'Free Spark', summonPrefab: 'firefly' },
        ],
      },
    }
    const code = generateItemPrefab(refractionStaff)
    expect(code).toContain('local function DoSpellRefraction(user, refraction)')
    expect(code).toContain('local allies = TheSim:FindEntities(x, y, z, refraction.radius, { "player" })')
    expect(code).toContain('ally.components.health:SetInvincible(true)')
    expect(code).toContain('ally:DoTaskInTime(refraction.duration, function()')
    expect(code).toContain('ally.components.health:SetInvincible(false)')
    expect(code).toContain('DoSpellRefraction(user, { radius = 8, duration = 5 })')

    // Unaimed: no aoetargeting/aoespell components, no ForceFacePoint, and
    // the wheel entry stays on the instant CastSpellBookFromInv path.
    expect(code).not.toContain('aoetargeting')
    expect(code).not.toContain('aoespell')
    expect(code).not.toContain('ForceFacePoint')
    const refractionEntryStart = code.indexOf('label = "Refraction"')
    const sparkEntryStart = code.indexOf('label = "Free Spark"')
    const refractionEntry = code.slice(refractionEntryStart, sparkEntryStart)
    expect(refractionEntry).toContain('inst.components.spellbook:SetSpellFn(spellbook_cast_1)')
    expect(refractionEntry).toContain('inventory:CastSpellBookFromInv(inst)')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('omits the refraction helper function from a static spellbook when no spell in it uses refraction', () => {
    const code = generateItemPrefab({
      ...trinket,
      id: 'testnorefractionstaff',
      spellbook: { source: 'static', spells: [{ label: 'A', summonPrefab: 'x' }, { label: 'B', summonPrefab: 'y' }] },
    })
    expect(code).not.toContain('DoSpellRefraction')
  })

  it('sets inst.spell_refraction on a spellDef item with a refraction, and a linkedContainer staff casts it', () => {
    const refractionSpell: ItemDef = {
      ...trinket,
      id: 'testrefractionspell',
      spellDef: { label: 'Refraction', refraction: { radius: 8, immuneSeconds: 5 } },
    }
    expect(generateItemPrefab(refractionSpell)).toContain('inst.spell_refraction = { radius = 8, duration = 5 }')

    const linked: ItemDef = {
      ...trinket,
      id: 'testlinkedrefractionstaff',
      spellbook: { source: 'linkedContainer', containerItemId: 'testcodex' },
    }
    const code = generateItemPrefab(linked)
    expect(code).toContain('local function DoSpellRefraction(user, refraction)')
    expect(code).toContain('if refractionradius ~= "" then')
    expect(code).toContain('DoSpellRefraction(user, { radius = tonumber(refractionradius), duration = tonumber(refractionduration) })')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  // TheSim:FindEntities(..., radius, nil, {"INLIMBO", "player"}) casts a wide
  // net (no oneOfTags requirement, unlike nova's {"hostile"}) — every
  // creature in range gets caught regardless of hostile/neutral/passive
  // status, players excluded. Pure stun via Freezable:Freeze, no damage.
  // Never aimed, unlike beam/nova — it centers on the caster herself.
  it('wires a static spell\'s flashbang as an unaimed self-centered stun that catches every non-player creature nearby', () => {
    const flashbangStaff: ItemDef = {
      ...trinket,
      id: 'testflashbangstaff',
      spellbook: {
        source: 'static',
        spells: [
          { label: 'Flashbang', flashbang: { radius: 8, stunSeconds: 3 } },
          { label: 'Free Spark', summonPrefab: 'firefly' },
        ],
      },
    }
    const code = generateItemPrefab(flashbangStaff)
    expect(code).toContain('local function DoSpellFlashbang(user, flashbang)')
    expect(code).toContain('local victims = TheSim:FindEntities(x, y, z, flashbang.radius, nil, { "INLIMBO", "player" })')
    expect(code).toContain('victim.components.freezable:Freeze(flashbang.stun)')
    expect(code).toContain('DoSpellFlashbang(user, { radius = 8, stun = 3 })')

    // Unaimed: no aoetargeting/aoespell components, no ForceFacePoint, and
    // the wheel entry stays on the instant CastSpellBookFromInv path.
    expect(code).not.toContain('aoetargeting')
    expect(code).not.toContain('aoespell')
    expect(code).not.toContain('ForceFacePoint')
    const flashbangEntryStart = code.indexOf('label = "Flashbang"')
    const sparkEntryStart = code.indexOf('label = "Free Spark"')
    const flashbangEntry = code.slice(flashbangEntryStart, sparkEntryStart)
    expect(flashbangEntry).toContain('inst.components.spellbook:SetSpellFn(spellbook_cast_1)')
    expect(flashbangEntry).toContain('inventory:CastSpellBookFromInv(inst)')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('omits the flashbang helper function from a static spellbook when no spell in it uses flashbang', () => {
    const code = generateItemPrefab({
      ...trinket,
      id: 'testnoflashbangstaff',
      spellbook: { source: 'static', spells: [{ label: 'A', summonPrefab: 'x' }, { label: 'B', summonPrefab: 'y' }] },
    })
    expect(code).not.toContain('DoSpellFlashbang')
  })

  it('sets inst.spell_flashbang on a spellDef item with a flashbang, and a linkedContainer staff casts it', () => {
    const flashbangSpell: ItemDef = {
      ...trinket,
      id: 'testflashbangspell',
      spellDef: { label: 'Flashbang', flashbang: { radius: 8, stunSeconds: 3 } },
    }
    expect(generateItemPrefab(flashbangSpell)).toContain('inst.spell_flashbang = { radius = 8, stun = 3 }')

    const linked: ItemDef = {
      ...trinket,
      id: 'testlinkedflashbangstaff',
      spellbook: { source: 'linkedContainer', containerItemId: 'testcodex' },
    }
    const code = generateItemPrefab(linked)
    expect(code).toContain('local function DoSpellFlashbang(user, flashbang)')
    expect(code).toContain('if flashbangradius ~= "" then')
    expect(code).toContain('DoSpellFlashbang(user, { radius = tonumber(flashbangradius), stun = tonumber(flashbangstun) })')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('rejects an item with both spellbook and spellEffect set', () => {
    const both: ItemDef = {
      ...trinket,
      spellEffect: 'createLight',
      spellbook: {
        source: 'static',
        spells: [
          { label: 'A', summonPrefab: 'x' },
          { label: 'B', summonPrefab: 'y' },
        ],
      },
    }
    expect(itemDefSchema.safeParse(both).success).toBe(false)
  })

  it('rejects a spellbook with fewer than 2 spells', () => {
    const oneSpell: ItemDef = {
      ...trinket,
      spellbook: { source: 'static', spells: [{ label: 'A', summonPrefab: 'x' }] },
    }
    expect(itemDefSchema.safeParse(oneSpell).success).toBe(false)
  })

  // Reproduced in-game (twice): componentactions.lua's own INVENTORY.spellbook
  // handler — the code deciding whether "Use Spell Book" even appears in the
  // right-click menu — gates on SpellBook:CanBeUsedBy(user), which requires
  // self.items to ALREADY be non-empty, checked independently and BEFORE
  // SetShouldOpenFn/ShouldOpen ever runs (that only fires once the action
  // already exists, from actions.lua's USESPELLBOOK.pre_action_cb). The old
  // SetShouldOpenFn-only design left self.items permanently nil, so the
  // action never appeared on the staff at all — confirmed against real
  // componentactions.lua/actions.lua. Fix: a periodic task keeps self.items
  // proactively in sync (RefreshSpellbookItems), and the container's own
  // slots (server-only, invisible client-side unless actually open — see
  // container_replica.lua) are mirrored into a plain per-entity netvar
  // (codex.spell_contents) that both sides can read regardless of open state.
  it('wires a linkedContainer spellbook to proactively keep its spells in sync via a periodic task', () => {
    const linked: ItemDef = {
      ...trinket,
      id: 'testlinkedstaff',
      spellbook: { source: 'linkedContainer', containerItemId: 'testcodex' },
    }
    const code = generateItemPrefab(linked)
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()

    expect(code).toContain('inst:AddComponent("spellbook")')
    expect(code).not.toContain('SPELLBOOK_SPELLS')
    expect(code).not.toContain('SetShouldOpenFn')
    expect(code).not.toContain('codex.components.container')
    expect(code).toContain('local function rebuild_spellbook_items(user)')
    expect(code).toContain('user.replica.inventory ~= nil and user.replica.inventory:FindItem(function(item)')
    expect(code).toContain('return item.prefab == "testcodex"')
    expect(code).toContain('if codex == nil or codex.spell_contents == nil then')
    expect(code).toContain('for entry in codex.spell_contents:value():gmatch("[^\\30]+") do')
    expect(code).toContain('local function GetSpellbookOwner(inst)')
    expect(code).toContain('inst.components.inventoryitem:GetGrandOwner()')
    expect(code).toContain('inst.replica.inventoryitem:IsGrandOwner(ThePlayer)')
    expect(code).toContain('local function RefreshSpellbookItems(inst)')
    expect(code).toContain('inst.components.spellbook:SetItems(owner ~= nil and rebuild_spellbook_items(owner) or nil)')
    expect(code).toContain('inst:DoPeriodicTask(0.5, RefreshSpellbookItems)')
  })

  // A linkedContainer spellbook whose containerItemId is the item's OWN id
  // (equipping and casting are the same item, e.g. a merged staff+codex) —
  // confirmed against the real components/inventory.lua: the replica's
  // FindItem only scans itemslots/activeitem/overflow, never equipslots, so
  // it can never find the item while it's actually worn in hand. Falls back
  // to GetEquippedItem(EQUIPSLOTS.HANDS), which IS replicated to both sides.
  it('finds a self-referential linkedContainer codex via GetEquippedItem when FindItem (itemslots only) can\'t see it worn in hand', () => {
    const selfLinked: ItemDef = {
      ...trinket,
      id: 'testselflinkedstaff',
      spellbook: { source: 'linkedContainer', containerItemId: 'testselflinkedstaff' },
    }
    const code = generateItemPrefab(selfLinked)
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
    expect(code).toContain('local function FindCodex(user)')
    expect(code).toContain('user.replica.inventory:GetEquippedItem(EQUIPSLOTS.HANDS)')
    expect(code).toContain('if equipped ~= nil and equipped.prefab == "testselflinkedstaff" then')
    expect(code).toContain('local function rebuild_spellbook_items(user)')
    expect(code).toContain('local codex = FindCodex(user)')
  })

  it('spends the slot item\'s own mana cost (decoded from the netvar payload) when casting a linkedContainer spell', () => {
    const linked: ItemDef = {
      ...trinket,
      id: 'testlinkedstaff2',
      spellbook: { source: 'linkedContainer', containerItemId: 'testcodex' },
    }
    const code = generateItemPrefab(linked)
    expect(code).toContain('not user.components.mana:Spend(tonumber(manacost))')
  })

  it('gates a linkedContainer spell\'s wheel entry on checkenabled (reading the client-visible mana_current netvar) too', () => {
    const linked: ItemDef = {
      ...trinket,
      id: 'testlinkedstaff4',
      spellbook: { source: 'linkedContainer', containerItemId: 'testcodex' },
    }
    const code = generateItemPrefab(linked)
    expect(code).toContain(
      'checkenabled = function(owner) return manacost == "" or owner.mana_current == nil or owner.mana_current:value() >= tonumber(manacost) end,',
    )
    expect(code).not.toContain('owner.components.mana')
  })

  it('always wires the beam helper functions for a linkedContainer spellbook, since the codex contents are only known at runtime', () => {
    const linked: ItemDef = {
      ...trinket,
      id: 'testlinkedstaff3',
      spellbook: { source: 'linkedContainer', containerItemId: 'testcodex' },
    }
    const code = generateItemPrefab(linked)
    expect(code).toContain('local function DoSpellBeamDamage(user, beam)')
    expect(code).toContain('local function StartSpellBeam(user, beam)')
    expect(code).toContain('if beamdamage ~= "" then')
    expect(code).toContain('user:ForceFacePoint(pos:Get())')
    expect(code).toContain('StartSpellBeam(user, {')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  // A linkedContainer spellbook can't know at generation time whether the
  // codex will ever hold a beam spell (its contents are read live at cast
  // time — see rebuild_spellbook_items), so unlike the static case it always
  // carries aoetargeting/aoespell and branches per-slotitem at runtime.
  it('always wires aoetargeting/aoespell for a linkedContainer spellbook, branching per slot item at runtime', () => {
    const linked: ItemDef = {
      ...trinket,
      id: 'testlinkedaimstaff',
      spellbook: { source: 'linkedContainer', containerItemId: 'testcodex' },
    }
    const code = generateItemPrefab(linked)
    expect(code).toContain('inst:AddComponent("aoetargeting")')
    expect(code).toContain('inst.components.aoetargeting.reticule.mouseenabled = true')
    expect(code).toContain('inst:AddComponent("aoespell")')
    expect(code).toContain('if isaimed == "1" then')
    expect(code).toContain('inst.components.spellbook:SetSpellFn(nil)')
    expect(code).toContain('inst.components.aoetargeting:SetRange(tonumber(beamrange))')
    expect(code).toContain('inst.components.aoespell:SetSpellFn(cast)')
    expect(code).toContain('execute = (isaimed == "1") and StartAOETargeting or function(inst)')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  // Confirmed real, always-present vanilla API (docs/dst-knowledge/patterns.md#62):
  // health/sanity/hunger components' :DoDelta(n) — same mechanism the base game
  // already uses everywhere for damage/healing/hunger loss. Lets a spell be a
  // direct buff instead of only "spawn a prefab at the caster".
  it('applies a static spell\'s health/sanity/hunger deltas to the caster, and skips SpawnPrefab when no prefab is set', () => {
    const buffStaff: ItemDef = {
      ...trinket,
      id: 'testbuffstaff',
      spellbook: {
        source: 'static',
        spells: [
          { label: 'Solstice Blessing', healthDelta: 15, sanityDelta: 15 },
          { label: 'Sunfed', hungerDelta: 25 },
        ],
      },
    }
    const code = generateItemPrefab(buffStaff)
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()

    expect(code).not.toContain('SpawnPrefab')
    expect(code).toContain('if user.components.health ~= nil then')
    expect(code).toContain('user.components.health:DoDelta(15)')
    expect(code).toContain('if user.components.sanity ~= nil then')
    expect(code).toContain('user.components.sanity:DoDelta(15)')
    expect(code).toContain('if user.components.hunger ~= nil then')
    expect(code).toContain('user.components.hunger:DoDelta(25)')
  })

  it('reads the slot item\'s own stat deltas (decoded from the netvar payload) at cast time for a linkedContainer spell', () => {
    const linked: ItemDef = {
      ...trinket,
      id: 'testlinkedstaff3',
      spellbook: { source: 'linkedContainer', containerItemId: 'testcodex' },
    }
    const code = generateItemPrefab(linked)
    expect(code).toContain('if healthdelta ~= "" and user.components.health ~= nil then')
    expect(code).toContain('user.components.health:DoDelta(tonumber(healthdelta))')
    expect(code).toContain('if sanitydelta ~= "" and user.components.sanity ~= nil then')
    expect(code).toContain('if hungerdelta ~= "" and user.components.hunger ~= nil then')
    expect(code).toContain('if summonprefab ~= "" then')
  })

  // The other half of the linkedContainer mechanic: the container item itself
  // (acceptsTag: 'spell') mirrors its own contents into a netvar every time a
  // spell item is put in or taken out — this is what makes rebuild_spellbook_items
  // (above) work on the client without the container ever needing to be open.
  it('mirrors a spell container\'s contents into a netvar whenever items are put in or taken out', () => {
    const codex: ItemDef = {
      ...trinket,
      id: 'testcodex',
      container: { source: 'own', widget: { source: 'vanilla', reusePrefab: 'treasurechest' }, sideWidget: false, acceptsTag: 'spell' },
    }
    const code = generateItemPrefab(codex)
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()

    expect(code).toContain('inst.spell_contents = net_string(inst.GUID, "testcodex.spell_contents", "spell_contentsdirty")')
    expect(code).toContain('local function UpdateSpellContents(inst)')
    expect(code).toContain('for slot = 1, inst.components.container.numslots do')
    expect(code).toContain('local slotitem = inst.components.container.slots[slot]')
    expect(code).toContain('if slotitem ~= nil and slotitem.spell_label ~= nil then')
    expect(code).toContain('local flashbang = slotitem.spell_flashbang')
    expect(code).toContain('flashbang ~= nil and tostring(flashbang.radius) or ""')
    expect(code).toContain('flashbang ~= nil and tostring(flashbang.stun) or ""')
    expect(code).toContain('inst.spell_contents:set(table.concat(parts, "\\30"))')
    expect(code).toContain('inst:ListenForEvent("itemget", UpdateSpellContents)')
    expect(code).toContain('inst:ListenForEvent("itemlose", UpdateSpellContents)')
    expect(code).toContain('UpdateSpellContents(inst)')
  })

  it('does not declare the spell_contents netvar for a plain container without acceptsTag "spell"', () => {
    const bag: ItemDef = {
      ...trinket,
      id: 'testplainbag2',
      container: { source: 'own', widget: { source: 'vanilla', reusePrefab: 'treasurechest' }, sideWidget: false },
    }
    const code = generateItemPrefab(bag)
    expect(code).not.toContain('spell_contents')
    expect(code).not.toContain('UpdateSpellContents')
  })

  it('marks a pure stat-effect spellDef item with nil summonPrefab and the right deltas', () => {
    const spell: ItemDef = {
      ...trinket,
      id: 'testblessingspell',
      spellDef: { label: 'Solstice Blessing', healthDelta: 15, sanityDelta: 15 },
    }
    const code = generateItemPrefab(spell)
    expect(code).toContain('inst.spell_summonprefab = nil')
    expect(code).toContain('inst.spell_healthdelta = 15')
    expect(code).toContain('inst.spell_sanitydelta = 15')
    expect(code).toContain('inst.spell_hungerdelta = nil')
  })

  it('sets inst.spell_beam as a plain table on a spellDef item with a beam, and omits it otherwise', () => {
    const beamSpell: ItemDef = {
      ...trinket,
      id: 'testbeamspell',
      spellDef: { label: 'Solar Beam', beam: { damagePerTick: 20, tickIntervalSeconds: 0.5, range: 10, durationSeconds: 3 } },
    }
    const code = generateItemPrefab(beamSpell)
    expect(code).toContain('inst.spell_beam = { damage = 20, tickinterval = 0.5, range = 10, duration = 3, telegraph = nil }')

    const noBeam: ItemDef = { ...trinket, id: 'testnobeamspell', spellDef: { label: 'Sunbeam', summonPrefab: 'stafflight' } }
    expect(generateItemPrefab(noBeam)).not.toContain('spell_beam')
  })

  it('accepts a spell that only has a beam, with no prefab or stat delta', () => {
    const beamOnly: ItemDef = {
      ...trinket,
      spellbook: {
        source: 'static',
        spells: [
          { label: 'Solar Beam', beam: { damagePerTick: 20, tickIntervalSeconds: 0.5, range: 10, durationSeconds: 3 } },
          { label: 'Sunbeam', summonPrefab: 'stafflight' },
        ],
      },
    }
    expect(itemDefSchema.safeParse(beamOnly).success).toBe(true)
  })

  it('rejects a spell with no prefab and no stat effect at all', () => {
    const emptySpell: ItemDef = {
      ...trinket,
      spellbook: {
        source: 'static',
        spells: [{ label: 'Nothing' }, { label: 'Sunbeam', summonPrefab: 'stafflight' }],
      },
    }
    expect(itemDefSchema.safeParse(emptySpell).success).toBe(false)
  })

  it('marks a spellDef item with the "spell" tag and stores its cast data on the instance', () => {
    const spell: ItemDef = {
      ...trinket,
      id: 'testspellitem',
      spellDef: { label: 'Sunbeam', summonPrefab: 'stafflight', manaCost: 20 },
    }
    const code = generateItemPrefab(spell)
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()

    expect(code).toContain('inst:AddTag("spell")')
    expect(code).toContain('inst.spell_label = "Sunbeam"')
    expect(code).toContain('inst.spell_summonprefab = "stafflight"')
    expect(code).toContain('inst.spell_manacost = 20')
  })

  it('leaves spell_manacost nil for a spellDef item with no mana cost set', () => {
    const spell: ItemDef = {
      ...trinket,
      id: 'testfreespellitem',
      spellDef: { label: 'Fireflies', summonPrefab: 'firefly' },
    }
    const code = generateItemPrefab(spell)
    expect(code).toContain('inst.spell_manacost = nil')
  })

  it('rejects an item that is both a spell and a spell caster', () => {
    const both: ItemDef = {
      ...trinket,
      spellDef: { label: 'Sunbeam', summonPrefab: 'stafflight' },
      spellbook: { source: 'linkedContainer', containerItemId: 'testcodex' },
    }
    expect(itemDefSchema.safeParse(both).success).toBe(false)
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
    const customBuildArmor: ItemDef = { ...armor, animation: undefined }
    const code = generateItemPrefab(customBuildArmor)
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
    const helm: ItemDef = { ...armor, animation: undefined, armor: { ...armor.armor!, equipSlot: 'head' } }
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

  it('wires a solar lantern as a head-slot fueled light that never accepts fuel items', () => {
    const lantern: ItemDef = {
      ...trinket,
      solarLantern: { maxFuel: 100, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3, radius: 4 },
    }
    const code = generateItemPrefab(lantern)
    expect(code).toContain('inst.entity:AddLight()')
    expect(code).toContain('inst.Light:SetRadius(TUNING.TESTTRINKET_LIGHT_RADIUS)')
    expect(code).toContain('inst.components.equippable.equipslot = EQUIPSLOTS.HEAD')
    expect(code).toContain('inst:AddComponent("fueled")')
    expect(code).toContain('inst.components.fueled.fueltype = FUELTYPE.MAGIC')
    expect(code).toContain('inst.components.fueled:InitializeFuelLevel(TUNING.TESTTRINKET_MAX_FUEL)')
    expect(code).toContain('inst.components.fueled.rate = TUNING.TESTTRINKET_DRAIN_RATE')
    expect(code).not.toContain('accepting = true')
    expect(code).not.toContain('CanAcceptFuelItem')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('only recharges a solar lantern while standing in daylight above ground, never from a held fuel item', () => {
    const lantern: ItemDef = {
      ...trinket,
      solarLantern: { maxFuel: 100, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3, radius: 4 },
    }
    const code = generateItemPrefab(lantern)
    expect(code).toContain('local function SolarLanternRechargeTick(inst)')
    expect(code).toContain('if TheWorld.state.isday and not TheWorld:HasTag("cave") and not inst.components.fueled:IsFull() then')
    expect(code).toContain('inst.components.fueled:DoDelta(TUNING.TESTTRINKET_RECHARGE_RATE)')
    expect(code).toContain('inst:DoPeriodicTask(1, SolarLanternRechargeTick)')
  })

  it('toggles the lantern light and fuel consumption on equip/unequip', () => {
    const lantern: ItemDef = {
      ...trinket,
      solarLantern: { maxFuel: 100, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3, radius: 4 },
    }
    const code = generateItemPrefab(lantern)
    expect(code).toContain('inst.Light:Enable(true)')
    expect(code).toContain('inst.components.fueled:StartConsuming()')
    expect(code).toContain('inst.Light:Enable(false)')
    expect(code).toContain('inst.components.fueled:StopConsuming()')
  })

  it('rejects a solar lantern combined with armor or a weapon, since both would claim an equip slot', () => {
    const lantern = { ...trinket, solarLantern: { maxFuel: 100, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3, radius: 4 } }
    expect(itemDefSchema.safeParse(lantern).success).toBe(true)
    expect(itemDefSchema.safeParse({ ...lantern, armor: armor.armor }).success).toBe(false)
    expect(itemDefSchema.safeParse({ ...lantern, weapon: sword.weapon }).success).toBe(false)
  })

  it('wires a summoning totem as a fueled spellcaster that spawns/dismisses its own tracked creature', () => {
    const totem: ItemDef = {
      ...trinket,
      summonTotem: { summonPrefab: 'sunorb', maxDurability: 150, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3 },
    }
    const code = generateItemPrefab(totem)
    expect(code).toContain('inst:AddComponent("fueled")')
    expect(code).toContain('inst.components.fueled.fueltype = FUELTYPE.MAGIC')
    expect(code).toContain('inst.components.fueled:InitializeFuelLevel(TUNING.TESTTRINKET_MAX_DURABILITY)')
    expect(code).toContain('inst.components.fueled.rate = TUNING.TESTTRINKET_DRAIN_RATE')
    expect(code).toContain('inst:AddComponent("reticule")')
    expect(code).toContain('inst:AddComponent("spellcaster")')
    expect(code).toContain('inst.components.spellcaster:SetSpellFn(summontotem)')
    expect(code).toContain('local function summontotem(staff, target, pos)')
    expect(code).toContain('if staff.components.fueled ~= nil and staff.components.fueled:IsEmpty() then')
    expect(code).toContain('local creature = SpawnPrefab("sunorb")')
    expect(code).toContain('creature.components.follower:SetLeader(staff.components.inventoryitem.owner)')
    expect(code).toContain('staff._totemcreature = creature')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('toggles the totem: using it again while the creature is alive dismisses it instead of summoning a second one', () => {
    const totem: ItemDef = {
      ...trinket,
      summonTotem: { summonPrefab: 'sunorb', maxDurability: 150, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3 },
    }
    const code = generateItemPrefab(totem)
    expect(code).toContain('if staff._totemcreature ~= nil and staff._totemcreature:IsValid() then')
    expect(code).toContain('staff._totemcreature:Remove()')
    expect(code).toContain('staff._totemcreature = nil')
  })

  it('despawns the totem creature as soon as its fuel runs out, and only recharges it in daylight above ground', () => {
    const totem: ItemDef = {
      ...trinket,
      summonTotem: { summonPrefab: 'sunorb', maxDurability: 150, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3 },
    }
    const code = generateItemPrefab(totem)
    expect(code).toContain('local function OnTotemFuelChanged(inst)')
    expect(code).toContain('if inst.components.fueled:IsEmpty() and inst._totemcreature ~= nil then')
    expect(code).toContain('inst:ListenForEvent("percentusedchange", OnTotemFuelChanged)')
    expect(code).toContain('local function TotemRechargeTick(inst)')
    expect(code).toContain('if TheWorld.state.isday and not TheWorld:HasTag("cave") and not inst.components.fueled:IsFull() then')
    expect(code).toContain('inst.components.fueled:DoDelta(TUNING.TESTTRINKET_RECHARGE_RATE)')
  })

  it('rejects a summoning totem combined with another spellcaster-based effect, since both share the same aim-and-cast mechanism', () => {
    const totem = { ...trinket, summonTotem: { summonPrefab: 'sunorb', maxDurability: 150, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3 } }
    expect(itemDefSchema.safeParse(totem).success).toBe(true)
    expect(itemDefSchema.safeParse({ ...totem, spellEffect: 'createLight' as const }).success).toBe(false)
    expect(itemDefSchema.safeParse({ ...totem, tameBomb: { radius: 5, cloudDurationSeconds: 5, tameDurationSeconds: 60 } }).success).toBe(false)
  })

  it('wires a solar battery as a toggle-activated, ground-only charger, tagged so a Solar Prism can be targeted by other solar items', () => {
    const prism: ItemDef = { ...trinket, solarBattery: { maxCharge: 200, chargePerSecondInSunlight: 0.5 } }
    const code = generateItemPrefab(prism)
    expect(code).toContain('inst:AddTag("solarprism")')
    expect(code).toContain('inst:AddComponent("fueled")')
    expect(code).toContain('inst.components.fueled.fueltype = FUELTYPE.MAGIC')
    expect(code).toContain('inst.components.fueled.maxfuel = TUNING.TESTTRINKET_MAX_CHARGE')
    expect(code).toContain('inst:AddComponent("activatable")')
    expect(code).toContain('inst.components.activatable.OnActivate = OnActivate')
    expect(code).toContain('local function OnActivate(inst, doer)')
    expect(code).toContain('inst.is_on = not inst.is_on')
    expect(code).toContain('local function ChargeTick(inst)')
    expect(code).toContain('if inst.is_on and TheWorld.state.isday and not TheWorld:HasTag("cave")')
    expect(code).toContain('and inst.components.inventoryitem.owner == nil and not inst.components.fueled:IsFull() then')
    expect(code).toContain('inst.components.fueled:DoDelta(TUNING.TESTTRINKET_CHARGE_RATE)')
    expect(code).toContain('inst:DoPeriodicTask(1, ChargeTick)')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('drains its own charge into a target\'s fuel, or into the wielder\'s mana with no target, then assigns both onto its own inst', () => {
    const prism: ItemDef = { ...trinket, solarBattery: { maxCharge: 200, chargePerSecondInSunlight: 0.5 } }
    const code = generateItemPrefab(prism)
    expect(code).toContain('local function DrainIntoMana(inst, doer)')
    expect(code).toContain('if inst.components.fueled:IsEmpty() or doer.components.mana == nil then')
    expect(code).toContain('doer.components.mana:DoDelta(amount)')
    expect(code).toContain('local function DrainIntoTarget(inst, target)')
    expect(code).toContain('if inst.components.fueled:IsEmpty() or target.components.fueled == nil then')
    expect(code).toContain('target.components.fueled:DoDelta(amount)')
    expect(code).toContain('inst.DrainIntoMana = DrainIntoMana')
    expect(code).toContain('inst.DrainIntoTarget = DrainIntoTarget')
  })

  it('tags the solar lantern and summoning totem as valid Solar Prism refuel targets', () => {
    const lantern: ItemDef = {
      ...trinket,
      solarLantern: { maxFuel: 100, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3, radius: 4 },
    }
    expect(generateItemPrefab(lantern)).toContain('inst:AddTag("solarfueled")')

    const totem: ItemDef = {
      ...trinket,
      summonTotem: { summonPrefab: 'sunorb', maxDurability: 150, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3 },
    }
    expect(generateItemPrefab(totem)).toContain('inst:AddTag("solarfueled")')

    expect(generateItemPrefab(trinket)).not.toContain('solarfueled')
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
      container: { source: 'own', widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: true },
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
      container: { source: 'own', widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: true },
    }
    expect(generateItemPrefab(vanillaBag)).not.toContain('ui_testbag')

    const customBag: ItemDef = {
      ...trinket,
      id: 'testcustombag',
      container: { source: 'own', widget: { source: 'custom', slots: 8, columns: 2 }, sideWidget: false, acceptsTag: 'pocketwatch' },
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
        source: 'own',
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
      container: { source: 'own', widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: true },
    }
    const code = generateItemPrefab(plainBag)
    expect(code).not.toContain('preserver')
  })

  it('closes the container when it is put away, for every container item (patterns.md#20)', () => {
    const bag: ItemDef = {
      ...trinket,
      id: 'testbag',
      container: { source: 'own', widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: true },
    }
    const code = generateItemPrefab(bag)
    expect(code).toContain('inst.components.inventoryitem:SetOnPutInInventoryFn(function(inst)')
    expect(code).toContain('inst.components.container:Close()')
  })

  it('wires container_proxy + AttachSharedContainer for a pocketDimension container, not AddComponent("container")', () => {
    const bag: ItemDef = {
      ...trinket,
      id: 'testvoidbag',
      container: { source: 'pocketDimension', dimension: 'shadow' },
    }
    const code = generateItemPrefab(bag)
    expect(code).toContain('inst:AddComponent("container_proxy")')
    expect(code).not.toContain('inst:AddComponent("container")')
    expect(code).toContain('local function AttachSharedContainer(inst)')
    expect(code).toContain('inst.components.container_proxy:SetMaster(TheWorld:GetPocketDimensionContainer("shadow"))')
    expect(code).toContain('inst.OnLoadPostPass = AttachSharedContainer')
    expect(code).toContain('if not POPULATING then')
    expect(code).toContain('inst.components.container_proxy:Close()')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
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
