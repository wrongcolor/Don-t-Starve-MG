local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "calmingcenser", "calmingcenser_cloud" }

-- Items: tuning + strings
GLOBAL.TUNING.CALMINGCENSER_USES = 3
GLOBAL.TUNING.CALMINGCENSER_CLOUD_RADIUS = 8
GLOBAL.TUNING.CALMINGCENSER_CLOUD_DURATION = 20
GLOBAL.TUNING.CALMINGCENSER_CLOUD_TAME_DURATION = 120
STRINGS.NAMES.CALMINGCENSER = "Calming Censer"
STRINGS.RECIPE_DESC.CALMINGCENSER = "A smoking censer that smells like safety."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.CALMINGCENSER = "A smoking censer that smells like safety."

-- Items: recipes
AddRecipe2("calmingcenser", { Ingredient("petals", 4), Ingredient("honey", 2) }, TECH.NONE, {
        image = "goldnugget.tex",
    }, { "MAGIC" })
