import type { CreatureDef } from '../types/modProject'
import { luaString, sanitizeLuaComment, toUpperSnake } from './luaUtils'
import { generateStategraph } from './stategraph'
import { generateBrain } from './brain'
import { resolveCreatureAnimation, isVanillaCreatureAnimation, isIslandAdventuresShipwreckedAnimation } from './creatureAnimation'
import { groundAttackFunctionBlock } from './groundAttack'

function needsHerd(creature: CreatureDef): boolean {
  return creature.herd !== undefined
}

// Confirmed in a real published Workshop mod ("Seafellow", see
// docs/dst-knowledge/patterns.md#27) — a "herd" is a separate, non-networked
// manager entity (no AddNetwork/SetPristine, exactly like the source mod)
// that periodically spawns new members up to a max size.
export function generateHerdPrefab(creature: CreatureDef): string {
  const upper = toUpperSnake(creature.id)
  const lines: string[] = []

  lines.push(`local prefabs = { ${luaString(creature.id)} }`)
  lines.push('')
  lines.push('local function CanSpawn(inst)')
  lines.push('    return inst.components.herd ~= nil and not inst.components.herd:IsFull()')
  lines.push('end')
  lines.push('')
  lines.push('local function OnSpawned(inst, newent)')
  lines.push('    if inst.components.herd ~= nil then')
  lines.push('        inst.components.herd:AddMember(newent)')
  lines.push('    end')
  lines.push('end')
  lines.push('')
  lines.push('local function fn()')
  lines.push('    local inst = CreateEntity()')
  lines.push('')
  lines.push('    inst.entity:AddTransform()')
  lines.push('')
  lines.push('    inst:AddTag("herd")')
  lines.push('    inst:AddTag("NOBLOCK")')
  lines.push('    inst:AddTag("NOCLICK")')
  lines.push('')
  lines.push('    inst:AddComponent("herd")')
  lines.push(`    inst.components.herd:SetMemberTag(${luaString(creature.id)})`)
  lines.push(`    inst.components.herd:SetMaxSize(TUNING.${upper}HERD_MAX_SIZE)`)
  lines.push(`    inst.components.herd:SetGatherRange(TUNING.${upper}HERD_GATHER_RANGE)`)
  lines.push(`    inst.components.herd:SetUpdateRange(TUNING.${upper}HERD_GATHER_RANGE)`)
  lines.push('    inst.components.herd:SetOnEmptyFn(inst.Remove)')
  lines.push('    inst.components.herd.nomerging = true')
  lines.push('')
  lines.push('    inst:AddComponent("periodicspawner")')
  lines.push(`    inst.components.periodicspawner:SetRandomTimes(TUNING.${upper}HERD_SPAWN_MIN, TUNING.${upper}HERD_SPAWN_MAX)`)
  lines.push(`    inst.components.periodicspawner:SetPrefab(${luaString(creature.id)})`)
  lines.push('    inst.components.periodicspawner:SetOnSpawnFn(OnSpawned)')
  lines.push('    inst.components.periodicspawner:SetSpawnTestFn(CanSpawn)')
  lines.push('    inst.components.periodicspawner:SetOnlySpawnOffscreen(true)')
  lines.push('    inst.components.periodicspawner:Start()')
  lines.push('')
  lines.push('    return inst')
  lines.push('end')
  lines.push('')
  lines.push(`return Prefab(${luaString(creature.id + 'herd')}, fn, nil, prefabs)`)

  return lines.join('\n') + '\n'
}

function defendLeaderFunctionBlock(): string[] {
  return [
    'local function TryDefendLeader(inst)',
    '    local leader = FindClosestPlayerToInst(inst, 30, true)',
    '    if leader ~= nil and inst.components.follower:GetLeader() ~= leader then',
    '        inst.components.follower:SetLeader(leader)',
    '    end',
    'end',
    '',
  ]
}

function lootBlock(creature: CreatureDef): string[] {
  if (creature.loot.length === 0) return []
  const lines = ['', '    inst:AddComponent("lootdropper")']
  for (const drop of creature.loot) {
    lines.push(`    inst.components.lootdropper:AddChancedLoot(${luaString(drop.prefab)}, ${drop.chance})`)
  }
  return lines
}

// Assets: when the creature reuses a vanilla build (creature.animation.source === 'vanilla'),
// no Asset("ANIM", ...) is declared — that animation data is already loaded by the base
// game. Otherwise this is a PLACEHOLDER: the user must supply anim/<id>.zip themselves
// (see README) before this prefab will load without a missing-build error.
export function generateCreaturePrefab(creature: CreatureDef): string {
  const upper = toUpperSnake(creature.id)
  const { bank, build, clips } = resolveCreatureAnimation(creature)
  const lines: string[] = []

  lines.push('local assets =')
  lines.push('{')
  if (isIslandAdventuresShipwreckedAnimation(creature)) {
    lines.push(`    -- Build "${sanitizeLuaComment(build)}" reaproveitado do mod "Island Adventures - Shipwrecked", sem asset próprio necessário.`)
  } else if (isVanillaCreatureAnimation(creature)) {
    lines.push(`    -- Build "${sanitizeLuaComment(build)}" reaproveitado do jogo base, sem asset próprio necessário.`)
  } else {
    lines.push(`    Asset("ANIM", "anim/${creature.id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
  }
  lines.push('}')
  lines.push('')
  lines.push('local prefabs = {}')
  lines.push('')
  if (creature.groundAttack !== undefined) {
    lines.push(...groundAttackFunctionBlock(creature.id, creature.groundAttack))
    lines.push(
      'local function TryGroundAttack(inst)',
      '    if inst.components.combat:HasTarget() then',
      '        local x, y, z = inst.Transform:GetWorldPosition()',
      '        dogroundattack(Vector3(x, y, z))',
      '    end',
      'end',
      '',
    )
  }
  if (creature.companion?.defendLeader) {
    lines.push(...defendLeaderFunctionBlock())
  }
  lines.push('local function fn()')
  lines.push('    local inst = CreateEntity()')
  lines.push('')
  lines.push('    inst.entity:AddTransform()')
  lines.push('    inst.entity:AddAnimState()')
  lines.push('    inst.entity:AddSoundEmitter()')
  if (creature.light !== undefined) lines.push('    inst.entity:AddLight()')
  lines.push('    inst.entity:AddNetwork()')
  lines.push('')
  lines.push('    MakeCharacterPhysics(inst, 50, .5)')
  lines.push('')
  lines.push(`    inst.AnimState:SetBank(${luaString(bank)})`)
  lines.push(`    inst.AnimState:SetBuild(${luaString(build)})`)
  lines.push(`    inst.AnimState:PlayAnimation(${luaString(clips.idle)})`)
  lines.push('')
  if (creature.light !== undefined) {
    lines.push(`    inst.Light:SetRadius(TUNING.${upper}_LIGHT_RADIUS)`)
    lines.push(`    inst.Light:SetFalloff(TUNING.${upper}_LIGHT_FALLOFF)`)
    lines.push(`    inst.Light:SetIntensity(TUNING.${upper}_LIGHT_INTENSITY)`)
    lines.push(`    inst.Light:SetColour(TUNING.${upper}_LIGHT_COLOUR_R, TUNING.${upper}_LIGHT_COLOUR_G, TUNING.${upper}_LIGHT_COLOUR_B)`)
    lines.push('    inst.Light:Enable(true)')
    lines.push('')
  }
  lines.push(`    inst:AddTag("${creature.behavior === 'hostile' ? 'monster' : 'animal'}")`)
  if (creature.behavior === 'hostile') lines.push('    inst:AddTag("hostile")')
  for (const tag of creature.tags) lines.push(`    inst:AddTag(${luaString(tag)})`)
  if (needsHerd(creature)) lines.push(`    inst:AddTag(${luaString(creature.id)})`)
  lines.push('')
  lines.push('    inst.entity:SetPristine()')
  lines.push('    if not TheWorld.ismastersim then')
  lines.push('        return inst')
  lines.push('    end')
  lines.push('')
  lines.push('    inst:AddComponent("locomotor")')
  lines.push(`    inst.components.locomotor.walkspeed = TUNING.${upper}_WALKSPEED`)
  lines.push('')
  lines.push('    inst:AddComponent("health")')
  lines.push(`    inst.components.health:SetMaxHealth(TUNING.${upper}_HEALTH)`)
  lines.push('')
  lines.push('    inst:AddComponent("combat")')
  lines.push(`    inst.components.combat:SetDefaultDamage(TUNING.${upper}_DAMAGE)`)
  lines.push(`    inst.components.combat:SetAttackPeriod(TUNING.${upper}_ATTACK_PERIOD)`)
  if (creature.stats.attackRange !== undefined) {
    lines.push(`    inst.components.combat:SetRange(TUNING.${upper}_ATTACK_RANGE)`)
  } else {
    lines.push('    inst.components.combat:SetRange(2)')
  }
  if (creature.groundAttack !== undefined) {
    lines.push(`    inst:DoPeriodicTask(TUNING.${upper}_GROUNDATTACK_COOLDOWN, TryGroundAttack)`)
  }
  lines.push(...lootBlock(creature))

  if (creature.sanityAura !== undefined) {
    lines.push('')
    lines.push('    inst:AddComponent("sanityaura")')
    lines.push(`    inst.components.sanityaura.aura = TUNING.${upper}_SANITYAURA`)
  }

  if (creature.flammable) {
    lines.push('')
    lines.push('    -- "body" é o símbolo mais comum pro efeito de fogo — ajuste se o build usar outro nome.')
    lines.push('    MakeMediumBurnableCharacter(inst, "body")')
  }

  if (creature.freezable) {
    lines.push('')
    lines.push('    -- "body" é o símbolo mais comum pro efeito de gelo — ajuste se o build usar outro nome.')
    lines.push('    MakeMediumFreezableCharacter(inst, "body")')
  }

  if (creature.cookable) {
    lines.push('')
    lines.push('    inst:AddComponent("cookable")')
    lines.push(`    inst.components.cookable.product = ${luaString(creature.cookable.product)}`)
  }

  if (needsHerd(creature)) {
    lines.push('')
    lines.push('    inst:AddComponent("herdmember")')
    lines.push(`    inst.components.herdmember:SetHerdPrefab(${luaString(creature.id + 'herd')})`)
  }

  if (creature.panicCauses.includes('haunted')) {
    lines.push('')
    lines.push('    inst:AddComponent("hauntable")')
  }

  const needsChop = creature.companion?.tasks.includes('chopTrees') || creature.work?.tasks.includes('chopTrees')
  const needsMine = creature.work?.tasks.includes('mineRocks')
  const needsInventory = creature.companion?.tasks.includes('collectItems') || creature.work?.tasks.includes('harvestFarm')

  if (needsInventory) {
    lines.push('')
    lines.push('    inst:AddComponent("inventory")')
  }

  if (needsChop || needsMine) {
    lines.push('')
    lines.push('    inst:AddComponent("worker")')
    if (needsChop) lines.push('    inst.components.worker:SetAction(ACTIONS.CHOP, 1)')
    if (needsMine) lines.push('    inst.components.worker:SetAction(ACTIONS.MINE, 1)')
  }

  if (creature.companion?.defendLeader) {
    lines.push('')
    lines.push('    inst:AddComponent("follower")')
    lines.push('    inst:DoPeriodicTask(2, TryDefendLeader)')
  }

  lines.push('')
  lines.push('    inst:AddComponent("inspectable")')
  lines.push('')
  lines.push(`    inst:SetStateGraph("SG${creature.id}")`)
  lines.push(`    inst:SetBrain(require("brains/${creature.id}brain"))`)
  lines.push('')
  lines.push('    return inst')
  lines.push('end')
  lines.push('')
  lines.push(`return Prefab("${creature.id}", fn, assets, prefabs)`)

  return lines.join('\n') + '\n'
}

export function generateCreatureFiles(creature: CreatureDef): Record<string, string> {
  const files: Record<string, string> = {
    [`scripts/prefabs/${creature.id}.lua`]: generateCreaturePrefab(creature),
    [`scripts/stategraphs/SG${creature.id}.lua`]: generateStategraph(creature),
    [`scripts/brains/${creature.id}brain.lua`]: generateBrain(creature),
  }
  if (needsHerd(creature)) {
    files[`scripts/prefabs/${creature.id}herd.lua`] = generateHerdPrefab(creature)
  }
  return files
}
