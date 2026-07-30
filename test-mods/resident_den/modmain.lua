local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "residentden", "residentden_placer" }

-- Structures: tuning + strings
GLOBAL.TUNING.RESIDENTDEN_RESPAWN_DELAY = TUNING.TOTAL_DAY_TIME * 3
STRINGS.NAMES.RESIDENTDEN = "Resident Den"
STRINGS.RECIPE_DESC.RESIDENTDEN = "Someone lives here, and keeps watch."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.RESIDENTDEN = "Someone lives here, and keeps watch."

-- Structures: recipes
AddRecipe2("residentden", { Ingredient("boards", 4), Ingredient("cutstone", 2) }, TECH.NONE, {
        image = "pighouse.tex",
        placer = "residentden_placer",
    }, { "STRUCTURES" })
