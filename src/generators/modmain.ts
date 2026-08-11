import type { ModProject, ItemDef, StructureDef, CharacterDef, CreatureDef, Container, GroundAttackConfig } from '../types/modProject'
import { luaString, luaStringArray, toUpperSnake } from './luaUtils'
import { containerColumns, containerSlotCount, containerCustomWidgetBuild, itemRecipeIcon, chakramProjectileId } from './item'
import { structureRecipeIcon } from './structure'
import { generateWorldEventBlock, isWorldScopedTrigger, pickRandomOnlinePlayerBlock, worldEventTuningBlock } from './worldEvent'
import { characterPortraitAssets } from './character'

function itemRecipeBlock(item: ItemDef): string {
  const ingredients = item.recipe.ingredients
    .map((i) => `Ingredient(${luaString(i.prefab)}, ${i.amount})`)
    .join(', ')

  const icon = itemRecipeIcon(item)
  const configLines = [
    ...(icon.atlas ? [`        atlas = ${luaString(icon.atlas)},`] : []),
    `        image = ${luaString(icon.image)},`,
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

  const icon = structureRecipeIcon(structure, product)
  const configLines = [
    ...(icon.atlas ? [`        atlas = ${luaString(icon.atlas)},`] : []),
    `        image = ${luaString(icon.image)},`,
    ...(deployableItem ? [] : [`        placer = ${luaString(`${structure.id}_placer`)},`]),
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
  if (structure.restStation) {
    lines.push(`GLOBAL.TUNING.${upper}_HEALTH_PER_TICK = ${structure.restStation.healthPerTick}`)
    lines.push(`GLOBAL.TUNING.${upper}_HUNGER_PER_TICK = ${structure.restStation.hungerPerTick}`)
    lines.push(`GLOBAL.TUNING.${upper}_SANITY_PER_TICK = ${structure.restStation.sanityPerTick}`)
    if (structure.restStation.maxUses !== undefined) {
      lines.push(`GLOBAL.TUNING.${upper}_USES = ${structure.restStation.maxUses}`)
    }
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

// Shared by items (thrown at a point) and creatures (fired around the
// creature itself) — both just need SPIKE_COUNT/RADIUS, and WALL_COUNT only
// when walls are actually part of the attack.
function groundAttackTuningLines(upper: string, config: GroundAttackConfig): string[] {
  const lines = [`GLOBAL.TUNING.${upper}_SPIKE_COUNT = ${config.spikeCount}`, `GLOBAL.TUNING.${upper}_RADIUS = ${config.radius}`]
  if (config.wallCount > 0) lines.push(`GLOBAL.TUNING.${upper}_WALL_COUNT = ${config.wallCount}`)
  return lines
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
    } else if (item.weapon.chainReturn) {
      const projUpper = toUpperSnake(chakramProjectileId(item))
      lines.push(`GLOBAL.TUNING.${upper}_RANGE = ${item.weapon.chainReturn.range}`)
      lines.push(`GLOBAL.TUNING.${projUpper}_DAMAGE = ${item.weapon.damage}`)
      lines.push(`GLOBAL.TUNING.${projUpper}_SPEED = ${item.weapon.chainReturn.speed}`)
      lines.push(`GLOBAL.TUNING.${projUpper}_RANGE = ${item.weapon.chainReturn.range}`)
      lines.push(`GLOBAL.TUNING.${projUpper}_MAX_CHAIN_HITS = ${item.weapon.chainReturn.maxChainHits}`)
      lines.push(`GLOBAL.TUNING.${projUpper}_SEARCH_RADIUS = ${item.weapon.chainReturn.searchRadius}`)
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
  if (item.solarLantern) {
    lines.push(`GLOBAL.TUNING.${upper}_MAX_FUEL = ${item.solarLantern.maxFuel}`)
    lines.push(`GLOBAL.TUNING.${upper}_DRAIN_RATE = ${item.solarLantern.drainPerSecond}`)
    lines.push(`GLOBAL.TUNING.${upper}_RECHARGE_RATE = ${item.solarLantern.rechargePerSecondInSunlight}`)
    lines.push(`GLOBAL.TUNING.${upper}_LIGHT_RADIUS = ${item.solarLantern.radius}`)
  }
  if (item.summonTotem) {
    lines.push(`GLOBAL.TUNING.${upper}_MAX_DURABILITY = ${item.summonTotem.maxDurability}`)
    lines.push(`GLOBAL.TUNING.${upper}_DRAIN_RATE = ${item.summonTotem.drainPerSecond}`)
    lines.push(`GLOBAL.TUNING.${upper}_RECHARGE_RATE = ${item.summonTotem.rechargePerSecondInSunlight}`)
  }
  if (item.solarBattery) {
    lines.push(`GLOBAL.TUNING.${upper}_MAX_CHARGE = ${item.solarBattery.maxCharge}`)
    lines.push(`GLOBAL.TUNING.${upper}_CHARGE_RATE = ${item.solarBattery.chargePerSecondInSunlight}`)
  }
  if (item.tameBomb) {
    const cloudUpper = toUpperSnake(`${item.id}_cloud`)
    lines.push(`GLOBAL.TUNING.${cloudUpper}_RADIUS = ${item.tameBomb.radius}`)
    lines.push(`GLOBAL.TUNING.${cloudUpper}_DURATION = ${item.tameBomb.cloudDurationSeconds}`)
    lines.push(`GLOBAL.TUNING.${cloudUpper}_TAME_DURATION = ${item.tameBomb.tameDurationSeconds}`)
  }
  if (item.smokeBomb) {
    const cloudUpper = toUpperSnake(`${item.id}_smoke`)
    lines.push(`GLOBAL.TUNING.${cloudUpper}_RADIUS = ${item.smokeBomb.radius}`)
    lines.push(`GLOBAL.TUNING.${cloudUpper}_DURATION = ${item.smokeBomb.cloudDurationSeconds}`)
  }
  if (item.groundAttack) {
    lines.push(...groundAttackTuningLines(upper, item.groundAttack))
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
  if (creature.heatAura !== undefined) {
    lines.push(`GLOBAL.TUNING.${upper}_HEATAURA = ${creature.heatAura}`)
  }
  if (creature.herd !== undefined) {
    lines.push(`GLOBAL.TUNING.${upper}HERD_MAX_SIZE = ${creature.herd.maxSize}`)
    lines.push(`GLOBAL.TUNING.${upper}HERD_GATHER_RANGE = ${creature.herd.gatherRange}`)
    lines.push(`GLOBAL.TUNING.${upper}HERD_SPAWN_MIN = TUNING.TOTAL_DAY_TIME * ${creature.herd.spawnIntervalDays.min}`)
    lines.push(`GLOBAL.TUNING.${upper}HERD_SPAWN_MAX = TUNING.TOTAL_DAY_TIME * ${creature.herd.spawnIntervalDays.max}`)
  }
  if (creature.groundAttack !== undefined) {
    lines.push(...groundAttackTuningLines(upper, creature.groundAttack))
    lines.push(`GLOBAL.TUNING.${upper}_GROUNDATTACK_COOLDOWN = ${creature.groundAttack.cooldownSeconds}`)
  }
  if (creature.squadAlert !== undefined) {
    lines.push(`GLOBAL.TUNING.${upper}_SQUADALERT_RANGE = ${creature.squadAlert.range}`)
  }
  if (creature.light !== undefined) {
    lines.push(`GLOBAL.TUNING.${upper}_LIGHT_RADIUS = ${creature.light.radius}`)
    lines.push(`GLOBAL.TUNING.${upper}_LIGHT_FALLOFF = ${creature.light.falloff}`)
    lines.push(`GLOBAL.TUNING.${upper}_LIGHT_INTENSITY = ${creature.light.intensity}`)
    lines.push(`GLOBAL.TUNING.${upper}_LIGHT_COLOUR_R = ${creature.light.colour.r / 255}`)
    lines.push(`GLOBAL.TUNING.${upper}_LIGHT_COLOUR_G = ${creature.light.colour.g / 255}`)
    lines.push(`GLOBAL.TUNING.${upper}_LIGHT_COLOUR_B = ${creature.light.colour.b / 255}`)
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
  const lines = [
    `GLOBAL.TUNING.${upper}_HEALTH = ${character.stats.health}`,
    `GLOBAL.TUNING.${upper}_HUNGER = ${character.stats.hunger}`,
    `GLOBAL.TUNING.${upper}_SANITY = ${character.stats.sanity}`,
  ]
  if (character.mana !== undefined) {
    lines.push(`GLOBAL.TUNING.${upper}_MANA_MAX = ${character.mana.max}`)
    if (character.mana.regenPerSecond !== undefined) {
      lines.push(`GLOBAL.TUNING.${upper}_MANA_REGEN = ${character.mana.regenPerSecond}`)
    }
  }
  if (character.backstab !== undefined) {
    lines.push(`GLOBAL.TUNING.${upper}_BACKSTAB_MULT = ${character.backstab.multiplier}`)
    lines.push(`GLOBAL.TUNING.${upper}_BACKSTAB_ARC = ${character.backstab.arcDegrees}`)
  }
  return lines
}

function needsContainerParams(project: ModProject): boolean {
  return (
    project.items.some((item) => item.container?.source === 'own') ||
    project.structures.some((structure) => structure.container?.source === 'own')
  )
}

// Adapted from TWO real published Workshop mods (see docs/dst-knowledge/
// patterns.md#20). `containers.params.<id>` — the slot grid, widget skin, and
// whether it auto-opens as a side panel — can only be set up from
// modmain.lua (the prefab script just calls WidgetSetup with this id). Shared
// by Item and Structure containers alike — takes the id + container config
// directly rather than a whole ItemDef.
function containerParamsBlock(id: string, container: Extract<Container, { source: 'own' }>): string[] {
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
    // GLOBAL. prefix confirmed necessary in-game: modmain.lua's sandboxed
    // environment doesn't expose Vector3 as a bare global (unlike a prefab
    // script's own require-loaded scope, where item.ts/structure.ts/creature.ts
    // already use it bare without issue) — same class of fix as the static
    // layout GLOBAL.LAYOUT_POSITION/GLOBAL.PLACE_MASK crash.
    lines.push('        pos = GLOBAL.Vector3(0, 0, 0),')
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
      lines.push(`table.insert(params.${id}.widget.slotpos, GLOBAL.Vector3(${x}, ${y}, 0))`)
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

function needsSpellbookEquippedAction(project: ModProject): boolean {
  return project.items.some((item) => item.spellbook !== undefined)
}

// Confirmed against the real componentactions.lua: the "spellbook" component
// only has a handler under INVENTORY (right-click the item directly while it
// sits in your bag/hand slot) — there is no EQUIPPED entry for it at all, so
// a handheld spellbook item's own action button (the one used while it's
// equipped, pointed at nothing/yourself) never offers "Use Spell Book" out of
// the box. AddComponentAction (same real, whitelisted API already used by
// combineActionBlock above) lets a mod register an ADDITIONAL handler without
// touching componentactions.lua itself — the game merges it with the base
// game's own component-to-action tables. Logic mirrors the real INVENTORY
// handler (componentactions.lua) exactly, just for the EQUIPPED signature
// (inst, doer, target, actions, right) — gated on target == doer (the same
// "self-targeted while equipped" convention real vanilla uses for
// mightydumbbell/channelcastable, i.e. the action button pressed with nothing
// else valid under the cursor) so it doesn't fight with the item's own
// ATTACK action when actually pointing at something else.
function spellbookEquippedActionBlock(): string[] {
  return [
    'local ACTIONS = GLOBAL.ACTIONS',
    '',
    'AddComponentAction("EQUIPPED", "spellbook", function(inst, doer, target, actions, right)',
    '    if target == doer then',
    '        if doer.HUD ~= nil and doer.HUD:GetCurrentOpenSpellBook() == inst then',
    '            table.insert(actions, ACTIONS.CLOSESPELLBOOK)',
    '        elseif inst.components.spellbook:CanBeUsedBy(doer) then',
    '            table.insert(actions, ACTIONS.USESPELLBOOK)',
    '        end',
    '    end',
    'end)',
  ]
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

function needsSolarBatteryAction(project: ModProject): boolean {
  return project.items.some((item) => item.solarBattery)
}

function solarBatteryActionBlock(): string[] {
  return [
    'local ACTIONS = GLOBAL.ACTIONS',
    'local ActionHandler = GLOBAL.ActionHandler',
    '',
    'local CHARGE_SOLAR_ACTION = AddAction("CHARGE_SOLAR", "Charge", function(act)',
    '    if act.invobject == nil then',
    '        return false',
    '    end',
    '    if act.target ~= nil and act.target.components.fueled ~= nil and act.target:HasTag("solarfueled") then',
    '        return act.invobject:DrainIntoTarget(act.target)',
    '    elseif act.doer ~= nil then',
    '        return act.invobject:DrainIntoMana(act.doer)',
    '    end',
    '    return false',
    'end)',
    'CHARGE_SOLAR_ACTION.mount_valid = true',
    '',
    'AddComponentAction("USEITEM", "inventoryitem", function(inst, doer, target, actions, right)',
    '    if right and inst:HasTag("solarprism") then',
    '        table.insert(actions, ACTIONS.CHARGE_SOLAR)',
    '    end',
    'end)',
    '',
    'AddStategraphActionHandler("wilson", ActionHandler(ACTIONS.CHARGE_SOLAR, "doshortaction"))',
    'AddStategraphActionHandler("wilson_client", ActionHandler(ACTIONS.CHARGE_SOLAR, "doshortaction"))',
  ]
}

function needsPortalAction(project: ModProject): boolean {
  return project.creatures.some((creature) => creature.mapPortal === true)
}

// Confirmed against the real game scripts (components/vaultorbteleporter.lua,
// ACTIONS.VAULTORBTELEPORT_MAP/STARTVAULTORBTELEPORT in scripts/actions.lua,
// prefabs/bufferedmapaction.lua — see docs/dst-knowledge/patterns.md#73):
// two actions, mirroring the real Vault Orb pair exactly. STARTSPELLPORTAL
// is a normal right-click action (wired via AddComponentAction("SCENE", ...)
// below, since the portal is a placed creature, not a carried item) that
// just calls StartMapAction — spawning the base game's own
// "bufferedmapaction" prefab is what makes PlayerController:PullUpMap open
// the map automatically, no UI code needed on our side. SPELLPORTAL_MAP is
// map_only = true, so it's only ever offered by the map screen itself once
// that bufferedmapaction is pending — it needs no componentaction/
// stategraph wiring of its own, unlike STARTSPELLPORTAL. Both use
// .instant = true (confirmed real field, same technique the hand-written
// dual_mount prototype used) to skip needing a stategraph state entirely.
// Registering a brand-new player action only works from modmain.lua, not
// from a prefab script — so, like combineActionBlock/solarBatteryActionBlock
// above, this is emitted once here, shared by every portal creature.
function portalActionBlock(): string[] {
  return [
    'local ACTIONS = GLOBAL.ACTIONS',
    '',
    'local START_SPELLPORTAL_ACTION = AddAction("STARTSPELLPORTAL", "Open Map", function(act)',
    '    if act.target ~= nil and act.target.components.spellportalteleporter ~= nil then',
    '        return act.target.components.spellportalteleporter:StartMapAction(act.doer)',
    '    end',
    '    return false',
    'end)',
    'START_SPELLPORTAL_ACTION.rmb = true',
    'START_SPELLPORTAL_ACTION.instant = true',
    '',
    'local SPELLPORTAL_MAP_ACTION = AddAction("SPELLPORTAL_MAP", "Teleport", function(act)',
    '    local act_pos = act:GetActionPoint()',
    '    if act_pos == nil then',
    '        return false',
    '    end',
    '',
    '    local x, y, z = act_pos:Get()',
    '    local target = act.target or act.invobject',
    '    if target == nil or target.components.spellportalteleporter == nil then',
    '        return false',
    '    end',
    '',
    '    return target.components.spellportalteleporter:Activate(act.doer, x, z)',
    'end)',
    'SPELLPORTAL_MAP_ACTION.rmb = true',
    'SPELLPORTAL_MAP_ACTION.instant = true',
    'SPELLPORTAL_MAP_ACTION.map_only = true',
    'SPELLPORTAL_MAP_ACTION.map_works_on_unexplored = false',
    'SPELLPORTAL_MAP_ACTION.closes_map = true',
    'SPELLPORTAL_MAP_ACTION.customarrivecheck = function() return true end',
    '',
    'AddComponentAction("SCENE", "spellportalteleporter", function(inst, doer, actions, right)',
    '    if right then',
    '        table.insert(actions, ACTIONS.STARTSPELLPORTAL)',
    '    end',
    'end)',
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

function needsSkinBuildOverride(character: CharacterDef): boolean {
  return character.animation?.source === 'vanilla'
}

// Reproduced in-game: a character with animation.source 'vanilla' correctly
// shows the reused build right after spawning (character.ts's common_postinit
// calls AnimState:SetBuild AFTER player_common.lua's own default SetBuild(name)
// — see patterns.md#60), but goes invisible ("sem visual") the moment the
// player actually joins the world. Root cause, confirmed against the real
// networking.lua (SpawnNewPlayerOnServerFromSim) and components/skinner.lua:
// spawning calls skinner:SetSkinName(skin_base) then skinner:SetSkinMode
// ("normal_skin"), which resolves the actual build via
// `self.skin_data[skintype] or default_build or self.inst.prefab` — skin_data
// stays empty (no "<id>_none" skin prefab exists for a modded character,
// unlike every vanilla character's own registered default skin), so it falls
// through to self.inst.prefab (e.g. "viana"), a build/asset that was never
// loaded, silently reverting the AnimState to nothing.
//
// A first fix attempt wrapped skinner:SetSkinMode itself to inject a default
// build, gated on `self.inst.prefab == id` checked right when
// AddComponentPostInit's callback fires — reported as still not working. Root
// cause, confirmed against the real mainfunctions.lua (SpawnPrefabFromSim):
// the ENTIRE prefab fn() (which is where AddComponent("skinner") runs, and
// with it any ComponentPostInit hook) executes BEFORE inst:SetPrefabName()
// ever runs — so inst.prefab could not yet be reliably "viana" at the moment
// this hook fired, silently disabling the whole check. Fix: don't gate the
// OUTER hook at all (it fires once per player regardless of character, same
// as it always would); defer the prefab check to INSIDE the callback itself.
// components/skinner.lua's own SetSkinMode always calls self.base_change_cb()
// (if set) as its very last step, regardless of whatever build it just
// computed, and only ever runs well after spawning is complete (long after
// inst.prefab is guaranteed set) — the same "self-correcting, run-after-
// every-change" approach already proven for the dual_mount mod's own
// seat-position fix, just applied to skin/build instead of position.
function characterSkinBuildOverrideBlock(character: CharacterDef): string[] {
  if (character.animation?.source !== 'vanilla') return []
  return [
    'AddComponentPostInit("skinner", function(self)',
    '    self.base_change_cb = function()',
    `        if self.inst.prefab == ${luaString(character.id)} then`,
    `            self.inst.AnimState:SetBuild(${luaString(character.animation.build)})`,
    '        end',
    '    end',
    'end)',
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

function capitalize(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1)
}

// Confirmed in a real published character mod's modmain.lua (see
// characterManaSchema for the full source breakdown): AddPlayerPostInit
// (filtered to this character's own prefab) declares a single net_int percent
// synced off the "manadelta" event the mana component pushes, and
// AddClassPostConstruct("widgets/statusdisplays", ...) injects a ManaBadge
// next to health/hunger/sanity, positioned relative to the real hunger
// badge's own field name (self.stomach — confirmed in widgets/statusdisplays.lua).
function characterManaHudBlock(character: CharacterDef): string[] {
  const id = character.id
  const capId = capitalize(id)
  const upper = toUpperSnake(id)
  const dirtyEvent = luaString(`${id}_manaisdirty`)
  return [
    `local function on${capId}ManaDirty(inst)`,
    `    if GLOBAL.ThePlayer and GLOBAL.ThePlayer.Update${capId}ManaBadge then`,
    `        GLOBAL.ThePlayer.Update${capId}ManaBadge()`,
    '    end',
    'end',
    '',
    `local function On${capId}ManaUpdate(inst)`,
    `    inst.${id}_mana_percent:set(math.floor(inst.components.mana:GetPercent() * 100))`,
    `    inst.mana_current:set(inst.components.mana.current)`,
    'end',
    '',
    `local function ${capId}PlayerPostInit(inst)`,
    `    if inst.prefab ~= ${luaString(id)} then`,
    '        return',
    '    end',
    '',
    `    inst.${id}_mana_percent = GLOBAL.net_int(inst.GUID, ${luaString(`${id}.manapercent`)}, ${dirtyEvent})`,
    // Reproduced in-game: item.ts's spellbook checkenabled (widgets/wheel.lua's
    // own real per-entry gate — greys out AND blocks clicking any spell the
    // caster can't afford) runs purely CLIENT-SIDE, where `.components.mana`
    // never exists (components are server-only — this custom "mana" component
    // has no dedicated _replica.lua of its own, unlike inventoryitem/container).
    // Checking `owner.components.mana` there always evaluated to "component is
    // nil, so let it through" and never actually blocked anything, regardless
    // of the real current amount — confirmed as the reason spells stayed
    // castable even at 0 mana. Fix: mirror the RAW current amount (not just
    // the rounded display percent above) into its own plain netvar, using a
    // name that isn't prefixed by this character's own id — item.ts has no
    // knowledge of which CharacterDef(s) exist in the project, so it needs one
    // predictable field name to check regardless of which mana character
    // ends up holding the item.
    `    inst.mana_current = GLOBAL.net_float(inst.GUID, "mana.current", "manacurrentdirty")`,
    '',
    '    if GLOBAL.TheWorld.ismastersim then',
    `        inst:ListenForEvent("manadelta", On${capId}ManaUpdate)`,
    `        On${capId}ManaUpdate(inst)`,
    '    end',
    '',
    '    if not GLOBAL.TheNet:IsDedicated() then',
    `        inst:ListenForEvent(${dirtyEvent}, on${capId}ManaDirty)`,
    '    end',
    'end',
    `AddPlayerPostInit(${capId}PlayerPostInit)`,
    '',
    `local function ${capId}StatusPostConstruct(self)`,
    `    if self.owner.prefab ~= ${luaString(id)} then`,
    '        return',
    '    end',
    '',
    `    self.${id}mana = self:AddChild(ManaBadge(self.owner${character.mana?.badgeTint !== undefined ? `, { ${character.mana.badgeTint.join(', ')} }` : ''}))`,
    '    local stomachpos = self.stomach:GetPosition()',
    `    self.${id}mana:SetPosition(stomachpos.x - 65, stomachpos.y, stomachpos.z)`,
    '',
    `    self.owner.Update${capId}ManaBadge = function()`,
    `        local percent = self.owner.${id}_mana_percent and (self.owner.${id}_mana_percent:value() / 100) or 0`,
    // Badge:SetPercent's 2nd arg isn't a renormalization factor — it only
    // feeds the displayed number (val * max), confirmed in widgets/badge.lua.
    `        self.${id}mana:SetPercent(percent, TUNING.${upper}_MANA_MAX)`,
    '    end',
    'end',
    `AddClassPostConstruct("widgets/statusdisplays", ${capId}StatusPostConstruct)`,
  ]
}

// modmain.lua is the only file with access to mod-registration functions
// (AddRecipe2, AddModCharacter, PrefabFiles, STRINGS, TUNING) — prefab scripts
// just read the TUNING/STRINGS values this file sets up.
export function generateModMain(project: ModProject): string {
  const prefabFiles: string[] = []
  for (const item of project.items) {
    prefabFiles.push(item.id)
    if (item.tameBomb) prefabFiles.push(`${item.id}_cloud`)
    if (item.smokeBomb) prefabFiles.push(`${item.id}_smoke`)
    // Reproduced in-game: the generated <id>_proj.lua file existed on disk
    // but the mod loader only ever parses files listed here — declaring it
    // in the item's own local `prefabs` array (item.ts) isn't enough by
    // itself, reproduced as "Can't find prefab solarchakram_proj" every time
    // something tried to reference it.
    if (item.weapon?.chainReturn !== undefined) prefabFiles.push(chakramProjectileId(item))
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

  // Confirmed against a real published character mod (e00dan/naruto-dont-
  // starve-together's modmain.lua): bigportraits/avatars belong in modmain.lua's
  // OWN top-level `Assets` table, not inside any prefab's local `assets` — see
  // characterPortraitAssets for why (the character-select screen never spawns
  // the prefab, so a per-prefab Asset() declaration loads too late).
  const modmainAssets = project.characters.flatMap(characterPortraitAssets)
  if (modmainAssets.length > 0) {
    sections.push('')
    sections.push('Assets = {')
    for (const line of modmainAssets) {
      sections.push(`    ${line},`)
    }
    sections.push('}')
  }

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

    const customIconItems = project.items.filter((item) => item.hasCustomIcon)
    if (customIconItems.length > 0) {
      sections.push('')
      // Confirmed in scripts/simutil.lua's GetInventoryItemAtlas: it checks
      // an explicit registry (populated ONLY via RegisterInventoryItemAtlas)
      // before falling back to the 4 shared vanilla inventoryimages*.xml
      // sheets — it never looks at a mod's own images/inventoryimages/<id>.xml
      // on its own. Without this, Asset("ATLAS"/"IMAGE", ...) above is enough
      // for the file to load without crashing, but the actual inventory-slot
      // icon widget still can't find it (reproduced in-game as repeated
      // "Could not find region '<id>.tex' from atlas 'images/inventoryimages4.xml'"
      // warnings, even though the recipe menu icon — which reads the atlas/
      // image config directly, not through GetInventoryItemAtlas — is fine).
      sections.push('-- Items: register custom inventory icon atlases (simutil.lua GetInventoryItemAtlas)')
      for (const item of customIconItems) {
        sections.push(
          `GLOBAL.RegisterInventoryItemAtlas("images/inventoryimages/${item.id}.xml", "${item.id}.tex")`,
        )
      }
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

  if (needsSolarBatteryAction(project)) {
    sections.push('')
    sections.push('-- Solar battery charge action (shared by every solar battery item)')
    sections.push(...solarBatteryActionBlock())
  }

  if (needsSpellbookEquippedAction(project)) {
    sections.push('')
    sections.push('-- Lets a handheld spellbook item open the spell wheel from its own equipped action button')
    sections.push(...spellbookEquippedActionBlock())
  }

  if (needsPortalAction(project)) {
    sections.push('')
    sections.push('-- Spell portal open-map + map-teleport actions (shared by every portal creature)')
    sections.push(...portalActionBlock())
  }

  if (needsContainerParams(project)) {
    sections.push('')
    sections.push('-- Container widgets')
    sections.push('local containers = require("containers")')
    sections.push('local params = containers.params')
    for (const item of project.items) {
      if (item.container?.source === 'own') {
        sections.push('')
        sections.push(...containerParamsBlock(item.id, item.container))
      }
    }
    for (const structure of project.structures) {
      if (structure.container?.source === 'own') {
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

  const charactersWithSkinBuildOverride = project.characters.filter(needsSkinBuildOverride)
  if (charactersWithSkinBuildOverride.length > 0) {
    sections.push('')
    sections.push('-- Keeps a reused-vanilla-build character visible after spawning (patterns.md#60)')
    for (const character of charactersWithSkinBuildOverride) {
      sections.push(...characterSkinBuildOverrideBlock(character))
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

  const charactersWithMana = project.characters.filter((character) => character.mana)
  if (charactersWithMana.length > 0) {
    sections.push('')
    sections.push('-- Mana HUD badges (docs/dst-knowledge/patterns.md#61)')
    sections.push('local ManaBadge = require("widgets/manabadge")')
    for (const character of charactersWithMana) {
      sections.push('')
      sections.push(...characterManaHudBlock(character))
    }
  }

  if (project.worldEvents.length > 0) {
    sections.push('')
    sections.push('-- World events')
    for (const event of project.worldEvents) {
      sections.push(...worldEventTuningBlock(event))
    }
    if (project.worldEvents.some((event) => isWorldScopedTrigger(event.trigger))) {
      sections.push('')
      sections.push(...pickRandomOnlinePlayerBlock())
    }
    for (const event of project.worldEvents) {
      sections.push('')
      sections.push(...generateWorldEventBlock(event))
    }
  }

  return sections.join('\n') + '\n'
}
