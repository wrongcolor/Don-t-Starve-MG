local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "emberrod" }

-- Items: tuning + strings
GLOBAL.TUNING.EMBERROD_COOLDOWN = 45
STRINGS.NAMES.EMBERROD = "Ember Rod"
STRINGS.RECIPE_DESC.EMBERROD = "Warm to the touch, even when it is not in use."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.EMBERROD = "Warm to the touch, even when it is not in use."

-- Items: recipes
AddRecipe2("emberrod", { Ingredient("twigs", 2), Ingredient("nightmarefuel", 2) }, TECH.MAGIC_TWO, {
        image = "staffs.tex",
    }, { "MAGIC" })
