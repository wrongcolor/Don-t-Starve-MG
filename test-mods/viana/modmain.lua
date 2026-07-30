local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "sunstaff", "suncodex", "emberwispspell", "solsticeblessingspell", "sunfedspell", "sunwispspell", "viana", "sunwisp" }

-- Items: tuning + strings
STRINGS.NAMES.SUNSTAFF = "Sun Staff"
STRINGS.RECIPE_DESC.SUNSTAFF = "A staff that channels whatever spells are bound in her Sun Codex."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNSTAFF = "A staff that channels whatever spells are bound in her Sun Codex."
STRINGS.NAMES.SUNCODEX = "Sun Codex"
STRINGS.RECIPE_DESC.SUNCODEX = "Holds up to 3 spells at once — whatever is bound here is what the Sun Staff can cast."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNCODEX = "Holds up to 3 spells at once — whatever is bound here is what the Sun Staff can cast."
STRINGS.NAMES.EMBERWISPSPELL = "Ember Wisp Spell"
STRINGS.RECIPE_DESC.EMBERWISPSPELL = "Bind this in the Sun Codex to let the Sun Staff summon a warm, floating ember of light."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.EMBERWISPSPELL = "Bind this in the Sun Codex to let the Sun Staff summon a warm, floating ember of light."
STRINGS.NAMES.SOLSTICEBLESSINGSPELL = "Solstice Blessing Spell"
STRINGS.RECIPE_DESC.SOLSTICEBLESSINGSPELL = "Bind this in the Sun Codex to let the Sun Staff mend her wounds with the sun's warmth."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLSTICEBLESSINGSPELL = "Bind this in the Sun Codex to let the Sun Staff mend her wounds with the sun's warmth."
STRINGS.NAMES.SUNFEDSPELL = "Sunfed Spell"
STRINGS.RECIPE_DESC.SUNFEDSPELL = "Bind this in the Sun Codex to let the Sun Staff feed her on sunlight alone."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNFEDSPELL = "Bind this in the Sun Codex to let the Sun Staff feed her on sunlight alone."
STRINGS.NAMES.SUNWISPSPELL = "Sun Wisp Spell"
STRINGS.RECIPE_DESC.SUNWISPSPELL = "Bind this in the Sun Codex to let the Sun Staff call a small fire spirit that stays glowing by her side."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNWISPSPELL = "Bind this in the Sun Codex to let the Sun Staff call a small fire spirit that stays glowing by her side."

-- Items: recipes
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

    self.vianamana = self:AddChild(ManaBadge(self.owner))
    local stomachpos = self.stomach:GetPosition()
    self.vianamana:SetPosition(stomachpos.x - 65, stomachpos.y, stomachpos.z)

    self.owner.UpdateVianaManaBadge = function()
        local percent = self.owner.viana_mana_percent and (self.owner.viana_mana_percent:value() / 100) or 0
        self.vianamana:SetPercent(percent, TUNING.VIANA_MANA_MAX)
    end
end
AddClassPostConstruct("widgets/statusdisplays", VianaStatusPostConstruct)
