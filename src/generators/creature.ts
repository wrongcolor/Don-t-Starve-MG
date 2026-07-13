import type { CreatureDef } from '../types/modProject'
import { luaString, toUpperSnake } from './luaUtils'
import { generateStategraph } from './stategraph'
import { generateBrain } from './brain'
import { resolveCreatureAnimation, isVanillaCreatureAnimation } from './creatureAnimation'

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
  lines.push('    inst.components.combat:SetRange(2)')
  lines.push(...lootBlock(creature))
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
  return {
    [`scripts/prefabs/${creature.id}.lua`]: generateCreaturePrefab(creature),
    [`scripts/stategraphs/SG${creature.id}.lua`]: generateStategraph(creature),
    [`scripts/brains/${creature.id}brain.lua`]: generateBrain(creature),
  }
}
