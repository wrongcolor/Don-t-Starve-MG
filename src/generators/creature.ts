import type { CreatureDef } from '../types/modProject'
import { luaString, toUpperSnake } from './luaUtils'
import { generateStategraph } from './stategraph'
import { generateBrain } from './brain'
import { resolveCreatureAnimation, isVanillaCreatureAnimation } from './creatureAnimation'

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
  const { build, clips } = resolveCreatureAnimation(creature)
  const lines: string[] = []

  lines.push('local assets =')
  lines.push('{')
  if (isVanillaCreatureAnimation(creature)) {
    lines.push(`    -- Build "${build}" reaproveitado do jogo base, sem asset próprio necessário.`)
  } else {
    lines.push(`    Asset("ANIM", "anim/${creature.id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
  }
  lines.push('}')
  lines.push('')
  lines.push('local prefabs = {}')
  lines.push('')
  lines.push('local function fn()')
  lines.push('    local inst = CreateEntity()')
  lines.push('')
  lines.push('    inst.entity:AddTransform()')
  lines.push('    inst.entity:AddAnimState()')
  lines.push('    inst.entity:AddSoundEmitter()')
  lines.push('    inst.entity:AddNetwork()')
  lines.push('')
  lines.push('    MakeCharacterPhysics(inst, 50, .5)')
  lines.push('')
  lines.push(`    inst.AnimState:SetBank(${luaString(build)})`)
  lines.push(`    inst.AnimState:SetBuild(${luaString(build)})`)
  lines.push(`    inst.AnimState:PlayAnimation(${luaString(clips.idle)})`)
  lines.push('')
  lines.push(`    inst:AddTag("${creature.behavior === 'hostile' ? 'monster' : 'animal'}")`)
  if (creature.behavior === 'hostile') lines.push('    inst:AddTag("hostile")')
  for (const tag of creature.tags) lines.push(`    inst:AddTag(${luaString(tag)})`)
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

  if (creature.companion?.tasks.includes('collectItems')) {
    lines.push('')
    lines.push('    inst:AddComponent("inventory")')
  }

  if (creature.companion?.tasks.includes('chopTrees')) {
    lines.push('')
    lines.push('    inst:AddComponent("worker")')
    lines.push('    inst.components.worker:SetAction(ACTIONS.CHOP, 1)')
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
