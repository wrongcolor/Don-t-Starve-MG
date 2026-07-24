import type { CharacterDef } from '../types/modProject'
import { luaString, luaStringArray, toUpperSnake } from './luaUtils'
import { generateSkillTreeFile } from './skillTree'

// Custom keeps the character's own id as the build name — the same name
// MakePlayerCharacter's internal SetBuild(name) already defaults to, so no
// override is needed there, just the placeholder art the user must supply.
function resolveAnimationBuild(character: CharacterDef): string {
  return character.animation?.source === 'vanilla' ? character.animation.build : character.id
}

function isVanillaAnimation(character: CharacterDef): boolean {
  return character.animation?.source === 'vanilla'
}

// Best-effort perk snippets using real, documented component APIs. These are starting
// points — exact balance values are meant to be tweaked by the user, not final tuning.
function perkLines(character: CharacterDef): string[] {
  const lines: string[] = []
  for (const perk of character.perks) {
    switch (perk) {
      case 'no_sanity_drain':
        lines.push('    inst.components.sanity.dapperness = 0 -- ajuste conforme necessário')
        break
      case 'fire_immune':
        lines.push('    inst:AddTag("fireimmune")')
        break
      case 'freeze_immune':
        lines.push('    inst:AddTag("freezeimmune")')
        break
      case 'night_vision':
        lines.push('    if inst.components.playervision ~= nil then')
        lines.push('        inst.components.playervision:ToggleNightVision(true)')
        lines.push('    end')
        break
    }
  }
  return lines
}

// Confirmed in dryad.lua's master_postinit (docs/dst-knowledge/patterns.md#21),
// with Dryad's own skill-tree conditionals stripped out — just the static
// multiplier value. "no_hunger" and "faster_walk" used to be fixed perks for
// two of these (hungerrate = 0, speed x1.25); a plain multiplier field covers
// both plus anything in between, so those perks were removed.
function statMultiplierLines(character: CharacterDef): string[] {
  const lines: string[] = []
  if (character.damageMultiplier !== undefined) {
    lines.push(`    inst.components.combat.damagemultiplier = ${character.damageMultiplier}`)
  }
  if (character.hungerRateMultiplier !== undefined) {
    lines.push(`    inst.components.hunger.hungerrate = ${character.hungerRateMultiplier} * TUNING.WILSON_HUNGER_RATE`)
  }
  if (character.walkSpeedMultiplier !== undefined) {
    lines.push(
      `    inst.components.locomotor:SetExternalSpeedMultiplier(inst, "${character.id}_speed_mod", ${character.walkSpeedMultiplier})`,
    )
  }
  for (const affinity of character.foodTypeAffinities) {
    lines.push(`    inst.components.foodaffinity:AddFoodtypeAffinity(FOODTYPE.${affinity.foodType}, ${affinity.multiplier})`)
  }
  return lines
}

// Assets: when the character reuses a vanilla build (animation.source ===
// 'vanilla'), no Asset() is declared at all — that build is already
// preloaded globally by the base game (global.lua's own Asset("PKGREF",
// "anim/<id>.zip") list). Otherwise this is a PLACEHOLDER: the user must
// supply anim/<id>.zip (and a matching ghost build) themselves — see README.
export function generateCharacterPrefab(character: CharacterDef): string {
  const upper = toUpperSnake(character.id)
  const build = resolveAnimationBuild(character)
  const lines: string[] = []

  lines.push('local MakePlayerCharacter = require("prefabs/player_common")')
  lines.push('')
  lines.push('local assets =')
  lines.push('{')
  if (isVanillaAnimation(character)) {
    lines.push(`    -- Build "${build}" reaproveitado do jogo base, sem asset próprio necessário.`)
  } else {
    lines.push(`    Asset("ANIM", "anim/${character.id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
    lines.push(`    Asset("ANIM", "anim/ghost_${character.id}_build.zip"), -- PLACEHOLDER: build do fantasma`)
  }
  lines.push('}')
  lines.push('')
  lines.push('local prefabs = {}')
  lines.push('')
  lines.push(`local start_inv = ${luaStringArray(character.startingInventory)}`)
  lines.push('')
  lines.push('local function common_postinit(inst)')
  lines.push(`    inst.MiniMapEntity:SetIcon("${character.id}.tex") -- PLACEHOLDER: ícone do minimapa`)
  if (isVanillaAnimation(character)) {
    lines.push(`    inst.AnimState:SetBuild(${luaString(build)}) -- reaproveita o visual de "${build}" em vez do build próprio`)
  }
  lines.push('end')
  lines.push('')
  lines.push('local function master_postinit(inst)')
  lines.push(`    inst.components.health:SetMaxHealth(TUNING.${upper}_HEALTH)`)
  lines.push(`    inst.components.hunger:SetMax(TUNING.${upper}_HUNGER)`)
  lines.push(`    inst.components.sanity:SetMax(TUNING.${upper}_SANITY)`)
  const perks = perkLines(character)
  if (perks.length > 0) {
    lines.push('')
    lines.push(...perks)
  }
  const multipliers = statMultiplierLines(character)
  if (multipliers.length > 0) {
    lines.push('')
    lines.push(...multipliers)
  }
  if (character.mana !== undefined) {
    lines.push('')
    lines.push('    inst:AddComponent("mana")')
    lines.push(`    inst.components.mana:SetMax(TUNING.${upper}_MANA_MAX)`)
    if (character.mana.regenPerSecond !== undefined) {
      lines.push(`    inst.components.mana:SetRegenRate(TUNING.${upper}_MANA_REGEN)`)
    }
  }
  lines.push('end')
  lines.push('')
  lines.push(
    `return MakePlayerCharacter("${character.id}", prefabs, assets, common_postinit, master_postinit, start_inv)`,
  )

  return lines.join('\n') + '\n'
}

export function generateCharacterFiles(
  character: CharacterDef,
  speechFile: string,
): Record<string, string> {
  const files: Record<string, string> = {
    [`scripts/prefabs/${character.id}.lua`]: generateCharacterPrefab(character),
    [`scripts/speech_${character.id}.lua`]: speechFile,
  }
  if (character.skillTree) {
    files[`scripts/prefabs/skilltree_${character.id}.lua`] = generateSkillTreeFile(character)
  }
  return files
}
