local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "teleportgate", "teleportgate_placer" }

-- Structures: tuning + strings
STRINGS.NAMES.TELEPORTGATE = "Teleport Gate"
STRINGS.RECIPE_DESC.TELEPORTGATE = "Carved with symbols that seem to shift when you look away."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TELEPORTGATE = "Carved with symbols that seem to shift when you look away."

-- Structures: recipes
AddRecipe2("teleportgate", { Ingredient("purplegem", 2), Ingredient("boards", 4) }, TECH.MAGIC_TWO, {
        image = "wormhole.tex",
        placer = "teleportgate_placer",
    }, { "MAGIC", "STRUCTURES" })
