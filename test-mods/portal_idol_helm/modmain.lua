local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "portalidolhelm" }

-- Items: tuning + strings
GLOBAL.TUNING.PORTALIDOLHELM_CONDITION = 300
GLOBAL.TUNING.PORTALIDOLHELM_ABSORPTION = 0.15
STRINGS.NAMES.PORTALIDOLHELM = "Portal Idol Helm"
STRINGS.RECIPE_DESC.PORTALIDOLHELM = "A helmet infused with moon magic. Give it to the Celestial Portal to choose a new survivor."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.PORTALIDOLHELM = "A helmet infused with moon magic. Give it to the Celestial Portal to choose a new survivor."

-- Items: recipes
AddRecipe2("portalidolhelm", { Ingredient("moonrocknugget", 4), Ingredient("thulecite", 1) }, TECH.CELESTIAL_ONE, {
        image = "hat_football.tex",
    }, { "ARMOUR", "MAGIC" })
