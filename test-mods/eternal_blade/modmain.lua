local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "eternalblade" }

-- Items: tuning + strings
GLOBAL.TUNING.ETERNALBLADE_DAMAGE = 45
GLOBAL.TUNING.ETERNALBLADE_MELEE_RANGE = 3
STRINGS.NAMES.ETERNALBLADE = "Eternal Blade"
STRINGS.RECIPE_DESC.ETERNALBLADE = "A blade that never dulls."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.ETERNALBLADE = "A blade that never dulls."

-- Items: recipes
AddRecipe2("eternalblade", { Ingredient("goldnugget", 4), Ingredient("purplegem", 1) }, TECH.MAGIC_TWO, {
        atlas = "images/inventoryimages/eternalblade.xml",
        image = "eternalblade.tex",
    }, { "WEAPONS" })
