local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "huntersknife", "huntersspade", "travelpack", "toolbelt" }

-- Items: tuning + strings
GLOBAL.TUNING.HUNTERSKNIFE_DAMAGE = 27
GLOBAL.TUNING.HUNTERSKNIFE_USES = 75
STRINGS.NAMES.HUNTERSKNIFE = "Hunter's Knife"
STRINGS.RECIPE_DESC.HUNTERSKNIFE = "A combinable knife."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.HUNTERSKNIFE = "A combinable knife."
GLOBAL.TUNING.HUNTERSSPADE_USES = 75
STRINGS.NAMES.HUNTERSSPADE = "Hunter's Spade"
STRINGS.RECIPE_DESC.HUNTERSSPADE = "A combinable digging tool."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.HUNTERSSPADE = "A combinable digging tool."
STRINGS.NAMES.TRAVELPACK = "Travel Pack"
STRINGS.RECIPE_DESC.TRAVELPACK = "A container reusing a vanilla widget."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TRAVELPACK = "A container reusing a vanilla widget."
STRINGS.NAMES.TOOLBELT = "Tool Belt"
STRINGS.RECIPE_DESC.TOOLBELT = "A container with a custom slot grid."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TOOLBELT = "A container with a custom slot grid."

-- Items: recipes
AddRecipe2("huntersknife", { Ingredient("flint", 2), Ingredient("twigs", 1) }, TECH.NONE, {
        atlas = "images/inventoryimages/huntersknife.xml",
        image = "huntersknife.tex",
    }, { "WEAPONS" })
AddRecipe2("huntersspade", { Ingredient("flint", 2), Ingredient("twigs", 1) }, TECH.NONE, {
        atlas = "images/inventoryimages/huntersspade.xml",
        image = "huntersspade.tex",
    }, { "TOOLS" })
AddRecipe2("travelpack", { Ingredient("silk", 4), Ingredient("rope", 2) }, TECH.NONE, {
        atlas = "images/inventoryimages/travelpack.xml",
        image = "travelpack.tex",
    }, { "CONTAINERS" })
AddRecipe2("toolbelt", { Ingredient("boards", 2), Ingredient("rope", 1) }, TECH.NONE, {
        atlas = "images/inventoryimages/toolbelt.xml",
        image = "toolbelt.tex",
    }, { "CONTAINERS" })

-- Combine action (shared by every combinable item)
local ACTIONS = GLOBAL.ACTIONS
local ActionHandler = GLOBAL.ActionHandler

local COMBINE_ITEM_ACTION = AddAction("COMBINE_ITEM", "Combine", function(act)
    if act.target ~= nil and act.invobject ~= nil and act.target.CombineWith ~= nil then
        return act.target:CombineWith(act.invobject)
    end
end)
COMBINE_ITEM_ACTION.mount_valid = true
COMBINE_ITEM_ACTION.encumbered_valid = true

AddComponentAction("USEITEM", "inventoryitem", function(inst, doer, target, actions, right)
    if right and target ~= nil and inst.prefab == target.prefab and inst ~= target
        and inst:HasTag("combinable_item") and target:HasTag("combinable_item") then
        table.insert(actions, ACTIONS.COMBINE_ITEM)
    end
end)

AddStategraphActionHandler("wilson", ActionHandler(ACTIONS.COMBINE_ITEM, "dolongaction"))
AddStategraphActionHandler("wilson_client", ActionHandler(ACTIONS.COMBINE_ITEM, "dolongaction"))

-- Container widgets
local containers = require("containers")
local params = containers.params

params.travelpack = GLOBAL.deepcopy(containers.params["krampus_sack"])
params.travelpack.issidewidget = true
params.travelpack.type = "travelpack"

containers.MAXITEMSLOTS = math.max(containers.MAXITEMSLOTS, #params.travelpack.widget.slotpos)

params.toolbelt = {
    widget = {
        slotpos = {},
        animbank = "ui_toolbelt",
        animbuild = "ui_toolbelt",
        pos = Vector3(0, 0, 0),
    },
}

table.insert(params.toolbelt.widget.slotpos, Vector3(-75, 37.5, 0))
table.insert(params.toolbelt.widget.slotpos, Vector3(0, 37.5, 0))
table.insert(params.toolbelt.widget.slotpos, Vector3(75, 37.5, 0))
table.insert(params.toolbelt.widget.slotpos, Vector3(-75, -37.5, 0))
table.insert(params.toolbelt.widget.slotpos, Vector3(0, -37.5, 0))
table.insert(params.toolbelt.widget.slotpos, Vector3(75, -37.5, 0))
params.toolbelt.issidewidget = false
params.toolbelt.type = "toolbelt"

containers.MAXITEMSLOTS = math.max(containers.MAXITEMSLOTS, #params.toolbelt.widget.slotpos)

function params.toolbelt.itemtestfn(container, item, slot)
    return item:HasTag("sharp")
end
