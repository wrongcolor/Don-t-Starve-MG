import type { ModProject, ItemDef, StructureDef, CharacterDef, CreatureDef, Container } from '../types/modProject'
import { luaString, luaStringArray, toUpperSnake } from './luaUtils'
import { containerColumns, containerSlotCount, containerCustomWidgetBuild } from './item'

function itemRecipeBlock(item: ItemDef): string {
  const ingredients = item.recipe.ingredients
    .map((i) => `Ingredient(${luaString(i.prefab)}, ${i.amount})`)
    .join(', ')

  const configLines = [
    `        atlas = "images/inventoryimages/${item.id}.xml",`,
    `        image = "${item.id}.tex",`,
  ]

  const filters = luaStringArray(item.recipe.filters)

  return [
    `AddRecipe2(${luaString(item.id)}, { ${ingredients} }, TECH.${item.recipe.techLevel}, {`,
    ...configLines,
    `    }, ${filters})`,
  ].join('\n')
}

// A placer-mode structure's recipe always registers a placer — unlike an item,
// it's the one thing every such structure has in common. A deployableItem
// structure instead crafts straight to its "_item" inventory prefab, with no
// placer field at all — confirmed in Original/scripts/recipes.lua's own
// Recipe2("portablecookpot_item", ...).
function structureRecipeBlock(structure: StructureDef): string {
  const deployableItem = structure.deployMode === 'deployableItem'
  const product = deployableItem ? `${structure.id}_item` : structure.id
  const ingredients = structure.recipe.ingredients
    .map((i) => `Ingredient(${luaString(i.prefab)}, ${i.amount})`)
    .join(', ')

  const configLines = [
    `        atlas = "images/inventoryimages/${product}.xml",`,
    `        image = "${product}.tex",`,
    ...(deployableItem ? [] : [`        placer = "${structure.id}_placer",`]),
  ]

  const filters = luaStringArray(structure.recipe.filters)

  return [
    `AddRecipe2(${luaString(product)}, { ${ingredients} }, TECH.${structure.recipe.techLevel}, {`,
    ...configLines,
    `    }, ${filters})`,
  ].join('\n')
}

function structureTuningBlock(structure: StructureDef): string[] {
  const upper = toUpperSnake(structure.id)
  const lines: string[] = []
  if (structure.daySpawner) {
    lines.push(`GLOBAL.TUNING.${upper}_SPAWN_CHANCE = ${structure.daySpawner.chance}`)
    lines.push(`GLOBAL.TUNING.${upper}_SPAWN_RANGE = ${structure.daySpawner.range}`)
  }
  if (structure.resident) {
    lines.push(`GLOBAL.TUNING.${upper}_RESPAWN_DELAY = TUNING.TOTAL_DAY_TIME * ${structure.resident.respawnDelayDays}`)
  }
  return lines
}

// A deployableItem structure is inspectable/nameable as BOTH prefabs (the
// carried item and the placed structure) — confirmed in Original/scripts/
// strings.lua's own NAMES.PORTABLECOOKPOT + NAMES.PORTABLECOOKPOT_ITEM pair.
// RECIPE_DESC is keyed to whichever prefab is the recipe's actual product.
function structureStringsBlock(structure: StructureDef): string[] {
  const upper = toUpperSnake(structure.id)
  const name = luaString(structure.displayName)
  const desc = luaString(structure.description)

  if (structure.deployMode === 'deployableItem') {
    const itemUpper = toUpperSnake(`${structure.id}_item`)
    return [
      `STRINGS.NAMES.${upper} = ${name}`,
      `STRINGS.NAMES.${itemUpper} = ${name}`,
      `STRINGS.RECIPE_DESC.${itemUpper} = ${desc}`,
      `STRINGS.CHARACTERS.GENERIC.DESCRIBE.${upper} = ${desc}`,
      `STRINGS.CHARACTERS.GENERIC.DESCRIBE.${itemUpper} = ${desc}`,
    ]
  }

  return [
    `STRINGS.NAMES.${upper} = ${name}`,
    `STRINGS.RECIPE_DESC.${upper} = ${desc}`,
    `STRINGS.CHARACTERS.GENERIC.DESCRIBE.${upper} = ${desc}`,
  ]
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
    } else if (item.weapon.meleeRange !== undefined) {
      lines.push(`GLOBAL.TUNING.${upper}_MELEE_RANGE = ${item.weapon.meleeRange}`)
    }
  }
  if (item.finiteuses) lines.push(`GLOBAL.TUNING.${upper}_USES = ${item.finiteuses.maxUses}`)
  if (item.armor) {
    lines.push(`GLOBAL.TUNING.${upper}_CONDITION = ${item.armor.condition}`)
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
  if (item.edible) {
    lines.push(`GLOBAL.TUNING.${upper}_HEALTH = ${item.edible.healthValue}`)
    lines.push(`GLOBAL.TUNING.${upper}_HUNGER = ${item.edible.hungerValue}`)
    lines.push(`GLOBAL.TUNING.${upper}_SANITY = ${item.edible.sanityValue}`)
  }
  if (item.onEatBuff) {
    lines.push(`GLOBAL.TUNING.${upper}_DAMAGE_BUFF_MULT = ${item.onEatBuff.damageMultiplier}`)
    lines.push(`GLOBAL.TUNING.${upper}_DAMAGE_BUFF_DURATION = ${item.onEatBuff.durationSeconds}`)
  }
  if (item.rechargeable) {
    lines.push(`GLOBAL.TUNING.${upper}_COOLDOWN = ${item.rechargeable.cooldownSeconds}`)
  }
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
  if (creature.herd !== undefined) {
    lines.push(`GLOBAL.TUNING.${upper}HERD_MAX_SIZE = ${creature.herd.maxSize}`)
    lines.push(`GLOBAL.TUNING.${upper}HERD_GATHER_RANGE = ${creature.herd.gatherRange}`)
    lines.push(`GLOBAL.TUNING.${upper}HERD_SPAWN_MIN = TUNING.TOTAL_DAY_TIME * ${creature.herd.spawnIntervalDays.min}`)
    lines.push(`GLOBAL.TUNING.${upper}HERD_SPAWN_MAX = TUNING.TOTAL_DAY_TIME * ${creature.herd.spawnIntervalDays.max}`)
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

function needsContainerParams(project: ModProject): boolean {
  return project.items.some((item) => item.container) || project.structures.some((structure) => structure.container)
}

// Adapted from TWO real published Workshop mods (see docs/dst-knowledge/
// patterns.md#20). `containers.params.<id>` — the slot grid, widget skin, and
// whether it auto-opens as a side panel — can only be set up from
// modmain.lua (the prefab script just calls WidgetSetup with this id). Shared
// by Item and Structure containers alike — takes the id + container config
// directly rather than a whole ItemDef.
function containerParamsBlock(id: string, container: Container): string[] {
  const widget = container.widget
  const lines: string[] = []

  if (widget.source === 'vanilla') {
    // Confirmed in "Automation Farm": clone an existing container's ENTIRE
    // widget config (skin + exact slot grid) at runtime — no manual grid math,
    // works for any valid container prefab id, not just one curated preset.
    lines.push(`params.${id} = GLOBAL.deepcopy(containers.params[${luaString(widget.reusePrefab)}])`)
  } else {
    const columns = containerColumns(container)
    const slots = containerSlotCount(container)
    const build = containerCustomWidgetBuild(id)
    lines.push(`params.${id} = {`)
    lines.push('    widget = {')
    lines.push('        slotpos = {},')
    lines.push(`        animbank = ${luaString(build)},`)
    lines.push(`        animbuild = ${luaString(build)},`)
    lines.push('        pos = Vector3(0, 0, 0),')
    lines.push('    },')
    lines.push('}')
    lines.push('')
    // NOT confirmed against a working custom-art example (see patterns.md#20)
    // — a generic even grid at 75px spacing. Needs a matching ui_<id> build
    // supplied by the user (see README).
    const rows = Math.ceil(slots / columns)
    for (let i = 0; i < slots; i++) {
      const row = Math.floor(i / columns)
      const col = i % columns
      const x = (col - (columns - 1) / 2) * 75
      const y = ((rows - 1) / 2 - row) * 75
      lines.push(`table.insert(params.${id}.widget.slotpos, Vector3(${x}, ${y}, 0))`)
    }
  }

  lines.push(`params.${id}.issidewidget = ${container.sideWidget}`)
  lines.push(`params.${id}.type = ${luaString(id)}`)
  lines.push('')
  lines.push(`containers.MAXITEMSLOTS = math.max(containers.MAXITEMSLOTS, #params.${id}.widget.slotpos)`)

  const acceptConditions: string[] = []
  if (container.acceptsTag) {
    acceptConditions.push(`item:HasTag(${luaString(container.acceptsTag)})`)
  }
  for (const prefab of container.acceptsPrefabs ?? []) {
    acceptConditions.push(`item.prefab == ${luaString(prefab)}`)
  }
  if (acceptConditions.length > 0) {
    lines.push('')
    lines.push(`function params.${id}.itemtestfn(container, item, slot)`)
    lines.push(`    return ${acceptConditions.join(' or ')}`)
    lines.push('end')
  }

  return lines
}

function needsCombineAction(project: ModProject): boolean {
  return project.items.some((item) => item.combinable)
}

// Adapted from a real published Workshop mod ("Repair Combine", see
// docs/dst-knowledge/patterns.md#19). Registering a brand-new player action
// (AddAction/AddComponentAction/AddStategraphActionHandler) only works from
// modmain.lua, not from a prefab script — so this is emitted once here, shared
// by every combinable item, instead of once per item. "inventoryitem" is used
// as the AddComponentAction component (present on every item) with a manual
// tag check inside, instead of a custom component class like the source mod.
function combineActionBlock(): string[] {
  return [
    'local ACTIONS = GLOBAL.ACTIONS',
    'local ActionHandler = GLOBAL.ActionHandler',
    '',
    'local COMBINE_ITEM_ACTION = AddAction("COMBINE_ITEM", "Combine", function(act)',
    '    if act.target ~= nil and act.invobject ~= nil and act.target.CombineWith ~= nil then',
    '        return act.target:CombineWith(act.invobject)',
    '    end',
    'end)',
    'COMBINE_ITEM_ACTION.mount_valid = true',
    'COMBINE_ITEM_ACTION.encumbered_valid = true',
    '',
    'AddComponentAction("USEITEM", "inventoryitem", function(inst, doer, target, actions, right)',
    '    if right and target ~= nil and inst.prefab == target.prefab and inst ~= target',
    '        and inst:HasTag("combinable_item") and target:HasTag("combinable_item") then',
    '        table.insert(actions, ACTIONS.COMBINE_ITEM)',
    '    end',
    'end)',
    '',
    'AddStategraphActionHandler("wilson", ActionHandler(ACTIONS.COMBINE_ITEM, "dolongaction"))',
    'AddStategraphActionHandler("wilson_client", ActionHandler(ACTIONS.COMBINE_ITEM, "dolongaction"))',
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

// Confirmed in the base game's own scripts/prefabs/skilltree_defs.lua (see
// docs/dst-knowledge/patterns.md#28), mirrored exactly by a real character mod's
// modmain.lua ("Dryad"): registering a tree is require the generated skill file,
// call it with skilltree_defs.FN, then hand the resulting SKILLS/ORDERS to
// CreateSkillTreeFor / SKILLTREE_ORDERS.
function skillTreeRegistrationBlock(character: CharacterDef): string[] {
  const varName = `${character.id}_skilltree_data`
  return [
    `local ${varName} = require(${luaString(`prefabs/skilltree_${character.id}`)})(skilltree_defs.FN)`,
    `skilltree_defs.CreateSkillTreeFor(${luaString(character.id)}, ${varName}.SKILLS)`,
    `skilltree_defs.SKILLTREE_ORDERS[${luaString(character.id)}] = ${varName}.ORDERS`,
  ]
}

// modmain.lua is the only file with access to mod-registration functions
// (AddRecipe2, AddModCharacter, PrefabFiles, STRINGS, TUNING) — prefab scripts
// just read the TUNING/STRINGS values this file sets up.
export function generateModMain(project: ModProject): string {
  const prefabFiles: string[] = []
  for (const item of project.items) {
    prefabFiles.push(item.id)
  }
  for (const structure of project.structures) {
    prefabFiles.push(structure.id, structure.deployMode === 'deployableItem' ? `${structure.id}_item` : `${structure.id}_placer`)
  }
  for (const character of project.characters) {
    prefabFiles.push(character.id)
    if (character.skillTree) prefabFiles.push(`skilltree_${character.id}`)
  }
  for (const creature of project.creatures) {
    prefabFiles.push(creature.id)
    if (creature.herd) prefabFiles.push(`${creature.id}herd`)
  }

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

  if (project.structures.length > 0) {
    sections.push('')
    sections.push('-- Structures: tuning + strings')
    for (const structure of project.structures) {
      sections.push(...structureTuningBlock(structure))
      sections.push(...structureStringsBlock(structure))
    }
    sections.push('')
    sections.push('-- Structures: recipes')
    for (const structure of project.structures) {
      sections.push(structureRecipeBlock(structure))
    }
  }

  if (needsCombineAction(project)) {
    sections.push('')
    sections.push('-- Combine action (shared by every combinable item)')
    sections.push(...combineActionBlock())
  }

  if (needsContainerParams(project)) {
    sections.push('')
    sections.push('-- Container widgets')
    sections.push('local containers = require("containers")')
    sections.push('local params = containers.params')
    for (const item of project.items) {
      if (item.container) {
        sections.push('')
        sections.push(...containerParamsBlock(item.id, item.container))
      }
    }
    for (const structure of project.structures) {
      if (structure.container) {
        sections.push('')
        sections.push(...containerParamsBlock(structure.id, structure.container))
      }
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

  const charactersWithSkillTree = project.characters.filter((character) => character.skillTree)
  if (charactersWithSkillTree.length > 0) {
    sections.push('')
    sections.push('-- Skill trees (docs/dst-knowledge/patterns.md#28)')
    sections.push('local skilltree_defs = require("prefabs/skilltree_defs")')
    for (const character of charactersWithSkillTree) {
      sections.push(...skillTreeRegistrationBlock(character))
    }
  }

  return sections.join('\n') + '\n'
}
