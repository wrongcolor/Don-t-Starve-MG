local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "villagerhouse", "villagerhouse_placer", "sawmill", "sawmill_placer", "quarry", "quarry_placer", "farmhouse", "farmhouse_placer", "barracks", "barracks_placer", "villager", "lumberjack", "miner", "farmer", "guard" }

-- Structures: tuning + strings
GLOBAL.TUNING.VILLAGERHOUSE_RESPAWN_DELAY = TUNING.TOTAL_DAY_TIME * 3
STRINGS.NAMES.VILLAGERHOUSE = "Villager House"
STRINGS.RECIPE_DESC.VILLAGERHOUSE = "Small, tidy, and someone is always home."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.VILLAGERHOUSE = "Small, tidy, and someone is always home."
GLOBAL.TUNING.SAWMILL_RESPAWN_DELAY = TUNING.TOTAL_DAY_TIME * 3
STRINGS.NAMES.SAWMILL = "Sawmill"
STRINGS.RECIPE_DESC.SAWMILL = "Sawdust everywhere. Someone here loves their work."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SAWMILL = "Sawdust everywhere. Someone here loves their work."
GLOBAL.TUNING.QUARRY_RESPAWN_DELAY = TUNING.TOTAL_DAY_TIME * 3
STRINGS.NAMES.QUARRY = "Quarry"
STRINGS.RECIPE_DESC.QUARRY = "Dust in the air, and the steady sound of chipping stone."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.QUARRY = "Dust in the air, and the steady sound of chipping stone."
GLOBAL.TUNING.FARMHOUSE_RESPAWN_DELAY = TUNING.TOTAL_DAY_TIME * 3
STRINGS.NAMES.FARMHOUSE = "Farmhouse"
STRINGS.RECIPE_DESC.FARMHOUSE = "Rows of neat little plots, tended every morning."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.FARMHOUSE = "Rows of neat little plots, tended every morning."
GLOBAL.TUNING.BARRACKS_RESPAWN_DELAY = TUNING.TOTAL_DAY_TIME * 3
STRINGS.NAMES.BARRACKS = "Barracks"
STRINGS.RECIPE_DESC.BARRACKS = "Quiet during the day, but always someone ready to answer a call."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.BARRACKS = "Quiet during the day, but always someone ready to answer a call."

-- Structures: recipes
AddRecipe2("villagerhouse", { Ingredient("boards", 4), Ingredient("cutstone", 2) }, TECH.NONE, {
        image = "pig_house.tex",
        placer = "villagerhouse_placer",
    }, { "STRUCTURES" })
AddRecipe2("sawmill", { Ingredient("boards", 4), Ingredient("rope", 2) }, TECH.NONE, {
        image = "pig_house.tex",
        placer = "sawmill_placer",
    }, { "STRUCTURES" })
AddRecipe2("quarry", { Ingredient("cutstone", 4), Ingredient("rope", 2) }, TECH.NONE, {
        image = "pig_house.tex",
        placer = "quarry_placer",
    }, { "STRUCTURES" })
AddRecipe2("farmhouse", { Ingredient("boards", 3), Ingredient("seeds", 2) }, TECH.NONE, {
        image = "pig_house.tex",
        placer = "farmhouse_placer",
    }, { "STRUCTURES" })
AddRecipe2("barracks", { Ingredient("boards", 6), Ingredient("rope", 2) }, TECH.SCIENCE_ONE, {
        image = "pig_house.tex",
        placer = "barracks_placer",
    }, { "STRUCTURES" })

-- Container widgets
local containers = require("containers")
local params = containers.params

params.sawmill = {
    widget = {
        slotpos = {},
        animbank = "ui_sawmill",
        animbuild = "ui_sawmill",
        pos = Vector3(0, 0, 0),
    },
}

table.insert(params.sawmill.widget.slotpos, Vector3(-75, 37.5, 0))
table.insert(params.sawmill.widget.slotpos, Vector3(0, 37.5, 0))
table.insert(params.sawmill.widget.slotpos, Vector3(75, 37.5, 0))
table.insert(params.sawmill.widget.slotpos, Vector3(-75, -37.5, 0))
table.insert(params.sawmill.widget.slotpos, Vector3(0, -37.5, 0))
table.insert(params.sawmill.widget.slotpos, Vector3(75, -37.5, 0))
params.sawmill.issidewidget = false
params.sawmill.type = "sawmill"

containers.MAXITEMSLOTS = math.max(containers.MAXITEMSLOTS, #params.sawmill.widget.slotpos)

params.quarry = {
    widget = {
        slotpos = {},
        animbank = "ui_quarry",
        animbuild = "ui_quarry",
        pos = Vector3(0, 0, 0),
    },
}

table.insert(params.quarry.widget.slotpos, Vector3(-75, 37.5, 0))
table.insert(params.quarry.widget.slotpos, Vector3(0, 37.5, 0))
table.insert(params.quarry.widget.slotpos, Vector3(75, 37.5, 0))
table.insert(params.quarry.widget.slotpos, Vector3(-75, -37.5, 0))
table.insert(params.quarry.widget.slotpos, Vector3(0, -37.5, 0))
table.insert(params.quarry.widget.slotpos, Vector3(75, -37.5, 0))
params.quarry.issidewidget = false
params.quarry.type = "quarry"

containers.MAXITEMSLOTS = math.max(containers.MAXITEMSLOTS, #params.quarry.widget.slotpos)

params.farmhouse = {
    widget = {
        slotpos = {},
        animbank = "ui_farmhouse",
        animbuild = "ui_farmhouse",
        pos = Vector3(0, 0, 0),
    },
}

table.insert(params.farmhouse.widget.slotpos, Vector3(-75, 37.5, 0))
table.insert(params.farmhouse.widget.slotpos, Vector3(0, 37.5, 0))
table.insert(params.farmhouse.widget.slotpos, Vector3(75, 37.5, 0))
table.insert(params.farmhouse.widget.slotpos, Vector3(-75, -37.5, 0))
table.insert(params.farmhouse.widget.slotpos, Vector3(0, -37.5, 0))
table.insert(params.farmhouse.widget.slotpos, Vector3(75, -37.5, 0))
params.farmhouse.issidewidget = false
params.farmhouse.type = "farmhouse"

containers.MAXITEMSLOTS = math.max(containers.MAXITEMSLOTS, #params.farmhouse.widget.slotpos)

-- Creatures: tuning + strings
GLOBAL.TUNING.VILLAGER_HEALTH = 100
GLOBAL.TUNING.VILLAGER_DAMAGE = 20
GLOBAL.TUNING.VILLAGER_ATTACK_PERIOD = 2
GLOBAL.TUNING.VILLAGER_WALKSPEED = 3
STRINGS.NAMES.VILLAGER = "Villager"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.VILLAGER = "Keeps to himself, mostly."
GLOBAL.TUNING.LUMBERJACK_HEALTH = 100
GLOBAL.TUNING.LUMBERJACK_DAMAGE = 10
GLOBAL.TUNING.LUMBERJACK_ATTACK_PERIOD = 2
GLOBAL.TUNING.LUMBERJACK_WALKSPEED = 3
STRINGS.NAMES.LUMBERJACK = "Lumberjack"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.LUMBERJACK = "Never without an axe close at hand."
GLOBAL.TUNING.MINER_HEALTH = 100
GLOBAL.TUNING.MINER_DAMAGE = 10
GLOBAL.TUNING.MINER_ATTACK_PERIOD = 2
GLOBAL.TUNING.MINER_WALKSPEED = 3
STRINGS.NAMES.MINER = "Miner"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.MINER = "Comes home covered in rock dust, every single day."
GLOBAL.TUNING.FARMER_HEALTH = 100
GLOBAL.TUNING.FARMER_DAMAGE = 10
GLOBAL.TUNING.FARMER_ATTACK_PERIOD = 2
GLOBAL.TUNING.FARMER_WALKSPEED = 3
STRINGS.NAMES.FARMER = "Farmer"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.FARMER = "Knows this land better than he knows his own name."
GLOBAL.TUNING.GUARD_HEALTH = 150
GLOBAL.TUNING.GUARD_DAMAGE = 30
GLOBAL.TUNING.GUARD_ATTACK_PERIOD = 2
GLOBAL.TUNING.GUARD_WALKSPEED = 4
STRINGS.NAMES.GUARD = "Guard"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.GUARD = "Stands a little straighter than the rest of the village."
