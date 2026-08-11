local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "moonwand", "coldbox", "namedplaque", "sharpaxe", "wormholegate", "wormholegate_placer", "skillmaster", "skilltree_skillmaster", "packwolf", "packwolfherd", "skitterling" }

-- Items: tuning + strings
GLOBAL.TUNING.MOONWAND_DAMAGE = 0
GLOBAL.TUNING.MOONWAND_COOLDOWN = 45
STRINGS.NAMES.MOONWAND = "Moon Wand"
STRINGS.RECIPE_DESC.MOONWAND = "A rechargeable magic wand"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.MOONWAND = "A rechargeable magic wand"
STRINGS.NAMES.COLDBOX = "Cold Box"
STRINGS.RECIPE_DESC.COLDBOX = "A container that preserves food"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.COLDBOX = "A container that preserves food"
STRINGS.NAMES.NAMEDPLAQUE = "Named Plaque"
STRINGS.RECIPE_DESC.NAMEDPLAQUE = "A plaque the player can rename"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.NAMEDPLAQUE = "A plaque the player can rename"
GLOBAL.TUNING.SHARPAXE_USES = 50
STRINGS.NAMES.SHARPAXE = "Sharp Axe"
STRINGS.RECIPE_DESC.SHARPAXE = "A combinable tool that merges durability with a matching one"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SHARPAXE = "A combinable tool that merges durability with a matching one"

-- Items: recipes
AddRecipe2("moonwand", { Ingredient("moonrocknugget", 2) }, TECH.CELESTIAL_ONE, {
        atlas = "images/inventoryimages/moonwand.xml",
        image = "moonwand.tex",
    }, { "MAGIC" })
AddRecipe2("coldbox", { Ingredient("boards", 2), Ingredient("ice", 2) }, TECH.SCIENCE_TWO, {
        atlas = "images/inventoryimages/coldbox.xml",
        image = "coldbox.tex",
    }, { "CONTAINERS" })
AddRecipe2("namedplaque", { Ingredient("boards", 1) }, TECH.NONE, {
        atlas = "images/inventoryimages/namedplaque.xml",
        image = "namedplaque.tex",
    }, { "DECOR" })
AddRecipe2("sharpaxe", { Ingredient("twigs", 1), Ingredient("flint", 2) }, TECH.NONE, {
        atlas = "images/inventoryimages/sharpaxe.xml",
        image = "sharpaxe.tex",
    }, { "TOOLS" })

-- Structures: tuning + strings
STRINGS.NAMES.WORMHOLEGATE = "Wormhole Gate"
STRINGS.RECIPE_DESC.WORMHOLEGATE = "A structure that pairs up with another to teleport"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.WORMHOLEGATE = "A structure that pairs up with another to teleport"

-- Structures: recipes
AddRecipe2("wormholegate", { Ingredient("purplegem", 1), Ingredient("boards", 4) }, TECH.MAGIC_THREE, {
        atlas = "images/inventoryimages/wormholegate.xml",
        image = "wormholegate.tex",
        placer = "wormholegate_placer",
    }, { "MAGIC", "STRUCTURES" })

-- Combine action (shared by every combinable item)
local ACTIONS = GLOBAL.ACTIONS
local ActionHandler = GLOBAL.ActionHandler

local COMBINE_ITEM_ACTION = AddAction("COMBINE_ITEM", "Combine", function(act)
    if act.target ~= nil and act.invobject ~= nil and act.target.CombineWith ~= nil then
        return act.target:CombineWith(act.invobject)
    end
end)
COMBINE_ITEM_ACTION.mount_valid = true
COMBINE_ITEM_ACTION.encumbered_valid = true

AddComponentAction("USEITEM", "inventoryitem", function(inst, doer, target, actions, right)
    if right and target ~= nil and inst.prefab == target.prefab and inst ~= target
        and inst:HasTag("combinable_item") and target:HasTag("combinable_item") then
        table.insert(actions, ACTIONS.COMBINE_ITEM)
    end
end)

AddStategraphActionHandler("wilson", ActionHandler(ACTIONS.COMBINE_ITEM, "dolongaction"))
AddStategraphActionHandler("wilson_client", ActionHandler(ACTIONS.COMBINE_ITEM, "dolongaction"))

-- Creatures: tuning + strings
GLOBAL.TUNING.PACKWOLF_HEALTH = 150
GLOBAL.TUNING.PACKWOLF_DAMAGE = 25
GLOBAL.TUNING.PACKWOLF_ATTACK_PERIOD = 2
GLOBAL.TUNING.PACKWOLF_WALKSPEED = 5
GLOBAL.TUNING.PACKWOLFHERD_MAX_SIZE = 6
GLOBAL.TUNING.PACKWOLFHERD_GATHER_RANGE = 30
GLOBAL.TUNING.PACKWOLFHERD_SPAWN_MIN = TUNING.TOTAL_DAY_TIME * 2
GLOBAL.TUNING.PACKWOLFHERD_SPAWN_MAX = TUNING.TOTAL_DAY_TIME * 4
GLOBAL.TUNING.PACKWOLF_SQUADALERT_RANGE = 30
STRINGS.NAMES.PACKWOLF = "Pack Wolf"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.PACKWOLF = "A creature that forms herds and calls the pack in when attacked"
GLOBAL.TUNING.SKITTERLING_HEALTH = 80
GLOBAL.TUNING.SKITTERLING_DAMAGE = 15
GLOBAL.TUNING.SKITTERLING_ATTACK_PERIOD = 2
GLOBAL.TUNING.SKITTERLING_WALKSPEED = 6
STRINGS.NAMES.SKITTERLING = "Skitterling"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SKITTERLING = "A creature that kites and panics — covers patterns.md#46-51"

-- Characters: tuning + strings + registration
GLOBAL.TUNING.SKILLMASTER_HEALTH = 150
GLOBAL.TUNING.SKILLMASTER_HUNGER = 150
GLOBAL.TUNING.SKILLMASTER_SANITY = 200
STRINGS.CHARACTER_TITLES.skillmaster = "the adept"
STRINGS.CHARACTER_NAMES.skillmaster = "Adept"
STRINGS.CHARACTER_DESCRIPTIONS.skillmaster = "A character with a skill tree"
STRINGS.CHARACTER_QUOTES.skillmaster = "I have trained for this."
STRINGS.CHARACTERS.SKILLMASTER = require("speech_skillmaster")
AddModCharacter("skillmaster", "NEUTRAL")

-- Skill trees (docs/dst-knowledge/patterns.md#28)
local skilltree_defs = require("prefabs/skilltree_defs")
local skillmaster_skilltree_data = require("prefabs/skilltree_skillmaster")(skilltree_defs.FN)
skilltree_defs.CreateSkillTreeFor("skillmaster", skillmaster_skilltree_data.SKILLS)
skilltree_defs.SKILLTREE_ORDERS["skillmaster"] = skillmaster_skilltree_data.ORDERS
