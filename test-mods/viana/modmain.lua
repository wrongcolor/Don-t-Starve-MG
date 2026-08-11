local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "solarlantern", "suncodex", "emberwispspell", "solsticeblessingspell", "sunfedspell", "sunwispspell", "solargatespell", "solarbeamspell", "refractionspell", "solarnovaspell", "flashbangspell", "solarcagespell", "desintegrationspell", "solargloriesspell", "lightpillarspell", "suntotem", "solarprism", "solarchakram", "solarchakram_proj", "solarblade", "solararmor", "viana", "sunorb", "sunwisp", "lightpillar", "sunportal" }

Assets = {
    Asset("ATLAS", "bigportraits/viana.xml"),
    Asset("IMAGE", "bigportraits/viana.tex"),
    Asset("ATLAS", "images/avatars/avatar_viana.xml"),
}

-- Items: tuning + strings
GLOBAL.TUNING.SOLARLANTERN_MAX_FUEL = 100
GLOBAL.TUNING.SOLARLANTERN_DRAIN_RATE = 0.1
GLOBAL.TUNING.SOLARLANTERN_RECHARGE_RATE = 0.3
GLOBAL.TUNING.SOLARLANTERN_LIGHT_RADIUS = 4
STRINGS.NAMES.SOLARLANTERN = "Solar Lantern"
STRINGS.RECIPE_DESC.SOLARLANTERN = "A lantern that only drinks from the sun — no fuel item will ever refill it, only standing in daylight will."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARLANTERN = "A lantern that only drinks from the sun — no fuel item will ever refill it, only standing in daylight will."
GLOBAL.TUNING.SUNCODEX_DAMAGE = 0
STRINGS.NAMES.SUNCODEX = "Sun Codex"
STRINGS.RECIPE_DESC.SUNCODEX = "Holds up to 3 spells at once and channels whatever is bound inside — hold Alt and click to open it."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNCODEX = "Holds up to 3 spells at once and channels whatever is bound inside — hold Alt and click to open it."
STRINGS.NAMES.EMBERWISPSPELL = "Ember Wisp Spell"
STRINGS.RECIPE_DESC.EMBERWISPSPELL = "Bind this in the Sun Codex to summon a warm, floating ember of light where she aims."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.EMBERWISPSPELL = "Bind this in the Sun Codex to summon a warm, floating ember of light where she aims."
STRINGS.NAMES.SOLSTICEBLESSINGSPELL = "Solstice Blessing Spell"
STRINGS.RECIPE_DESC.SOLSTICEBLESSINGSPELL = "Bind this in the Sun Codex to mend her wounds with the sun's warmth."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLSTICEBLESSINGSPELL = "Bind this in the Sun Codex to mend her wounds with the sun's warmth."
STRINGS.NAMES.SUNFEDSPELL = "Sunfed Spell"
STRINGS.RECIPE_DESC.SUNFEDSPELL = "Bind this in the Sun Codex to feed her on sunlight alone."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNFEDSPELL = "Bind this in the Sun Codex to feed her on sunlight alone."
STRINGS.NAMES.SUNWISPSPELL = "Sun Wisp Spell"
STRINGS.RECIPE_DESC.SUNWISPSPELL = "Bind this in the Sun Codex to call a small fire spirit to where she aims — it stays glowing by her side afterward."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNWISPSPELL = "Bind this in the Sun Codex to call a small fire spirit to where she aims — it stays glowing by her side afterward."
STRINGS.NAMES.SOLARGATESPELL = "Solar Gate Spell"
STRINGS.RECIPE_DESC.SOLARGATESPELL = "Bind this in the Sun Codex to raise a rift of light where she aims — step into it later to open the map and step out anywhere already explored."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARGATESPELL = "Bind this in the Sun Codex to raise a rift of light where she aims — step into it later to open the map and step out anywhere already explored."
STRINGS.NAMES.SOLARBEAMSPELL = "Solar Beam Spell"
STRINGS.RECIPE_DESC.SOLARBEAMSPELL = "Bind this in the Sun Codex to channel a beam of sunlight in front of her, burning anything it sweeps over."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARBEAMSPELL = "Bind this in the Sun Codex to channel a beam of sunlight in front of her, burning anything it sweeps over."
STRINGS.NAMES.REFRACTIONSPELL = "Refraction Spell"
STRINGS.RECIPE_DESC.REFRACTIONSPELL = "Bind this in the Sun Codex to turn her and any nearby allies into shimmering mirages, immune to harm for a short while."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.REFRACTIONSPELL = "Bind this in the Sun Codex to turn her and any nearby allies into shimmering mirages, immune to harm for a short while."
STRINGS.NAMES.SOLARNOVASPELL = "Solar Nova Spell"
STRINGS.RECIPE_DESC.SOLARNOVASPELL = "Bind this in the Sun Codex to burst a flare of sunlight where she aims, burning and locking in place anything caught in the blast."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARNOVASPELL = "Bind this in the Sun Codex to burst a flare of sunlight where she aims, burning and locking in place anything caught in the blast."
STRINGS.NAMES.FLASHBANGSPELL = "Flashbang Spell"
STRINGS.RECIPE_DESC.FLASHBANGSPELL = "Bind this in the Sun Codex to release a blinding flash around her, stunning every creature nearby — players are unaffected."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.FLASHBANGSPELL = "Bind this in the Sun Codex to release a blinding flash around her, stunning every creature nearby — players are unaffected."
STRINGS.NAMES.SOLARCAGESPELL = "Solar Cage Spell"
STRINGS.RECIPE_DESC.SOLARCAGESPELL = "Bind this in the Sun Codex to ring an area with pillars of light where she aims, trapping any enemy caught inside until they burn out."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARCAGESPELL = "Bind this in the Sun Codex to ring an area with pillars of light where she aims, trapping any enemy caught inside until they burn out."
STRINGS.NAMES.DESINTEGRATIONSPELL = "Desintegration Spell"
STRINGS.RECIPE_DESC.DESINTEGRATIONSPELL = "Bind this in the Sun Codex to mark an area with a searing light — after a long, visible wind-up, anything still caught inside is obliterated."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.DESINTEGRATIONSPELL = "Bind this in the Sun Codex to mark an area with a searing light — after a long, visible wind-up, anything still caught inside is obliterated."
STRINGS.NAMES.SOLARGLORIESSPELL = "Solar Glories Spell"
STRINGS.RECIPE_DESC.SOLARGLORIESSPELL = "Bind this in the Sun Codex to call down a blade, armor, and her chakram from the sun itself, scattered in the light around her."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARGLORIESSPELL = "Bind this in the Sun Codex to call down a blade, armor, and her chakram from the sun itself, scattered in the light around her."
STRINGS.NAMES.LIGHTPILLARSPELL = "Light Pillar Spell"
STRINGS.RECIPE_DESC.LIGHTPILLARSPELL = "Bind this in the Sun Codex to raise a pillar of solar light where she aims — it stands its ground and burns any enemy that gets close."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.LIGHTPILLARSPELL = "Bind this in the Sun Codex to raise a pillar of solar light where she aims — it stands its ground and burns any enemy that gets close."
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
GLOBAL.TUNING.SOLARBLADE_DAMAGE = 80
GLOBAL.TUNING.SOLARBLADE_DAMAGE_VS_TAG_BONUS = 2
GLOBAL.TUNING.SOLARBLADE_PERISH_TIME = TUNING.TOTAL_DAY_TIME * 0.5
STRINGS.NAMES.SOLARBLADE = "Solar Blade"
STRINGS.RECIPE_DESC.SOLARBLADE = "A blade of solidified sunlight — cuts twice as deep into creatures of shadow. Fades back into light after a while, so make it count."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARBLADE = "A blade of solidified sunlight — cuts twice as deep into creatures of shadow. Fades back into light after a while, so make it count."
GLOBAL.TUNING.SOLARARMOR_CONDITION = 99999
GLOBAL.TUNING.SOLARARMOR_ABSORPTION = 0.9
GLOBAL.TUNING.SOLARARMOR_PERISH_TIME = TUNING.TOTAL_DAY_TIME * 0.5
STRINGS.NAMES.SOLARARMOR = "Solar Armor"
STRINGS.RECIPE_DESC.SOLARARMOR = "Plate woven from solidified sunlight — blocks 90% of incoming harm. Fades back into light after a while, so make it count."
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SOLARARMOR = "Plate woven from solidified sunlight — blocks 90% of incoming harm. Fades back into light after a while, so make it count."

-- Items: recipes
AddRecipe2("solarlantern", { Ingredient("twigs", 2), Ingredient("goldnugget", 2), Ingredient("nightmarefuel", 1) }, TECH.MAGIC_TWO, {
        image = "lantern.tex",
    }, { "MAGIC" })
AddRecipe2("suncodex", { Ingredient("twigs", 2), Ingredient("goldnugget", 3), Ingredient("nightmarefuel", 2), Ingredient("papyrus", 2) }, TECH.MAGIC_TWO, {
        atlas = "images/inventoryimages/suncodex.xml",
        image = "suncodex.tex",
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
AddRecipe2("solargatespell", { Ingredient("goldnugget", 3), Ingredient("nightmarefuel", 3) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("solarbeamspell", { Ingredient("goldnugget", 2), Ingredient("nightmarefuel", 2) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("refractionspell", { Ingredient("goldnugget", 2), Ingredient("nightmarefuel", 3) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("solarnovaspell", { Ingredient("goldnugget", 2), Ingredient("nightmarefuel", 2) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("flashbangspell", { Ingredient("goldnugget", 2), Ingredient("nightmarefuel", 3) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("solarcagespell", { Ingredient("goldnugget", 3), Ingredient("nightmarefuel", 3) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("desintegrationspell", { Ingredient("goldnugget", 4), Ingredient("nightmarefuel", 4) }, TECH.MAGIC_TWO, {
        image = "papyrus.tex",
    }, { "MAGIC" })
AddRecipe2("solargloriesspell", { Ingredient("goldnugget", 3), Ingredient("nightmarefuel", 3) }, TECH.MAGIC_TWO, {
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
AddRecipe2("solarblade", { Ingredient("goldnugget", 3), Ingredient("nightmarefuel", 3) }, TECH.MAGIC_TWO, {
        image = "nightmaresword.tex",
    }, { "WEAPONS" })
AddRecipe2("solararmor", { Ingredient("goldnugget", 3), Ingredient("nightmarefuel", 3) }, TECH.MAGIC_TWO, {
        image = "armor_marble.tex",
    }, { "ARMOUR" })

-- Items: register custom inventory icon atlases (simutil.lua GetInventoryItemAtlas)
GLOBAL.RegisterInventoryItemAtlas("images/inventoryimages/suncodex.xml", "suncodex.tex")

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

-- Lets a handheld spellbook item open the spell wheel from its own equipped action button
local ACTIONS = GLOBAL.ACTIONS

AddComponentAction("EQUIPPED", "spellbook", function(inst, doer, target, actions, right)
    if target == doer then
        if doer.HUD ~= nil and doer.HUD:GetCurrentOpenSpellBook() == inst then
            table.insert(actions, ACTIONS.CLOSESPELLBOOK)
        elseif inst.components.spellbook:CanBeUsedBy(doer) then
            table.insert(actions, ACTIONS.USESPELLBOOK)
        end
    end
end)

-- Alt+click opens a container-and-spellbook item instead of casting (patterns.md#74)
local ACTIONS = GLOBAL.ACTIONS
local TheInput = GLOBAL.TheInput
local KEY_ALT = GLOBAL.KEY_ALT

local OPENCODEX_ACTION = AddAction("OPENCODEX", "Open", function(act)
    local targ = act.invobject or act.target
    if targ ~= nil and targ.components.container ~= nil then
        targ.components.container:Open(act.doer)
        return true
    end
    return false
end)
OPENCODEX_ACTION.priority = 3
OPENCODEX_ACTION.instant = true

AddComponentAction("INVENTORY", "container", function(inst, doer, actions, right)
    if TheInput:IsKeyDown(KEY_ALT) then
        table.insert(actions, ACTIONS.OPENCODEX)
    end
end)

-- Spell portal open-map + map-teleport actions (shared by every portal creature)
local ACTIONS = GLOBAL.ACTIONS

local START_SPELLPORTAL_ACTION = AddAction("STARTSPELLPORTAL", "Open Map", function(act)
    if act.target ~= nil and act.target.components.spellportalteleporter ~= nil then
        return act.target.components.spellportalteleporter:StartMapAction(act.doer)
    end
    return false
end)
START_SPELLPORTAL_ACTION.rmb = true
START_SPELLPORTAL_ACTION.instant = true

local SPELLPORTAL_MAP_ACTION = AddAction("SPELLPORTAL_MAP", "Teleport", function(act)
    local act_pos = act:GetActionPoint()
    if act_pos == nil then
        return false
    end

    local x, y, z = act_pos:Get()
    local target = act.target or act.invobject
    if target == nil or target.components.spellportalteleporter == nil then
        return false
    end

    return target.components.spellportalteleporter:Activate(act.doer, x, z)
end)
SPELLPORTAL_MAP_ACTION.rmb = true
SPELLPORTAL_MAP_ACTION.instant = true
SPELLPORTAL_MAP_ACTION.map_only = true
SPELLPORTAL_MAP_ACTION.map_works_on_unexplored = false
SPELLPORTAL_MAP_ACTION.closes_map = true
SPELLPORTAL_MAP_ACTION.customarrivecheck = function() return true end

AddComponentAction("SCENE", "spellportalteleporter", function(inst, doer, actions, right)
    if right then
        table.insert(actions, ACTIONS.STARTSPELLPORTAL)
    end
end)

-- Container widgets
local containers = require("containers")
local params = containers.params

params.suncodex = GLOBAL.deepcopy(containers.params["treasurechest"])
params.suncodex.issidewidget = false
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
GLOBAL.TUNING.SUNPORTAL_HEALTH = 100
GLOBAL.TUNING.SUNPORTAL_DAMAGE = 0
GLOBAL.TUNING.SUNPORTAL_ATTACK_PERIOD = 2
GLOBAL.TUNING.SUNPORTAL_WALKSPEED = 0.1
STRINGS.NAMES.SUNPORTAL = "Solar Gate"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.SUNPORTAL = "A rift of light, rooted to the spot where it was raised. Right-click it to open the map and step through to anywhere already explored."

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

-- Keeps a reused-vanilla-build character visible after spawning (patterns.md#60)
AddComponentPostInit("skinner", function(self)
    self.base_change_cb = function()
        if self.inst.prefab == "viana" then
            self.inst.AnimState:SetBuild("wendy")
        end
    end
end)

-- Mana HUD badges (docs/dst-knowledge/patterns.md#61)
local ManaBadge = require("widgets/manabadge")

local function onVianaManaDirty(inst)
    if GLOBAL.ThePlayer and GLOBAL.ThePlayer.UpdateVianaManaBadge then
        GLOBAL.ThePlayer.UpdateVianaManaBadge()
    end
end

local function OnVianaManaUpdate(inst)
    inst.viana_mana_percent:set(math.floor(inst.components.mana:GetPercent() * 100))
    inst.mana_current:set(inst.components.mana.current)
end

local function VianaPlayerPostInit(inst)
    if inst.prefab ~= "viana" then
        return
    end

    inst.viana_mana_percent = GLOBAL.net_int(inst.GUID, "viana.manapercent", "viana_manaisdirty")
    inst.mana_current = GLOBAL.net_float(inst.GUID, "mana.current", "manacurrentdirty")

    if GLOBAL.TheWorld.ismastersim then
        inst:ListenForEvent("manadelta", OnVianaManaUpdate)
        OnVianaManaUpdate(inst)
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
