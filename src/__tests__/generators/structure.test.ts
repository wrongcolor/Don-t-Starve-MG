import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { generateStructureFiles, generateStructureItemPrefab, generateStructurePrefab } from '../../generators/structure'
import type { StructureDef } from '../../types/modProject'
import { sampleProject } from '../fixtures'

describe('generateStructureFiles', () => {
  const [structure] = sampleProject.structures

  it('checks TheWorld.ismastersim right after SetPristine, before server components', () => {
    const code = generateStructurePrefab(structure)
    const pristineIdx = code.indexOf('inst.entity:SetPristine()')
    const ismastersimIdx = code.indexOf('if not TheWorld.ismastersim then')
    const componentIdx = code.indexOf('inst:AddComponent("lootdropper")')

    expect(pristineIdx).toBeGreaterThan(-1)
    expect(ismastersimIdx).toBeGreaterThan(pristineIdx)
    expect(componentIdx).toBeGreaterThan(ismastersimIdx)
  })

  it('always generates both the prefab and its placer — every structure gets one', () => {
    const files = generateStructureFiles(structure)
    expect(Object.keys(files).sort()).toEqual(
      ['scripts/prefabs/teststructure.lua', 'scripts/prefabs/teststructure_placer.lua'].sort(),
    )
  })

  it('is never an inventory item — MakeObstaclePhysics + tag "structure" instead (patterns.md#25)', () => {
    const code = generateStructurePrefab(structure)
    expect(code).toContain('MakeObstaclePhysics(inst, 0.5)')
    expect(code).not.toContain('MakeInventoryPhysics')
    expect(code).toContain('inst:AddTag("structure")')
    expect(code).not.toContain('inst:AddTag("item")')
    expect(code).not.toContain('inst:AddComponent("inventoryitem")')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires workable + hammer-destroy, dropping loot if any', () => {
    const code = generateStructurePrefab(structure)
    expect(code).toContain('inst:AddComponent("lootdropper")')
    expect(code).toContain('inst:AddComponent("workable")')
    expect(code).toContain('inst.components.workable:SetWorkAction(ACTIONS.HAMMER)')
    expect(code).toContain('inst.components.workable:SetOnFinishCallback(onhammered)')
    expect(code).toContain('local function onhammered(inst)')
    expect(code).toContain('inst.components.lootdropper:DropLoot()')
    expect(code).toContain('inst:Remove()')
  })

  it('adds AddChancedLoot calls for each configured loot drop', () => {
    const looted: StructureDef = { ...structure, id: 'testlootedstructure', loot: [{ prefab: 'boards', chance: 0.5 }] }
    const code = generateStructurePrefab(looted)
    expect(code).toContain('inst.components.lootdropper:AddChancedLoot("boards", 0.5)')
  })

  it('does not wire the container auto-close-on-pickup (no inventoryitem to hook)', () => {
    const container: StructureDef = {
      ...structure,
      id: 'teststructurebag',
      container: { source: 'own', widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: false },
    }
    const code = generateStructurePrefab(container)
    expect(code).toContain('inst:AddComponent("container")')
    expect(code).not.toContain('SetOnPutInInventoryFn')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires container_proxy + AttachSharedContainer for a pocketDimension container, not AddComponent("container")', () => {
    const voidChest: StructureDef = {
      ...structure,
      id: 'testvoidchest',
      container: { source: 'pocketDimension', dimension: 'shadow' },
    }
    const code = generateStructurePrefab(voidChest)
    expect(code).toContain('inst:AddComponent("container_proxy")')
    expect(code).not.toContain('inst:AddComponent("container")')
    expect(code).toContain('local function AttachSharedContainer(inst)')
    expect(code).toContain('inst.components.container_proxy:SetMaster(TheWorld:GetPocketDimensionContainer("shadow"))')
    expect(code).toContain('inst.OnLoadPostPass = AttachSharedContainer')
    expect(code).toContain('if not POPULATING then')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires teleporter + auto-pairing via a shared GLOBAL table when teleportPair is set (patterns.md#23)', () => {
    const teleporter: StructureDef = { ...structure, id: 'testteleporter', teleportPair: true }
    const code = generateStructurePrefab(teleporter)
    expect(code).toContain('inst:AddComponent("teleporter")')
    expect(code).toContain('LinkTeleportPair(inst)')
    expect(code).toContain('GLOBAL.TELEPORT_PAIRS = GLOBAL.TELEPORT_PAIRS or {}')
    expect(code).toContain('a.components.teleporter:Target(b)')
    expect(code).toContain('b.components.teleporter:Target(a)')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires a day-start chance to spawn a prefab within a range, gated on phasechanged == "day" (beefaloherd.lua)', () => {
    const spawner: StructureDef = { ...structure, id: 'testspawner', daySpawner: { prefab: 'deerclops', chance: 0.1, range: 40 } }
    const code = generateStructurePrefab(spawner)
    expect(code).toContain('local function trydayspawn(inst, src, phase)')
    expect(code).toContain('if phase ~= "day" or math.random() > TUNING.TESTSPAWNER_SPAWN_CHANCE then')
    expect(code).toContain('FindWalkableOffset(Vector3(x, y, z), math.random() * TWOPI, TUNING.TESTSPAWNER_SPAWN_RANGE, 12, true, false)')
    expect(code).toContain('local spawned = SpawnPrefab("deerclops")')
    expect(code).toContain('inst:ListenForEvent("phasechanged", trydayspawn, TheWorld)')
    expect(code).toContain('local prefabs = { "deerclops" }')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires a persistent single resident via the real spawner component (components/spawner.lua)', () => {
    const house: StructureDef = { ...structure, id: 'testhouse', resident: { prefab: 'pigman', respawnDelayDays: 2 } }
    const code = generateStructurePrefab(house)
    expect(code).toContain('inst:AddComponent("spawner")')
    expect(code).toContain('inst.components.spawner:Configure("pigman", TUNING.TESTHOUSE_RESPAWN_DELAY)')
    expect(code).toContain('local prefabs = { "pigman" }')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('lists both daySpawner and resident prefabs together when a structure has both', () => {
    const both: StructureDef = {
      ...structure,
      id: 'testboth',
      daySpawner: { prefab: 'deerclops', chance: 0.1, range: 40 },
      resident: { prefab: 'pigman', respawnDelayDays: 2 },
    }
    const code = generateStructurePrefab(both)
    expect(code).toContain('local prefabs = { "deerclops", "pigman" }')
  })

  it('wires a prototyper via TechTree.Create({ category = tier }) (components/prototyper.lua)', () => {
    const station: StructureDef = { ...structure, id: 'teststation', prototyper: { category: 'MAGIC', tier: 2 } }
    const code = generateStructurePrefab(station)
    expect(code).toContain('local TechTree = require("techtree")')
    expect(code).toContain('inst:AddComponent("prototyper")')
    expect(code).toContain('inst.components.prototyper.trees = TechTree.Create({ MAGIC = 2 })')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('does not require techtree when there is no prototyper', () => {
    const code = generateStructurePrefab(structure)
    expect(code).not.toContain('require("techtree")')
  })

  it('wires a sleepingbag rest station via the real components/sleepingbag.lua tick fields', () => {
    const bed: StructureDef = {
      ...structure,
      id: 'testbed',
      restStation: { sleepPhase: 'night', healthPerTick: 1, hungerPerTick: -1, sanityPerTick: 1 },
    }
    const code = generateStructurePrefab(bed)
    expect(code).toContain('inst:AddComponent("sleepingbag")')
    expect(code).toContain('inst.components.sleepingbag:SetSleepPhase("night")')
    expect(code).toContain('inst.components.sleepingbag.health_tick = TUNING.TESTBED_HEALTH_PER_TICK')
    expect(code).toContain('inst.components.sleepingbag.hunger_tick = TUNING.TESTBED_HUNGER_PER_TICK')
    expect(code).toContain('inst.components.sleepingbag.sanity_tick = TUNING.TESTBED_SANITY_PER_TICK')
    expect(code).not.toContain('inst:AddComponent("finiteuses")')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires finiteuses for a rest station with limited uses, removing it once exhausted', () => {
    const wornBed: StructureDef = {
      ...structure,
      id: 'testwornbed',
      restStation: { sleepPhase: 'day', healthPerTick: 2, hungerPerTick: -1, sanityPerTick: 1, maxUses: 15 },
    }
    const code = generateStructurePrefab(wornBed)
    expect(code).toContain('inst:AddComponent("finiteuses")')
    expect(code).toContain('inst.components.finiteuses:SetMaxUses(TUNING.TESTWORNBED_USES)')
    expect(code).toContain('inst.components.finiteuses:SetUses(TUNING.TESTWORNBED_USES)')
    expect(code).toContain('inst.components.finiteuses:SetOnFinished(inst.Remove)')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  // Confirmed directly in a real published Workshop mod ("Above the Clouds" —
  // read scripts/components/interiorspawner.lua and scripts/prefabs/
  // playerhouse_city.lua/prop_door.lua in full, see docs/dst-knowledge/
  // patterns.md's interior section). interiorID must persist across save/load
  // so CreateRoom only ever runs once per structure instance.
  it('wires a fresh interior room (door component, EnsureInterior, OnSave/OnLoad, deferred creation)', () => {
    const hut: StructureDef = { ...structure, id: 'testhut', interior: { size: 'tiny' } }
    const code = generateStructurePrefab(hut)
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()

    expect(code).toContain('inst:AddComponent("door")')
    expect(code).toContain('local function EnsureInterior(inst)')
    expect(code).toContain('TUNING.ROOM_TINY_WIDTH')
    expect(code).toContain('TUNING.ROOM_TINY_DEPTH')
    expect(code).toContain('TheWorld.components.interiorspawner:CreateRoom({')
    expect(code).toContain('name = "prop_door"')
    expect(code).toContain('is_exit = true')
    expect(code).toContain('inst.OnSave = OnSave')
    expect(code).toContain('inst.OnLoad = OnLoad')
    expect(code).toContain('inst:DoTaskInTime(0, function() EnsureInterior(inst) end)')
  })

  it('reuses the persisted interiorID instead of building a second room when one already exists', () => {
    const hut: StructureDef = { ...structure, id: 'testhut2', interior: { size: 'large' } }
    const code = generateStructurePrefab(hut)

    const reuseIdx = code.indexOf('if inst.interiorID ~= nil then')
    const createIdx = code.indexOf('local id = TheWorld.components.interiorspawner:GetNewID()')
    expect(reuseIdx).toBeGreaterThan(-1)
    expect(createIdx).toBeGreaterThan(reuseIdx)

    const reuseBranch = code.slice(reuseIdx, createIdx)
    expect(reuseBranch).toContain('TheWorld.components.interiorspawner:AddDoor(inst, {')
    expect(reuseBranch).not.toContain('CreateRoom')
  })

  it('maps each room size to its own real TUNING constants', () => {
    const medium: StructureDef = { ...structure, id: 'testhutmedium', interior: { size: 'medium' } }
    const code = generateStructurePrefab(medium)
    expect(code).toContain('TUNING.ROOM_MEDIUM_WIDTH')
    expect(code).toContain('TUNING.ROOM_MEDIUM_DEPTH')
  })

  // Confirmed in the same mod's scripts/prefabs/pig_ruins_entrance.lua
  // (BuildMaze/InitMaze) — a random walk connecting a random count of rooms
  // via CreateRoom's own `exits` param, see docs/dst-knowledge/patterns.md#67.
  it('wires a random-walk maze instead of a single room when interior.maze is set', () => {
    const dungeon: StructureDef = {
      ...structure,
      id: 'testdungeon',
      interior: { size: 'medium', maze: { roomCount: { min: 4, max: 8 } } },
    }
    const code = generateStructurePrefab(dungeon)
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()

    expect(code).toContain('local room_count = math.random(4, 8)')
    expect(code).toContain('while #rooms < room_count do')
    expect(code).toContain('blocked_exits = { interior_spawner:GetNorth() }')
    expect(code).toContain('interior_spawner:GetDir()')
    expect(code).toContain('interior_spawner:GetDirOpposite()')
    expect(code).toContain('for _, room in pairs(rooms) do')
    expect(code).toContain('interior_spawner:CreateRoom({')
    expect(code).toContain('TUNING.ROOM_MEDIUM_WIDTH')
    // Only one CreateRoom call site, inside the per-room loop — not one fixed call.
    expect(code.split('interior_spawner:CreateRoom({').length - 1).toBe(1)
  })

  it('does not compute a bonus loot room when maze.bonusLootPrefab is not set', () => {
    const dungeon: StructureDef = {
      ...structure,
      id: 'testdungeonnoloot',
      interior: { size: 'tiny', maze: { roomCount: { min: 3, max: 5 } } },
    }
    const code = generateStructurePrefab(dungeon)
    expect(code).not.toContain('dead_ends')
    expect(code).not.toContain('bonusloot')
  })

  it('marks a random dead-end room with the bonus loot prefab when maze.bonusLootPrefab is set', () => {
    const dungeon: StructureDef = {
      ...structure,
      id: 'testdungeonloot',
      interior: { size: 'tiny', maze: { roomCount: { min: 3, max: 5 }, bonusLootPrefab: 'goldnugget' } },
    }
    const code = generateStructurePrefab(dungeon)
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()

    expect(code).toContain('local dead_ends = {}')
    expect(code).toContain('dead_ends[math.random(#dead_ends)].bonusloot = true')
    expect(code).toContain('table.insert(addprops, { name = "goldnugget", x_offset = 0, z_offset = 0 })')
  })

  it('does not touch OnSave/OnLoad/door for a structure with no interior', () => {
    const code = generateStructurePrefab(structure)
    expect(code).not.toContain('EnsureInterior')
    expect(code).not.toContain('inst.OnSave')
    expect(code).not.toContain('inst:AddComponent("door")')
  })

  it('reuses a vanilla build without declaring an ANIM asset when animation.source is vanilla', () => {
    const vanilla: StructureDef = { ...structure, id: 'testvanillastructure', animation: { source: 'vanilla', build: 'researchlab' } }
    const code = generateStructurePrefab(vanilla)
    expect(code).not.toContain('Asset("ANIM"')
    expect(code).toContain('inst.AnimState:SetBank("researchlab")')
    expect(code).toContain('inst.AnimState:SetBuild("researchlab")')
  })

  it('defaults to a custom build named after its own id when no animation is chosen', () => {
    const customBuildStructure: StructureDef = { ...structure, animation: { source: 'custom' } }
    const code = generateStructurePrefab(customBuildStructure)
    expect(code).toContain('Asset("ANIM", "anim/teststructure.zip")')
    expect(code).toContain('inst.AnimState:SetBank("teststructure")')
    expect(code).toContain('inst.AnimState:SetBuild("teststructure")')
  })
})

describe('generateStructureFiles (deployMode: deployableItem)', () => {
  const portable: StructureDef = { ...sampleProject.structures[0], id: 'testportable', deployMode: 'deployableItem', animation: undefined }

  it('generates the item prefab instead of a placer', () => {
    const files = generateStructureFiles(portable)
    expect(Object.keys(files).sort()).toEqual(
      ['scripts/prefabs/testportable.lua', 'scripts/prefabs/testportable_item.lua'].sort(),
    )
  })

  it('dismantles back into the item instead of dropping loot (portablecookpot.lua ChangeToItem)', () => {
    const code = generateStructurePrefab(portable)
    expect(code).toContain('local function onhammered(inst)')
    expect(code).toContain('local item = SpawnPrefab("testportable_item")')
    expect(code).toContain('item.Transform:SetPosition(inst.Transform:GetWorldPosition())')
    expect(code).toContain('inst:Remove()')
    expect(code).not.toContain('inst:AddComponent("lootdropper")')
    expect(code).not.toContain('DropLoot()')
    expect(code).toContain('local prefabs = { "testportable_item" }')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('does not declare its own INV_IMAGE — the item half owns the recipe icon', () => {
    const code = generateStructurePrefab(portable)
    expect(code).not.toContain('Asset("INV_IMAGE"')
  })

  it('generates an inventory item that deploys back into the structure', () => {
    const customBuildPortable: StructureDef = { ...portable, animation: { source: 'custom' } }
    const code = generateStructureItemPrefab(customBuildPortable)
    expect(code).toContain('MakeInventoryPhysics(inst)')
    expect(code).toContain('inst:AddComponent("inventoryitem")')
    expect(code).toContain('inst:AddComponent("deployable")')
    expect(code).toContain('inst.components.deployable.ondeploy = ondeploy')
    expect(code).toContain('local function ondeploy(inst, pt)')
    expect(code).toContain('local placed = SpawnPrefab("testportable")')
    expect(code).toContain('placed.Transform:SetPosition(pt:Get())')
    expect(code).toContain('Asset("INV_IMAGE", "testportable_item")')
    expect(code).toContain('return Prefab("testportable_item", fn, assets, prefabs)')
    expect(code).toContain('local prefabs = { "testportable" }')
    expect(code).not.toContain('MakeObstaclePhysics')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('still wires a container on the structure half (the real Portable Crock Pot is exactly this combo)', () => {
    const withContainer: StructureDef = {
      ...portable,
      id: 'testportablebag',
      container: { source: 'own', widget: { source: 'vanilla', reusePrefab: 'sacred_chest' }, sideWidget: false },
    }
    const code = generateStructurePrefab(withContainer)
    expect(code).toContain('inst:AddComponent("container")')
    expect(code).toContain('inst.components.container:WidgetSetup("testportablebag")')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('ignores configured loot entirely — hammering returns the item, never drops materials', () => {
    const withLoot: StructureDef = { ...portable, id: 'testportableloot', loot: [{ prefab: 'boards', chance: 0.5 }] }
    const code = generateStructurePrefab(withLoot)
    expect(code).not.toContain('AddChancedLoot')
    expect(code).not.toContain('inst:AddComponent("lootdropper")')
  })

  // Same bug/fix as item.ts's own imagename assignment (see its tests): a
  // vanilla-sourced deployableItem's carried-item half defaults to its own
  // prefab id via InventoryItem:GetImage() unless `imagename` is set, leaving
  // the inventory slot / dropped-on-ground sprite blank even though the
  // crafting-menu icon (structureRecipeIcon) shows fine. `imagename` is a
  // listenable PROPERTY, not a method — `:SetImage(...)` only exists on the
  // client replica and crashes when called on the server component.
  it('sets inventoryitem.imagename to the reused build for a vanilla-sourced deployableItem', () => {
    const vanillaPortable: StructureDef = { ...portable, id: 'testvanillaportable', animation: { source: 'vanilla', build: 'researchlab' } }
    const code = generateStructureItemPrefab(vanillaPortable)
    expect(code).toContain('inst.components.inventoryitem.imagename = "researchlab"')
    expect(code).not.toContain(':SetImage')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('does not set imagename for a custom-sourced deployableItem (its own id is already the right default)', () => {
    const code = generateStructureItemPrefab(portable)
    expect(code).not.toContain('imagename')
  })
})
