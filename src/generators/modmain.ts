import type { ModProject, ItemDef, CharacterDef, CreatureDef } from '../types/modProject'
import { luaString, luaStringArray, toUpperSnake } from './luaUtils'

function itemRecipeBlock(item: ItemDef): string {
  const ingredients = item.recipe.ingredients
    .map((i) => `Ingredient(${luaString(i.prefab)}, ${i.amount})`)
    .join(', ')

  const configLines = [
    `        atlas = "images/inventoryimages/${item.id}.xml",`,
    `        image = "${item.id}.tex",`,
  ]
  if (item.recipe.placer) {
    configLines.push(`        placer = "${item.id}_placer",`)
  }

  const filters = luaStringArray(item.recipe.filters)

  return [
    `AddRecipe2(${luaString(item.id)}, { ${ingredients} }, TECH.${item.recipe.techLevel}, {`,
    ...configLines,
    `    }, ${filters})`,
  ].join('\n')
}

function itemTuningBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  const lines: string[] = []
  if (item.weapon) {
    lines.push(`GLOBAL.TUNING.${upper}_DAMAGE = ${item.weapon.damage}`)
    if (item.weapon.sanityCostOnUse !== undefined) {
      lines.push(`GLOBAL.TUNING.${upper}_SANITY_COST = ${item.weapon.sanityCostOnUse}`)
    }
    if (item.weapon.ranged) {
      lines.push(`GLOBAL.TUNING.${upper}_MIN_RANGE = ${item.weapon.ranged.minRange}`)
      lines.push(`GLOBAL.TUNING.${upper}_MAX_RANGE = ${item.weapon.ranged.maxRange}`)
    }
  }
  if (item.finiteuses) lines.push(`GLOBAL.TUNING.${upper}_USES = ${item.finiteuses.maxUses}`)
  if (item.armor) {
    lines.push(`GLOBAL.TUNING.${upper}_ABSORPTION = ${item.armor.absorption}`)
    if (item.armor.sanityLossOnHitPercent !== undefined) {
      lines.push(`GLOBAL.TUNING.${upper}_SANITY_LOSS_PERCENT = ${item.armor.sanityLossOnHitPercent}`)
    }
  }
  if (item.perishable) {
    // perishtime is stored in seconds; TUNING.TOTAL_DAY_TIME is the vanilla day length constant.
    lines.push(
      `GLOBAL.TUNING.${upper}_PERISH_TIME = TUNING.TOTAL_DAY_TIME * ${item.perishable.perishTimeDays}`,
    )
  }
  if (item.stackable) lines.push(`GLOBAL.TUNING.${upper}_STACK_SIZE = ${item.stackable.maxSize}`)
  return lines
}

function itemStringsBlock(item: ItemDef): string[] {
  const upper = toUpperSnake(item.id)
  return [
    `STRINGS.NAMES.${upper} = ${luaString(item.displayName)}`,
    `STRINGS.RECIPE_DESC.${upper} = ${luaString(item.description)}`,
    `STRINGS.CHARACTERS.GENERIC.DESCRIBE.${upper} = ${luaString(item.description)}`,
  ]
}

function creatureTuningBlock(creature: CreatureDef): string[] {
  const upper = toUpperSnake(creature.id)
  const lines = [
    `GLOBAL.TUNING.${upper}_HEALTH = ${creature.stats.health}`,
    `GLOBAL.TUNING.${upper}_DAMAGE = ${creature.stats.damage}`,
    `GLOBAL.TUNING.${upper}_ATTACK_PERIOD = ${creature.stats.attackPeriod}`,
    `GLOBAL.TUNING.${upper}_WALKSPEED = ${creature.stats.walkSpeed}`,
  ]
  if (creature.stats.attackRange !== undefined) {
    lines.push(`GLOBAL.TUNING.${upper}_ATTACK_RANGE = ${creature.stats.attackRange}`)
  }
  if (creature.sanityAura !== undefined) {
    lines.push(`GLOBAL.TUNING.${upper}_SANITYAURA = ${creature.sanityAura}`)
  }
  return lines
}

function creatureStringsBlock(creature: CreatureDef): string[] {
  const upper = toUpperSnake(creature.id)
  return [
    `STRINGS.NAMES.${upper} = ${luaString(creature.displayName)}`,
    `STRINGS.CHARACTERS.GENERIC.DESCRIBE.${upper} = ${luaString(creature.description)}`,
  ]
}

function characterTuningBlock(character: CharacterDef): string[] {
  const upper = toUpperSnake(character.id)
  return [
    `GLOBAL.TUNING.${upper}_HEALTH = ${character.stats.health}`,
    `GLOBAL.TUNING.${upper}_HUNGER = ${character.stats.hunger}`,
    `GLOBAL.TUNING.${upper}_SANITY = ${character.stats.sanity}`,
  ]
}

function characterStringsAndRegistrationBlock(character: CharacterDef): string[] {
  const upper = toUpperSnake(character.id)
  return [
    `STRINGS.CHARACTER_TITLES.${character.id} = ${luaString(character.title)}`,
    `STRINGS.CHARACTER_NAMES.${character.id} = ${luaString(character.name)}`,
    `STRINGS.CHARACTER_DESCRIPTIONS.${character.id} = ${luaString(character.description)}`,
    `STRINGS.CHARACTER_QUOTES.${character.id} = ${luaString(character.quote)}`,
    `STRINGS.CHARACTERS.${upper} = require("speech_${character.id}")`,
    `AddModCharacter(${luaString(character.id)}, ${luaString(character.gender)})`,
  ]
}

// modmain.lua is the only file with access to mod-registration functions
// (AddRecipe2, AddModCharacter, PrefabFiles, STRINGS, TUNING) — prefab scripts
// just read the TUNING/STRINGS values this file sets up.
export function generateModMain(project: ModProject): string {
  const prefabFiles: string[] = []
  for (const item of project.items) {
    prefabFiles.push(item.id)
    if (item.recipe.placer) prefabFiles.push(`${item.id}_placer`)
  }
  for (const character of project.characters) prefabFiles.push(character.id)
  for (const creature of project.creatures) prefabFiles.push(creature.id)

  const sections: string[] = []

  sections.push('local require = GLOBAL.require')
  sections.push('local STRINGS = GLOBAL.STRINGS')
  sections.push('local TUNING = GLOBAL.TUNING')
  sections.push('local TECH = GLOBAL.TECH')
  sections.push('local Ingredient = GLOBAL.Ingredient')
  sections.push('')
  sections.push(`PrefabFiles = ${luaStringArray(prefabFiles)}`)

  if (project.items.length > 0) {
    sections.push('')
    sections.push('-- Items: tuning + strings')
    for (const item of project.items) {
      sections.push(...itemTuningBlock(item))
      sections.push(...itemStringsBlock(item))
    }
    sections.push('')
    sections.push('-- Items: recipes')
    for (const item of project.items) {
      sections.push(itemRecipeBlock(item))
    }
  }

  if (project.creatures.length > 0) {
    sections.push('')
    sections.push('-- Creatures: tuning + strings')
    for (const creature of project.creatures) {
      sections.push(...creatureTuningBlock(creature))
      sections.push(...creatureStringsBlock(creature))
    }
  }

  if (project.characters.length > 0) {
    sections.push('')
    sections.push('-- Characters: tuning + strings + registration')
    for (const character of project.characters) {
      sections.push(...characterTuningBlock(character))
      sections.push(...characterStringsAndRegistrationBlock(character))
    }
  }

  return sections.join('\n') + '\n'
}
