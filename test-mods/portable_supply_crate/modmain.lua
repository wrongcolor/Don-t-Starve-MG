local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "portablesupplycrate", "portablesupplycrate_item" }

-- Structures: tuning + strings
STRINGS.NAMES.PORTABLESUPPLYCRATE = "Portable Supply Crate"
STRINGS.NAMES.PORTABLESUPPLYCRATE_ITEM = "Portable Supply Crate"
STRINGS.RECIPE_DESC.PORTABLESUPPLYCRATE_ITEM = "Folds down small enough to carry."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.PORTABLESUPPLYCRATE = "Folds down small enough to carry."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.PORTABLESUPPLYCRATE_ITEM = "Folds down small enough to carry."

-- Structures: recipes
AddRecipe2("portablesupplycrate_item", { Ingredient("boards", 4), Ingredient("rope", 2) }, TECH.NONE, {
        image = "treasurechest.tex",
    }, { "STRUCTURES" })

-- Container widgets
local containers = require("containers")
local params = containers.params

params.portablesupplycrate = GLOBAL.deepcopy(containers.params["treasurechest"])
params.portablesupplycrate.issidewidget = false
params.portablesupplycrate.type = "portablesupplycrate"

containers.MAXITEMSLOTS = math.max(containers.MAXITEMSLOTS, #params.portablesupplycrate.widget.slotpos)
