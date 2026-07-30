local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "spikerod" }

-- Items: tuning + strings
GLOBAL.TUNING.SPIKEROD_USES = 8
GLOBAL.TUNING.SPIKEROD_SPIKE_COUNT = 6
GLOBAL.TUNING.SPIKEROD_RADIUS = 5
GLOBAL.TUNING.SPIKEROD_WALL_COUNT = 3
STRINGS.NAMES.SPIKEROD = "Spike Rod"
STRINGS.RECIPE_DESC.SPIKEROD = "Slam it into the ground to erupt a ring of hardened sand spikes."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SPIKEROD = "Slam it into the ground to erupt a ring of hardened sand spikes."

-- Items: recipes
AddRecipe2("spikerod", { Ingredient("flint", 4), Ingredient("rocks", 4) }, TECH.NONE, {
        image = "rocks.tex",
    }, { "MAGIC" })
