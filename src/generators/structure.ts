import type { StructureDef, RoomSize, InteriorMaze, InteriorDecoration } from '../types/modProject'
import { luaString, sanitizeLuaComment, toUpperSnake } from './luaUtils'
import { containerCustomWidgetBuild, linkedDimensionAttachFunctionBlock } from './item'

// A structure with no animation choice keeps the same default an item gets: a
// custom build named after its own id, which the user must supply as
// anim/<id>.zip (see README). No 'vanillaHat' variant here — a structure is
// never equipped, so it has no equip slot to reuse a hat naming convention for.
function resolveAnimationBuild(structure: StructureDef): string {
  const anim = structure.animation
  return anim?.source === 'vanilla' ? anim.build : structure.id
}

function isVanillaAnimation(structure: StructureDef): boolean {
  return structure.animation?.source === 'vanilla'
}

// See item.ts's itemRecipeIcon for the full explanation (same recipe.lua mechanism,
// same crash, same fix) — 'product' is the deployableItem's separate "_item" id when
// applicable, matching structureRecipeBlock's own product resolution in modmain.ts.
export function structureRecipeIcon(structure: StructureDef, product: string): { atlas?: string; image: string } {
  if (isVanillaAnimation(structure)) {
    return { image: `${resolveAnimationBuild(structure)}.tex` }
  }
  return { atlas: `images/inventoryimages/${product}.xml`, image: `${product}.tex` }
}

function isDeployableItem(structure: StructureDef): boolean {
  return structure.deployMode === 'deployableItem'
}

function itemId(structure: StructureDef): string {
  return `${structure.id}_item`
}

function lootBlock(structure: StructureDef): string[] {
  const lines = ['', '    inst:AddComponent("lootdropper")']
  for (const drop of structure.loot) {
    lines.push(`    inst.components.lootdropper:AddChancedLoot(${luaString(drop.prefab)}, ${drop.chance})`)
  }
  return lines
}

// Confirmed in a real published Workshop mod ("Automation Farm", see
// docs/dst-knowledge/patterns.md#25) — a structure needs its OWN way out of
// the world, since (unlike a portable item) it can never go back into an
// inventory: workable + hammer, dropping whatever loot it has and removing itself.
function onHammeredFunctionBlock(): string[] {
  return [
    'local function onhammered(inst)',
    '    if inst.components.lootdropper ~= nil then',
    '        inst.components.lootdropper:DropLoot()',
    '    end',
    '    inst:Remove()',
    'end',
    '',
  ]
}

// Confirmed in Original/prefabs/prefabs/portablecookpot.lua's ChangeToItem: a
// deployableItem structure's hammer is a "pack it back up" action, not a kill —
// it hands the ingredients back as the same item it was deployed from, instead
// of the placer flow's lootdropper.
function onDismantledFunctionBlock(structure: StructureDef): string[] {
  return [
    'local function onhammered(inst)',
    `    local item = SpawnPrefab(${luaString(itemId(structure))})`,
    '    if item ~= nil then',
    '        item.Transform:SetPosition(inst.Transform:GetWorldPosition())',
    '    end',
    '    inst:Remove()',
    'end',
    '',
  ]
}

// Adapted from a real published Workshop mod ("Craftable Wormholes", see
// docs/dst-knowledge/patterns.md#23). A shared GLOBAL table (self-initializing,
// no modmain.lua wiring needed) tracks built instances per structure id; every
// 2nd build links back to the 1st, every 4th to the 3rd, and so on.
function teleportPairFunctionBlock(): string[] {
  return [
    'local function OnTeleportPairRemoved(inst)',
    '    local siblings = GLOBAL.TELEPORT_PAIRS and GLOBAL.TELEPORT_PAIRS[inst.prefab]',
    '    if siblings == nil then return end',
    '    for i = #siblings, 1, -1 do',
    '        if siblings[i] == inst then',
    '            table.remove(siblings, i)',
    '            break',
    '        end',
    '    end',
    'end',
    '',
    'local function LinkTeleportPair(inst)',
    '    GLOBAL.TELEPORT_PAIRS = GLOBAL.TELEPORT_PAIRS or {}',
    '    local siblings = GLOBAL.TELEPORT_PAIRS[inst.prefab]',
    '    if siblings == nil then',
    '        siblings = {}',
    '        GLOBAL.TELEPORT_PAIRS[inst.prefab] = siblings',
    '    end',
    '    table.insert(siblings, inst)',
    '    if #siblings % 2 == 0 then',
    '        local a, b = siblings[#siblings - 1], siblings[#siblings]',
    '        a.components.teleporter:Target(b)',
    '        b.components.teleporter:Target(a)',
    '    end',
    '    inst:ListenForEvent("onremove", OnTeleportPairRemoved)',
    'end',
    '',
  ]
}

function needsDaySpawner(structure: StructureDef): boolean {
  return structure.daySpawner !== undefined
}

function needsInterior(structure: StructureDef): boolean {
  return structure.interior !== undefined
}

const ROOM_SIZE_TUNING: Record<RoomSize, string> = {
  tiny: 'TINY',
  small: 'SMALL',
  medium: 'MEDIUM',
  large: 'LARGE',
}

// Confirmed in scripts/prefabs/interior_prop_defs.lua (PROP_DEFS.
// playerhouse_city/PROP_DEFS.vampirebatcave) — every addprops entry is just
// { name = <prefab>, x_offset, z_offset, chance }. `chance` (0-1, "sometimes
// skip this one") is the real field name, confirmed across dozens of real
// entries. Rotation/flip and the source mod's own more elaborate placement
// math aren't modeled — a fixed offset per decoration is the curated subset.
function decorationLuaFields(decoration: InteriorDecoration): string {
  const fields = [`name = ${luaString(decoration.prefab)}`, `x_offset = ${decoration.xOffset}`, `z_offset = ${decoration.zOffset}`]
  if (decoration.chance !== undefined) fields.push(`chance = ${decoration.chance}`)
  return fields.join(', ')
}

// Confirmed directly in a real published Workshop mod ("Above the Clouds",
// docs/dst-knowledge/patterns.md's interior section) — read
// scripts/components/interiorspawner.lua, scripts/prefabs/playerhouse_city.lua
// and prop_door.lua in full. The structure itself IS the exterior door (no
// separate door prop outside); CreateRoom builds the whole interior room in
// one call, including a single "prop_door" addprops entry for the return
// trip (its own initInteriorPrefab registers the door pairing itself, no
// second manual AddDoor call needed on our side). interiorID must persist
// across save/load so CreateRoom only ever runs once per structure instance
// — deferred one tick (DoTaskInTime(0, ...)) so a same-tick OnLoad has
// already restored interiorID before this checks it.
function singleRoomEnsureInteriorBlock(size: string, decorations: InteriorDecoration[]): string[] {
  return [
    'local function EnsureInterior(inst)',
    '    if inst.interiorID ~= nil then',
    '        TheWorld.components.interiorspawner:AddDoor(inst, {',
    '            my_door_id = inst.prefab .. "_door",',
    '            target_door_id = inst.interiorID .. "_exit",',
    '            target_interior = inst.interiorID,',
    '        })',
    '        return',
    '    end',
    '',
    '    local id = TheWorld.components.interiorspawner:GetNewID()',
    '    inst.interiorID = id',
    '',
    '    local exterior_door_def = {',
    '        my_door_id = inst.prefab .. "_door",',
    '        target_door_id = id .. "_exit",',
    '        target_interior = id,',
    '    }',
    '    TheWorld.components.interiorspawner:AddDoor(inst, exterior_door_def)',
    '    TheWorld.components.interiorspawner:CreateRoom({',
    `        width = TUNING.ROOM_${size}_WIDTH,`,
    `        depth = TUNING.ROOM_${size}_DEPTH,`,
    '        group_id = id,',
    '        roomindex = id,',
    '        interior_coordinate_x = 0,',
    '        interior_coordinate_y = 0,',
    '        walltexture = "levels/textures/interiors/shop_wall_woodwall.tex",',
    '        floortexture = "levels/textures/noise_woodfloor.tex",',
    '        minimaptexture = "levels/textures/map_interior/mini_floor_wood.tex",',
    '        colour_cube = "images/colour_cubes/pigshop_interior_cc.tex",',
    '        footstep_tile = WORLD_TILES.WOODFLOOR,',
    '        playerroom = true,',
    '        addprops = {',
    '            {',
    '                name = "prop_door",',
    '                x_offset = 5,',
    '                z_offset = 0,',
    '                animdata = { bank = "pig_shop_doormats", build = "pig_shop_doormats", anim = "idle_old", background = true },',
    '                my_door_id = exterior_door_def.target_door_id,',
    '                target_door_id = exterior_door_def.my_door_id,',
    '                is_exit = true,',
    '            },',
    ...decorations.map((decoration) => `            { ${decorationLuaFields(decoration)} },`),
    '        },',
    '        exits = {},',
    '    })',
    'end',
    '',
  ]
}

// Confirmed in the same mod's scripts/prefabs/pig_ruins_entrance.lua
// (BuildMaze/InitMaze) — a random walk from the entrance room, connecting a
// random number of extra rooms via CreateRoom's real `exits` param (each
// wired bidirectionally with the component's own EAST/WEST/NORTH/SOUTH
// direction tables as keys, exactly as CreateRoom itself expects — see its
// `if heading == NORTH then ...` branches). blocked_exits on the entrance
// room (north blocked) is copied as-is from the source; the exact reason
// isn't confirmed, but it's cheap and harmless to keep faithful. Only the
// dead-end-room "treasure" selection is generalized (bonusLootPrefab) — the
// rest of the real mod's reward/flavor system (secret rooms, vine-locked
// doors, alternate palette, second exit, per-room decoration) is Pig-Ruins
// specific and deliberately not modeled (see patterns.md).
function mazeEnsureInteriorBlock(size: string, maze: InteriorMaze, decorations: InteriorDecoration[]): string[] {
  const lines = [
    'local function EnsureInterior(inst)',
    '    if inst.interiorID ~= nil then',
    '        TheWorld.components.interiorspawner:AddDoor(inst, {',
    '            my_door_id = inst.prefab .. "_door",',
    '            target_door_id = inst.interiorID .. "_exit",',
    '            target_interior = inst.interiorID,',
    '        })',
    '        return',
    '    end',
    '',
    '    local interior_spawner = TheWorld.components.interiorspawner',
    '    local id = interior_spawner:GetNewID()',
    '    inst.interiorID = id',
    '',
    '    local exterior_door_def = {',
    '        my_door_id = inst.prefab .. "_door",',
    '        target_door_id = id .. "_exit",',
    '        target_interior = id,',
    '    }',
    '    interior_spawner:AddDoor(inst, exterior_door_def)',
    '',
    '    local dir = interior_spawner:GetDir()',
    '    local dir_opposite = interior_spawner:GetDirOpposite()',
    '',
    '    local rooms = {',
    '        {',
    '            x = 0,',
    '            y = 0,',
    '            id = id,',
    '            exits = {},',
    '            blocked_exits = { interior_spawner:GetNorth() },',
    '        },',
    '    }',
    '',
    `    local room_count = math.random(${maze.roomCount.min}, ${maze.roomCount.max})`,
    '    while #rooms < room_count do',
    '        local dir_choice = math.random(#dir)',
    '        local room_connecting_to = rooms[math.random(#rooms)]',
    '',
    '        local blocked = false',
    '        for _, exit in pairs(room_connecting_to.blocked_exits) do',
    '            if dir[dir_choice] == exit then',
    '                blocked = true',
    '            end',
    '        end',
    '',
    '        if not blocked then',
    '            local occupied = false',
    '            for _, room in pairs(rooms) do',
    '                if room.x == room_connecting_to.x + dir[dir_choice].x and room.y == room_connecting_to.y + dir[dir_choice].y then',
    '                    occupied = true',
    '                    break',
    '                end',
    '            end',
    '',
    '            if not occupied then',
    '                local new_room = {',
    '                    x = room_connecting_to.x + dir[dir_choice].x,',
    '                    y = room_connecting_to.y + dir[dir_choice].y,',
    '                    id = interior_spawner:GetNewID(),',
    '                    exits = {},',
    '                    blocked_exits = {},',
    '                }',
    '',
    '                room_connecting_to.exits[dir[dir_choice]] = {',
    '                    target_room = new_room.id,',
    '                    bank = "doorway_ruins",',
    '                    build = "pig_ruins_door",',
    '                    room = room_connecting_to.id,',
    '                }',
    '                new_room.exits[dir_opposite[dir_choice]] = {',
    '                    target_room = room_connecting_to.id,',
    '                    bank = "doorway_ruins",',
    '                    build = "pig_ruins_door",',
    '                    room = new_room.id,',
    '                }',
    '',
    '                table.insert(rooms, new_room)',
    '            end',
    '        end',
    '    end',
    '',
  ]

  if (maze.bonusLootPrefab) {
    lines.push(
      '    local dead_ends = {}',
      '    for _, room in pairs(rooms) do',
      '        local exit_count = 0',
      '        for _ in pairs(room.exits) do',
      '            exit_count = exit_count + 1',
      '        end',
      '        if exit_count == 1 then',
      '            table.insert(dead_ends, room)',
      '        end',
      '    end',
      '    if #dead_ends > 0 then',
      '        dead_ends[math.random(#dead_ends)].bonusloot = true',
      '    end',
      '',
    )
  }

  lines.push(
    '    for _, room in pairs(rooms) do',
    '        local addprops = {}',
    '        if room.id == id then',
    '            table.insert(addprops, {',
    '                name = "prop_door",',
    '                x_offset = 5,',
    '                z_offset = 0,',
    '                animdata = { bank = "pig_shop_doormats", build = "pig_shop_doormats", anim = "idle_old", background = true },',
    '                my_door_id = exterior_door_def.target_door_id,',
    '                target_door_id = exterior_door_def.my_door_id,',
    '                is_exit = true,',
    '            })',
    '        end',
  )
  if (maze.bonusLootPrefab) {
    lines.push(
      '        if room.bonusloot then',
      `            table.insert(addprops, { name = ${luaString(maze.bonusLootPrefab)}, x_offset = 0, z_offset = 0 })`,
      '        end',
    )
  }
  for (const decoration of decorations) {
    lines.push(`        table.insert(addprops, { ${decorationLuaFields(decoration)} })`)
  }
  lines.push(
    '',
    '        interior_spawner:CreateRoom({',
    `            width = TUNING.ROOM_${size}_WIDTH,`,
    `            depth = TUNING.ROOM_${size}_DEPTH,`,
    '            group_id = id,',
    '            roomindex = room.id,',
    '            interior_coordinate_x = room.x,',
    '            interior_coordinate_y = room.y,',
    '            walltexture = "levels/textures/interiors/shop_wall_woodwall.tex",',
    '            floortexture = "levels/textures/noise_woodfloor.tex",',
    '            minimaptexture = "levels/textures/map_interior/mini_floor_wood.tex",',
    '            colour_cube = "images/colour_cubes/pigshop_interior_cc.tex",',
    '            footstep_tile = WORLD_TILES.WOODFLOOR,',
    '            playerroom = true,',
    '            addprops = addprops,',
    '            exits = room.exits,',
    '        })',
    '    end',
    'end',
    '',
  )

  return lines
}

function interiorFunctionBlock(structure: StructureDef): string[] {
  const size = ROOM_SIZE_TUNING[structure.interior?.size ?? 'tiny']
  const maze = structure.interior?.maze
  const decorations = structure.interior?.decorations ?? []
  return [
    'local function OnSave(inst, data)',
    '    data.interiorID = inst.interiorID',
    'end',
    '',
    'local function OnLoad(inst, data)',
    '    if data and data.interiorID then',
    '        inst.interiorID = data.interiorID',
    '    end',
    'end',
    '',
    ...(maze ? mazeEnsureInteriorBlock(size, maze, decorations) : singleRoomEnsureInteriorBlock(size, decorations)),
  ]
}

// Every other prefab a structure might reference at runtime (SpawnPrefab calls
// outside its own fn()) — listed in its own `prefabs` table for preloading, same
// convention creature.ts's herd manager uses.
function referencedPrefabs(structure: StructureDef): string[] {
  const prefabs: string[] = []
  if (structure.daySpawner) prefabs.push(structure.daySpawner.prefab)
  if (structure.resident) prefabs.push(structure.resident.prefab)
  if (isDeployableItem(structure)) prefabs.push(itemId(structure))
  return prefabs
}

// Confirmed in the base game's own beefaloherd.lua: TheWorld:ListenForEvent
// ("phasechanged", fn) + checking phase == "day" is the standard "once per day"
// trigger, and math.random() < chance the standard probability roll (same file,
// used for its carrat spawn chance). FindWalkableOffset(pos, angle, radius, ...)
// for a random valid ground point within a radius, and SpawnPrefab + Transform:
// SetPosition to place the new entity there, are confirmed across many vanilla
// prefabs (e.g. altar_prototyper.lua, balatro_machine.lua).
function daySpawnerFunctionBlock(structure: StructureDef): string[] {
  const upper = toUpperSnake(structure.id)
  return [
    'local function trydayspawn(inst, src, phase)',
    `    if phase ~= "day" or math.random() > TUNING.${upper}_SPAWN_CHANCE then`,
    '        return',
    '    end',
    '',
    '    local x, y, z = inst.Transform:GetWorldPosition()',
    `    local offset = FindWalkableOffset(Vector3(x, y, z), math.random() * TWOPI, TUNING.${upper}_SPAWN_RANGE, 12, true, false)`,
    '    if offset == nil then',
    '        return',
    '    end',
    '',
    `    local spawned = SpawnPrefab(${luaString(structure.daySpawner?.prefab ?? '')})`,
    '    if spawned ~= nil then',
    '        spawned.Transform:SetPosition(x + offset.x, y + offset.y, z + offset.z)',
    '    end',
    'end',
    '',
  ]
}

function componentBlock(structure: StructureDef): string {
  const lines: string[] = []

  lines.push('    inst:AddComponent("inspectable")')
  if (!isDeployableItem(structure)) {
    lines.push(...lootBlock(structure))
    lines.push('')
  }
  lines.push('    inst:AddComponent("workable")')
  lines.push('    inst.components.workable:SetWorkAction(ACTIONS.HAMMER)')
  lines.push('    inst.components.workable:SetWorkLeft(4)')
  lines.push('    inst.components.workable:SetOnFinishCallback(onhammered)')

  if (structure.container?.source === 'pocketDimension') {
    lines.push('')
    lines.push('    inst:AddComponent("container_proxy")')
  } else if (structure.container) {
    lines.push('')
    lines.push('    inst:AddComponent("container")')
    lines.push(`    inst.components.container:WidgetSetup(${luaString(structure.id)})`)
    if (structure.container.preservation) {
      lines.push('')
      lines.push('    inst:AddComponent("preserver")')
      lines.push(`    inst.components.preserver:SetPerishRateMultiplier(${structure.container.preservation.perishRateMultiplier})`)
      if (structure.container.preservation.temperatureRateMultiplier !== undefined) {
        lines.push(
          `    inst.components.preserver:SetTemperatureRateMultiplier(${structure.container.preservation.temperatureRateMultiplier})`,
        )
      }
    }
  }

  if (structure.teleportPair) {
    lines.push('')
    lines.push('    inst:AddComponent("teleporter")')
    lines.push('    LinkTeleportPair(inst)')
  }

  if (needsDaySpawner(structure)) {
    lines.push('')
    lines.push('    inst:ListenForEvent("phasechanged", trydayspawn, TheWorld)')
  }

  if (structure.resident) {
    const upper = toUpperSnake(structure.id)
    lines.push('')
    lines.push('    inst:AddComponent("spawner")')
    lines.push(`    inst.components.spawner:Configure(${luaString(structure.resident.prefab)}, TUNING.${upper}_RESPAWN_DELAY)`)
  }

  if (structure.prototyper) {
    lines.push('')
    lines.push('    inst:AddComponent("prototyper")')
    lines.push(
      `    inst.components.prototyper.trees = TechTree.Create({ ${structure.prototyper.category} = ${structure.prototyper.tier} })`,
    )
  }

  if (structure.restStation) {
    const upper = toUpperSnake(structure.id)
    lines.push('')
    lines.push('    inst:AddComponent("sleepingbag")')
    lines.push(`    inst.components.sleepingbag:SetSleepPhase(${luaString(structure.restStation.sleepPhase)})`)
    lines.push(`    inst.components.sleepingbag.health_tick = TUNING.${upper}_HEALTH_PER_TICK`)
    lines.push(`    inst.components.sleepingbag.hunger_tick = TUNING.${upper}_HUNGER_PER_TICK`)
    lines.push(`    inst.components.sleepingbag.sanity_tick = TUNING.${upper}_SANITY_PER_TICK`)
    if (structure.restStation.maxUses !== undefined) {
      lines.push('')
      lines.push('    inst:AddComponent("finiteuses")')
      lines.push(`    inst.components.finiteuses:SetMaxUses(TUNING.${upper}_USES)`)
      lines.push(`    inst.components.finiteuses:SetUses(TUNING.${upper}_USES)`)
      lines.push('    inst.components.finiteuses:SetOnFinished(inst.Remove)')
    }
  }

  if (needsInterior(structure)) {
    lines.push('')
    lines.push('    inst:AddComponent("door")')
  }

  return lines.join('\n')
}

// Assets: when the structure reuses a vanilla build (structure.animation.source
// === 'vanilla'), no Asset("ANIM", ...) is declared — that animation data is
// already loaded by the base game. Otherwise this is a PLACEHOLDER: the user
// must supply anim/<id>.zip produced with Klei's Spriter tooling.
export function generateStructurePrefab(structure: StructureDef): string {
  const lines: string[] = []
  const build = resolveAnimationBuild(structure)

  if (structure.prototyper) {
    lines.push('local TechTree = require("techtree")')
    lines.push('')
  }
  lines.push('local assets =')
  lines.push('{')
  if (isVanillaAnimation(structure)) {
    lines.push(`    -- Build "${sanitizeLuaComment(build)}" reaproveitado do jogo base, sem asset próprio necessário.`)
  } else {
    lines.push(`    Asset("ANIM", "anim/${structure.id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
  }
  if (structure.container?.source === 'own' && structure.container.widget.source === 'custom') {
    lines.push(`    Asset("ANIM", "anim/${containerCustomWidgetBuild(structure.id)}.zip"), -- PLACEHOLDER: art da UI do contêiner, ver README`)
  }
  // A deployableItem structure is never craftable/hoverable directly — the item
  // half (generateStructureItemPrefab) owns the recipe icon, so only IT declares
  // an INV_IMAGE. A vanilla-sourced structure has no anim/<id>.zip of its own to
  // derive one from either — see structureRecipeIcon.
  if (!isDeployableItem(structure) && !isVanillaAnimation(structure)) {
    lines.push(`    Asset("INV_IMAGE", "${structure.id}"),`)
  }
  lines.push('}')
  lines.push('')
  lines.push(...(isDeployableItem(structure) ? onDismantledFunctionBlock(structure) : onHammeredFunctionBlock()))
  if (structure.teleportPair) {
    lines.push(...teleportPairFunctionBlock())
  }
  if (needsDaySpawner(structure)) {
    lines.push(...daySpawnerFunctionBlock(structure))
  }
  if (needsInterior(structure)) {
    lines.push(...interiorFunctionBlock(structure))
  }
  if (structure.container?.source === 'pocketDimension') {
    lines.push(...linkedDimensionAttachFunctionBlock(structure.container.dimension))
  }
  const prefabs = referencedPrefabs(structure)
  lines.push(prefabs.length > 0 ? `local prefabs = { ${prefabs.map(luaString).join(', ')} }` : 'local prefabs = {}')
  lines.push('')
  lines.push('local function fn()')
  lines.push('    local inst = CreateEntity()')
  lines.push('')
  lines.push('    inst.entity:AddTransform()')
  lines.push('    inst.entity:AddAnimState()')
  lines.push('    inst.entity:AddNetwork()')
  lines.push('')
  lines.push('    MakeObstaclePhysics(inst, 0.5) -- ajuste o raio conforme o tamanho real da estrutura')
  lines.push('')
  lines.push(`    inst.AnimState:SetBank(${luaString(build)})`)
  lines.push(`    inst.AnimState:SetBuild(${luaString(build)})`)
  lines.push('    inst.AnimState:PlayAnimation("idle")')
  lines.push('')
  lines.push('    inst:AddTag("structure")')
  lines.push('')
  lines.push('    inst.entity:SetPristine()')
  lines.push('    if not TheWorld.ismastersim then')
  lines.push('        return inst')
  lines.push('    end')
  lines.push('')
  lines.push(componentBlock(structure))
  if (needsInterior(structure)) {
    lines.push('')
    lines.push('    inst.OnSave = OnSave')
    lines.push('    inst.OnLoad = OnLoad')
    lines.push('    inst:DoTaskInTime(0, function() EnsureInterior(inst) end)')
  }
  if (structure.container?.source === 'pocketDimension') {
    lines.push('')
    lines.push('    inst.OnLoadPostPass = AttachSharedContainer')
    lines.push('    if not POPULATING then')
    lines.push('        AttachSharedContainer(inst)')
    lines.push('    end')
  }
  lines.push('')
  lines.push('    return inst')
  lines.push('end')
  lines.push('')
  lines.push(`return Prefab("${structure.id}", fn, assets, prefabs)`)

  return lines.join('\n') + '\n'
}

export function generateStructurePlacerPrefab(structure: StructureDef): string {
  const lines: string[] = []
  const build = resolveAnimationBuild(structure)

  lines.push('local assets =')
  lines.push('{')
  if (isVanillaAnimation(structure)) {
    lines.push(`    -- Build "${sanitizeLuaComment(build)}" reaproveitado do jogo base, sem asset próprio necessário.`)
  } else {
    lines.push(`    Asset("ANIM", "anim/${structure.id}.zip"), -- PLACEHOLDER: mesmo build da estrutura, ver README`)
  }
  lines.push('}')
  lines.push('')
  lines.push('local function fn()')
  lines.push(`    return MakePlacer(${luaString(structure.id + '_placer')}, ${luaString(build)}, ${luaString(build)}, "idle")`)
  lines.push('end')
  lines.push('')
  lines.push(`return Prefab("${structure.id}_placer", fn, assets)`)
  return lines.join('\n') + '\n'
}

// Confirmed in Original/prefabs/prefabs/portablecookpot.lua's itemfn/ondeploy:
// the inventory half of a deployableItem structure — MakeInventoryPhysics +
// AddComponent("deployable"), whose ondeploy spawns the real structure prefab
// at the target point and removes itself.
export function generateStructureItemPrefab(structure: StructureDef): string {
  const lines: string[] = []
  const build = resolveAnimationBuild(structure)
  const id = itemId(structure)

  lines.push('local assets =')
  lines.push('{')
  if (isVanillaAnimation(structure)) {
    lines.push(`    -- Build "${sanitizeLuaComment(build)}" reaproveitado do jogo base, sem asset próprio necessário.`)
  } else {
    lines.push(`    Asset("ANIM", "anim/${structure.id}.zip"), -- PLACEHOLDER: mesmo build da estrutura, ver README`)
  }
  if (!isVanillaAnimation(structure)) {
    lines.push(`    Asset("INV_IMAGE", "${id}"),`)
  }
  lines.push('}')
  lines.push('')
  lines.push('local function ondeploy(inst, pt)')
  lines.push(`    local placed = SpawnPrefab(${luaString(structure.id)})`)
  lines.push('    if placed ~= nil then')
  lines.push('        placed.Transform:SetPosition(pt:Get())')
  lines.push('    end')
  lines.push('    inst:Remove()')
  lines.push('end')
  lines.push('')
  lines.push(`local prefabs = { ${luaString(structure.id)} }`)
  lines.push('')
  lines.push('local function fn()')
  lines.push('    local inst = CreateEntity()')
  lines.push('')
  lines.push('    inst.entity:AddTransform()')
  lines.push('    inst.entity:AddAnimState()')
  lines.push('    inst.entity:AddNetwork()')
  lines.push('')
  lines.push('    MakeInventoryPhysics(inst)')
  lines.push('')
  lines.push(`    inst.AnimState:SetBank(${luaString(build)})`)
  lines.push(`    inst.AnimState:SetBuild(${luaString(build)})`)
  lines.push('    inst.AnimState:PlayAnimation("idle")')
  lines.push('')
  lines.push('    inst:AddTag("item")')
  lines.push('')
  lines.push('    inst.entity:SetPristine()')
  lines.push('    if not TheWorld.ismastersim then')
  lines.push('        return inst')
  lines.push('    end')
  lines.push('')
  lines.push('    inst:AddComponent("inspectable")')
  lines.push('    inst:AddComponent("inventoryitem")')
  if (isVanillaAnimation(structure)) {
    // Same fix as item.ts's own imagename assignment — see its comment for
    // the full explanation (imagename is a listenable PROPERTY, not a method;
    // SetImage only exists on the replica, not the server component).
    lines.push(`    inst.components.inventoryitem.imagename = ${luaString(build)}`)
  }
  lines.push('')
  lines.push('    inst:AddComponent("deployable")')
  lines.push('    inst.components.deployable.ondeploy = ondeploy')
  lines.push('')
  lines.push('    return inst')
  lines.push('end')
  lines.push('')
  lines.push(`return Prefab(${luaString(id)}, fn, assets, prefabs)`)

  return lines.join('\n') + '\n'
}

export function generateStructureFiles(structure: StructureDef): Record<string, string> {
  if (isDeployableItem(structure)) {
    return {
      [`scripts/prefabs/${structure.id}.lua`]: generateStructurePrefab(structure),
      [`scripts/prefabs/${itemId(structure)}.lua`]: generateStructureItemPrefab(structure),
    }
  }
  return {
    [`scripts/prefabs/${structure.id}.lua`]: generateStructurePrefab(structure),
    [`scripts/prefabs/${structure.id}_placer.lua`]: generateStructurePlacerPrefab(structure),
  }
}
