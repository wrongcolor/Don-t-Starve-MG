import type { StructureDef } from '../types/modProject'
import { luaString, toUpperSnake } from './luaUtils'
import { containerCustomWidgetBuild } from './item'

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

function lootBlock(structure: StructureDef): string[] {
  if (structure.loot.length === 0) return ['', '    inst:AddComponent("lootdropper")']
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
  lines.push(...lootBlock(structure))
  lines.push('')
  lines.push('    inst:AddComponent("workable")')
  lines.push('    inst.components.workable:SetWorkAction(ACTIONS.HAMMER)')
  lines.push('    inst.components.workable:SetWorkLeft(4)')
  lines.push('    inst.components.workable:SetOnFinishCallback(onhammered)')

  if (structure.container) {
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

  return lines.join('\n')
}

// Assets: when the structure reuses a vanilla build (structure.animation.source
// === 'vanilla'), no Asset("ANIM", ...) is declared — that animation data is
// already loaded by the base game. Otherwise this is a PLACEHOLDER: the user
// must supply anim/<id>.zip produced with Klei's Spriter tooling.
export function generateStructurePrefab(structure: StructureDef): string {
  const lines: string[] = []
  const build = resolveAnimationBuild(structure)

  lines.push('local assets =')
  lines.push('{')
  if (isVanillaAnimation(structure)) {
    lines.push(`    -- Build "${build}" reaproveitado do jogo base, sem asset próprio necessário.`)
  } else {
    lines.push(`    Asset("ANIM", "anim/${structure.id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
  }
  if (structure.container?.widget.source === 'custom') {
    lines.push(`    Asset("ANIM", "anim/${containerCustomWidgetBuild(structure.id)}.zip"), -- PLACEHOLDER: art da UI do contêiner, ver README`)
  }
  lines.push(`    Asset("INV_IMAGE", "${structure.id}"),`)
  lines.push('}')
  lines.push('')
  lines.push(...onHammeredFunctionBlock())
  if (structure.teleportPair) {
    lines.push(...teleportPairFunctionBlock())
  }
  if (needsDaySpawner(structure)) {
    lines.push(...daySpawnerFunctionBlock(structure))
  }
  lines.push(needsDaySpawner(structure) ? `local prefabs = { ${luaString(structure.daySpawner!.prefab)} }` : 'local prefabs = {}')
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
    lines.push(`    -- Build "${build}" reaproveitado do jogo base, sem asset próprio necessário.`)
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

export function generateStructureFiles(structure: StructureDef): Record<string, string> {
  return {
    [`scripts/prefabs/${structure.id}.lua`]: generateStructurePrefab(structure),
    [`scripts/prefabs/${structure.id}_placer.lua`]: generateStructurePlacerPrefab(structure),
  }
}
