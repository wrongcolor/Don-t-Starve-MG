local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "campbedroll", "campbedroll_placer" }

-- Structures: tuning + strings
GLOBAL.TUNING.CAMPBEDROLL_HEALTH_PER_TICK = 2
GLOBAL.TUNING.CAMPBEDROLL_HUNGER_PER_TICK = -1
GLOBAL.TUNING.CAMPBEDROLL_SANITY_PER_TICK = 3
GLOBAL.TUNING.CAMPBEDROLL_USES = 5
STRINGS.NAMES.CAMPBEDROLL = "Camp Bedroll"
STRINGS.RECIPE_DESC.CAMPBEDROLL = "A worn-in bedroll. Better than the cold ground."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.CAMPBEDROLL = "A worn-in bedroll. Better than the cold ground."

-- Structures: recipes
AddRecipe2("campbedroll", { Ingredient("silk", 6), Ingredient("twigs", 4) }, TECH.NONE, {
        image = "tent.tex",
        placer = "campbedroll_placer",
    }, { "STRUCTURES" })
