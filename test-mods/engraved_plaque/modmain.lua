local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "engravedplaque" }

-- Items: tuning + strings
STRINGS.NAMES.ENGRAVEDPLAQUE = "Engraved Plaque"
STRINGS.RECIPE_DESC.ENGRAVEDPLAQUE = "Blank, waiting for the right words."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.ENGRAVEDPLAQUE = "Blank, waiting for the right words."

-- Items: recipes
AddRecipe2("engravedplaque", { Ingredient("cutstone", 1), Ingredient("goldnugget", 1) }, TECH.NONE, {
        image = "cutstone.tex",
    }, { "DECOR" })
