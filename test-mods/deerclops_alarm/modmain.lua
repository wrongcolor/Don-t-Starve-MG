local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "deerclopsalarm", "deerclopsalarm_placer" }

-- Structures: tuning + strings
GLOBAL.TUNING.DEERCLOPSALARM_SPAWN_CHANCE = 0.15
GLOBAL.TUNING.DEERCLOPSALARM_SPAWN_RANGE = 60
STRINGS.NAMES.DEERCLOPSALARM = "Deerclops Alarm"
STRINGS.RECIPE_DESC.DEERCLOPSALARM = "You probably shouldn't have built this."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.DEERCLOPSALARM = "You probably shouldn't have built this."

-- Structures: recipes
AddRecipe2("deerclopsalarm", { Ingredient("nightmarefuel", 4), Ingredient("houndstooth", 2) }, TECH.MAGIC_TWO, {
        image = "researchlab.tex",
        placer = "deerclopsalarm_placer",
    }, { "MAGIC" })
