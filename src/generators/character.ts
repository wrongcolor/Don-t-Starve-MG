import type { CharacterDef } from '../types/modProject'
import { luaStringArray, toUpperSnake } from './luaUtils'
import { generateSkillTreeFile } from './skillTree'

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

// PLACEHOLDER assets: reuses Wilson's build/bank as a fallback so the character loads
// without crashing before the user swaps in real Spriter-produced art — see README.
export function generateCharacterPrefab(character: CharacterDef): string {
  const upper = toUpperSnake(character.id)
  const lines: string[] = []

  lines.push('local MakePlayerCharacter = require("prefabs/player_common")')
  lines.push('')
  lines.push('local assets =')
  lines.push('{')
  lines.push('    Asset("ANIM", "anim/player_wilson.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)')
  lines.push('    Asset("ANIM", "anim/player_wilson_none.zip"), -- PLACEHOLDER')
  lines.push('    Asset("ANIM", "anim/ghost_wilson_build.zip"), -- PLACEHOLDER')
  lines.push('}')
  lines.push('')
  lines.push('local prefabs = {}')
  lines.push('')
  lines.push(`local start_inv = ${luaStringArray(character.startingInventory)}`)
  lines.push('')
  lines.push('local function common_postinit(inst)')
  lines.push(`    inst.MiniMapEntity:SetIcon("${character.id}.tex") -- PLACEHOLDER: ícone do minimapa`)
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
