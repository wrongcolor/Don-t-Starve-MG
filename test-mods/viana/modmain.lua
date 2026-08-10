local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "solarlantern", "sunstaff", "suncodex", "emberwispspell", "solsticeblessingspell", "sunfedspell", "sunwispspell", "solarbeamspell", "solarnovaspell", "lightpillarspell", "suntotem", "solarprism", "solarchakram", "viana", "sunorb", "sunwisp", "lightpillar" }

-- Items: tuning + strings
GLOBAL.TUNING.SOLARLANTERN_MAX_FUEL = 100
GLOBAL.TUNING.SOLARLANTERN_DRAIN_RATE = 0.1
GLOBAL.TUNING.SOLARLANTERN_RECHARGE_RATE = 0.3
GLOBAL.TUNING.SOLARLANTERN_LIGHT_RADIUS = 4
STRINGS.NAMES.SOLARLANTERN = "Solar Lantern"
STRINGS.RECIPE_DESC.SOLARLANTERN = "A lantern that only drinks from the sun — no fuel item will ever refill it, only standing in daylight will."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARLANTERN = "A lantern that only drinks from the sun — no fuel item will ever refill it, only standing in daylight will."
STRINGS.NAMES.SUNSTAFF = "Sun Staff"
STRINGS.RECIPE_DESC.SUNSTAFF = "A staff that channels whatever spells are bound in her Sun Codex."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNSTAFF = "A staff that channels whatever spells are bound in her Sun Codex."
STRINGS.NAMES.SUNCODEX = "Sun Codex"
STRINGS.RECIPE_DESC.SUNCODEX = "Holds up to 3 spells at once — whatever is bound here is what the Sun Staff can cast."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNCODEX = "Holds up to 3 spells at once — whatever is bound here is what the Sun Staff can cast."
STRINGS.NAMES.EMBERWISPSPELL = "Ember Wisp Spell"
STRINGS.RECIPE_DESC.EMBERWISPSPELL = "Bind this in the Sun Codex to let the Sun Staff summon a warm, floating ember of light where she aims."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.EMBERWISPSPELL = "Bind this in the Sun Codex to let the Sun Staff summon a warm, floating ember of light where she aims."
STRINGS.NAMES.SOLSTICEBLESSINGSPELL = "Solstice Blessing Spell"
STRINGS.RECIPE_DESC.SOLSTICEBLESSINGSPELL = "Bind this in the Sun Codex to let the Sun Staff mend her wounds with the sun's warmth."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLSTICEBLESSINGSPELL = "Bind this in the Sun Codex to let the Sun Staff mend her wounds with the sun's warmth."
STRINGS.NAMES.SUNFEDSPELL = "Sunfed Spell"
STRINGS.RECIPE_DESC.SUNFEDSPELL = "Bind this in the Sun Codex to let the Sun Staff feed her on sunlight alone."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNFEDSPELL = "Bind this in the Sun Codex to let the Sun Staff feed her on sunlight alone."
STRINGS.NAMES.SUNWISPSPELL = "Sun Wisp Spell"
STRINGS.RECIPE_DESC.SUNWISPSPELL = "Bind this in the Sun Codex to let the Sun Staff call a small fire spirit to where she aims — it stays glowing by her side afterward."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNWISPSPELL = "Bind this in the Sun Codex to let the Sun Staff call a small fire spirit to where she aims — it stays glowing by her side afterward."
STRINGS.NAMES.SOLARBEAMSPELL = "Solar Beam Spell"
STRINGS.RECIPE_DESC.SOLARBEAMSPELL = "Bind this in the Sun Codex to let the Sun Staff channel a beam of sunlight in front of her, burning anything it sweeps over."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARBEAMSPELL = "Bind this in the Sun Codex to let the Sun Staff channel a beam of sunlight in front of her, burning anything it sweeps over."
STRINGS.NAMES.SOLARNOVASPELL = "Solar Nova Spell"
STRINGS.RECIPE_DESC.SOLARNOVASPELL = "Bind this in the Sun Codex to let the Sun Staff burst a flare of sunlight where she aims, burning and locking in place anything caught in the blast."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARNOVASPELL = "Bind this in the Sun Codex to let the Sun Staff burst a flare of sunlight where she aims, burning and locking in place anything caught in the blast."
STRINGS.NAMES.LIGHTPILLARSPELL = "Light Pillar Spell"
STRINGS.RECIPE_DESC.LIGHTPILLARSPELL = "Bind this in the Sun Codex to let the Sun Staff raise a pillar of solar light where she aims — it stands its ground and burns any enemy that gets close."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.LIGHTPILLARSPELL = "Bind this in the Sun Codex to let the Sun Staff raise a pillar of solar light where she aims — it stands its ground and burns any enemy that gets close."
GLOBAL.TUNING.SUNTOTEM_MAX_DURABILITY = 150
GLOBAL.TUNING.SUNTOTEM_DRAIN_RATE = 0.1
GLOBAL.TUNING.SUNTOTEM_RECHARGE_RATE = 0.3
STRINGS.NAMES.SUNTOTEM = "Sun Totem"
STRINGS.RECIPE_DESC.SUNTOTEM = "Carve this and it carves back: use it to call up a Sun Orb, or dismiss the one you have. It only drinks from the sun — no fuel item will ever refill it, and the Orb fades the moment it runs dry."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNTOTEM = "Carve this and it carves back: use it to call up a Sun Orb, or dismiss the one you have. It only drinks from the sun — no fuel item will ever refill it, and the Orb fades the moment it runs dry."
GLOBAL.TUNING.SOLARPRISM_MAX_CHARGE = 200
GLOBAL.TUNING.SOLARPRISM_CHARGE_RATE = 0.5
STRINGS.NAMES.SOLARPRISM = "Solar Prism"
STRINGS.RECIPE_DESC.SOLARPRISM = "Set it on the ground and activate it: under open sky by day, it drinks in sunlight. Use it on the Solar Lantern or Sun Totem to top off their charge, or use it on yourself to feed your own Solar Energy."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARPRISM = "Set it on the ground and activate it: under open sky by day, it drinks in sunlight. Use it on the Solar Lantern or Sun Totem to top off their charge, or use it on yourself to feed your own Solar Energy."
GLOBAL.TUNING.SOLARCHAKRAM_DAMAGE = 20
GLOBAL.TUNING.SOLARCHAKRAM_RANGE = 15
GLOBAL.TUNING.SOLARCHAKRAM_PROJ_DAMAGE = 20
GLOBAL.TUNING.SOLARCHAKRAM_PROJ_SPEED = 20
GLOBAL.TUNING.SOLARCHAKRAM_PROJ_RANGE = 15
GLOBAL.TUNING.SOLARCHAKRAM_PROJ_MAX_CHAIN_HITS = 5
GLOBAL.TUNING.SOLARCHAKRAM_PROJ_SEARCH_RADIUS = 8
STRINGS.NAMES.SOLARCHAKRAM = "Solar Chakram"
STRINGS.RECIPE_DESC.SOLARCHAKRAM = "Throw it and it bites five times over: on every hit it seeks out the next enemy nearby and leaps to it, up to 5 in a row, before spinning back into her hand."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARCHAKRAM = "Throw it and it bites five times over: on every hit it seeks out the next enemy nearby and leaps to it, up to 5 in a row, before spinning back into her hand."

-- Items: recipes
AddRecipe2("solarlantern", { Ingredient("twigs", 2), Ingredient("goldnugget", 2), Ingredient("nightmarefuel", 1) }, TECH.MAGIC_TWO, {
        image = "lantern.tex",
    }, { "MAGIC" })
AddRecipe2("sunstaff", { Ingredient("twigs", 2), Ingredient("goldnugget", 2), Ingredient("nightmarefuel", 2) }, TECH.MAGIC_TWO, {
        image = "staffs.tex",
    }, { "MAGIC" })
AddRecipe2("suncodex", { Ingredient("papyrus", 2), Ingredient("goldnugget", 1) }, TECH.MAGIC_TWO, {
        image = "books.tex",
    }, { "MAGIC" })
AddRecipe2("emberwispspell", { Ingredient("goldnugget", 1), Ingredient("nightmarefuel", 1) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("solsticeblessingspell", { Ingredient("petals", 2), Ingredient("goldnugget", 1) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("sunfedspell", { Ingredient("twigs", 1), Ingredient("goldnugget", 1) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("sunwispspell", { Ingredient("twigs", 1), Ingredient("goldnugget", 1), Ingredient("nightmarefuel", 2) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("solarbeamspell", { Ingredient("goldnugget", 2), Ingredient("nightmarefuel", 2) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("solarnovaspell", { Ingredient("goldnugget", 2), Ingredient("nightmarefuel", 2) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("lightpillarspell", { Ingredient("goldnugget", 2), Ingredient("nightmarefuel", 3) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("suntotem", { Ingredient("twigs", 3), Ingredient("goldnugget", 2), Ingredient("nightmarefuel", 2) }, TECH.MAGIC_TWO, {
        image = "moonrock_idol.tex",
    }, { "MAGIC" })
AddRecipe2("solarprism", { Ingredient("goldnugget", 3), Ingredient("nightmarefuel", 3) }, TECH.MAGIC_TWO, {
        image = "gems.tex",
    }, { "MAGIC" })
AddRecipe2("solarchakram", { Ingredient("goldnugget", 2), Ingredient("nightmarefuel", 3) }, TECH.MAGIC_TWO, {
        image = "boomerang.tex",
    }, { "MAGIC" })

-- Solar battery charge action (shared by every solar battery item)
local ACTIONS = GLOBAL.ACTIONS
local ActionHandler = GLOBAL.ActionHandler

local CHARGE_SOLAR_ACTION = AddAction("CHARGE_SOLAR", "Charge", function(act)
    if act.invobject == nil then
        return false
    end
    if act.target ~= nil and act.target.components.fueled ~= nil and act.target:HasTag("solarfueled") then
        return act.invobject:DrainIntoTarget(act.target)
    elseif act.doer ~= nil then
        return act.invobject:DrainIntoMana(act.doer)
    end
    return false
end)
CHARGE_SOLAR_ACTION.mount_valid = true

AddComponentAction("USEITEM", "inventoryitem", function(inst, doer, target, actions, right)
    if right and inst:HasTag("solarprism") then
        table.insert(actions, ACTIONS.CHARGE_SOLAR)
    end
end)

AddStategraphActionHandler("wilson", ActionHandler(ACTIONS.CHARGE_SOLAR, "doshortaction"))
AddStategraphActionHandler("wilson_client", ActionHandler(ACTIONS.CHARGE_SOLAR, "doshortaction"))

-- Container widgets
local containers = require("containers")
local params = containers.params

params.suncodex = {
    widget = {
        slotpos = {},
        animbank = "ui_suncodex",
        animbuild = "ui_suncodex",
        pos = Vector3(0, 0, 0),
    },
}

table.insert(params.suncodex.widget.slotpos, Vector3(-75, 0, 0))
table.insert(params.suncodex.widget.slotpos, Vector3(0, 0, 0))
table.insert(params.suncodex.widget.slotpos, Vector3(75, 0, 0))
params.suncodex.issidewidget = true
params.suncodex.type = "suncodex"

containers.MAXITEMSLOTS = math.max(containers.MAXITEMSLOTS, #params.suncodex.widget.slotpos)

function params.suncodex.itemtestfn(container, item, slot)
    return item:HasTag("spell")
end

-- Creatures: tuning + strings
GLOBAL.TUNING.SUNORB_HEALTH = 150
GLOBAL.TUNING.SUNORB_DAMAGE = 25
GLOBAL.TUNING.SUNORB_ATTACK_PERIOD = 2
GLOBAL.TUNING.SUNORB_WALKSPEED = 8
GLOBAL.TUNING.SUNORB_ATTACK_RANGE = 3
GLOBAL.TUNING.SUNORB_SANITYAURA = 10
GLOBAL.TUNING.SUNORB_HEATAURA = 40
GLOBAL.TUNING.SUNORB_LIGHT_RADIUS = 10
GLOBAL.TUNING.SUNORB_LIGHT_FALLOFF = 0.8
GLOBAL.TUNING.SUNORB_LIGHT_INTENSITY = 0.8
GLOBAL.TUNING.SUNORB_LIGHT_COLOUR_R = 1
GLOBAL.TUNING.SUNORB_LIGHT_COLOUR_G = 0.5490196078431373
GLOBAL.TUNING.SUNORB_LIGHT_COLOUR_B = 0.0784313725490196
STRINGS.NAMES.SUNORB = "Sun Orb"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNORB = "A living cinder of sunlight, orbiting whoever called it up — warm, bright, and quick to defend her."
GLOBAL.TUNING.SUNWISP_HEALTH = 15
GLOBAL.TUNING.SUNWISP_DAMAGE = 0
GLOBAL.TUNING.SUNWISP_ATTACK_PERIOD = 2
GLOBAL.TUNING.SUNWISP_WALKSPEED = 5
GLOBAL.TUNING.SUNWISP_LIGHT_RADIUS = 12
GLOBAL.TUNING.SUNWISP_LIGHT_FALLOFF = 0.8
GLOBAL.TUNING.SUNWISP_LIGHT_INTENSITY = 0.8
GLOBAL.TUNING.SUNWISP_LIGHT_COLOUR_R = 0.9803921568627451
GLOBAL.TUNING.SUNWISP_LIGHT_COLOUR_G = 0.5843137254901961
GLOBAL.TUNING.SUNWISP_LIGHT_COLOUR_B = 0.07058823529411765
STRINGS.NAMES.SUNWISP = "Sun Wisp"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNWISP = "A small fire spirit, warm and constant, that never strays far from her side."
GLOBAL.TUNING.LIGHTPILLAR_HEALTH = 200
GLOBAL.TUNING.LIGHTPILLAR_DAMAGE = 20
GLOBAL.TUNING.LIGHTPILLAR_ATTACK_PERIOD = 1.5
GLOBAL.TUNING.LIGHTPILLAR_WALKSPEED = 0.1
GLOBAL.TUNING.LIGHTPILLAR_LIGHT_RADIUS = 8
GLOBAL.TUNING.LIGHTPILLAR_LIGHT_FALLOFF = 0.8
GLOBAL.TUNING.LIGHTPILLAR_LIGHT_INTENSITY = 0.8
GLOBAL.TUNING.LIGHTPILLAR_LIGHT_COLOUR_R = 1
GLOBAL.TUNING.LIGHTPILLAR_LIGHT_COLOUR_G = 0.8627450980392157
GLOBAL.TUNING.LIGHTPILLAR_LIGHT_COLOUR_B = 0.5882352941176471
STRINGS.NAMES.LIGHTPILLAR = "Light Pillar"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.LIGHTPILLAR = "A column of solidified sunlight, rooted to the spot where it was raised — it burns anything that strays too close."

-- Characters: tuning + strings + registration
GLOBAL.TUNING.VIANA_HEALTH = 120
GLOBAL.TUNING.VIANA_HUNGER = 150
GLOBAL.TUNING.VIANA_SANITY = 220
GLOBAL.TUNING.VIANA_MANA_MAX = 100
GLOBAL.TUNING.VIANA_MANA_REGEN = 1
STRINGS.CHARACTER_TITLES.viana = "the Sunwitch"
STRINGS.CHARACTER_NAMES.viana = "Viana"
STRINGS.CHARACTER_DESCRIPTIONS.viana = "She traded a life under open skies for one spent bent over spellbooks — the sun still answers when she calls."
STRINGS.CHARACTER_QUOTES.viana = "The sun lends its light. I just ask for it."
STRINGS.CHARACTERS.VIANA = require("speech_viana")
AddModCharacter("viana", "FEMALE")

-- Mana HUD badges (docs/dst-knowledge/patterns.md#61)
local ManaBadge = require("widgets/manabadge")

local function onVianaManaDirty(inst)
    if GLOBAL.ThePlayer and GLOBAL.ThePlayer.UpdateVianaManaBadge then
        GLOBAL.ThePlayer.UpdateVianaManaBadge()
    end
end

local function OnVianaManaUpdate(inst)
    inst.viana_mana_percent:set(math.floor(inst.components.mana:GetPercent() * 100))
end

local function VianaPlayerPostInit(inst)
    if inst.prefab ~= "viana" then
        return
    end

    inst.viana_mana_percent = GLOBAL.net_int(inst.GUID, "viana.manapercent", "viana_manaisdirty")

    if GLOBAL.TheWorld.ismastersim then
        inst:ListenForEvent("manadelta", OnVianaManaUpdate)
    end

    if not GLOBAL.TheNet:IsDedicated() then
        inst:ListenForEvent("viana_manaisdirty", onVianaManaDirty)
    end
end
AddPlayerPostInit(VianaPlayerPostInit)

local function VianaStatusPostConstruct(self)
    if self.owner.prefab ~= "viana" then
        return
    end

    self.vianamana = self:AddChild(ManaBadge(self.owner, { 1, 0.75, 0.15, 1 }))
    local stomachpos = self.stomach:GetPosition()
    self.vianamana:SetPosition(stomachpos.x - 65, stomachpos.y, stomachpos.z)

    self.owner.UpdateVianaManaBadge = function()
        local percent = self.owner.viana_mana_percent and (self.owner.viana_mana_percent:value() / 100) or 0
        self.vianamana:SetPercent(percent, TUNING.VIANA_MANA_MAX)
    end
end
AddClassPostConstruct("widgets/statusdisplays", VianaStatusPostConstruct)
