local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "hideawayhut", "hideawayhut_placer" }

-- Structures: tuning + strings
STRINGS.NAMES.HIDEAWAYHUT = "Hideaway Hut"
STRINGS.RECIPE_DESC.HIDEAWAYHUT = "Looks small on the outside. Bigger on the inside."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.HIDEAWAYHUT = "Looks small on the outside. Bigger on the inside."

-- Structures: recipes
AddRecipe2("hideawayhut", { Ingredient("boards", 4), Ingredient("rope", 2), Ingredient("cutstone", 2) }, TECH.NONE, {
        image = "pig_house.tex",
        placer = "hideawayhut_placer",
    }, { "STRUCTURES" })
