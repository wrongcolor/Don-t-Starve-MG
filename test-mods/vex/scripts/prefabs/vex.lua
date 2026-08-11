local MakePlayerCharacter = require("prefabs/player_common")

local assets =
{
    Asset("ANIM", "anim/vex.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("ANIM", "anim/ghost_vex_build.zip"), -- PLACEHOLDER: build do fantasma
    Asset("IMAGE", "bigportraits/vex.xml"), -- PLACEHOLDER: retrato real, ver README (também precisa estar em modmain.lua, ver characterPortraitAssets)
}

local prefabs = {}

local function common_postinit(inst)
    inst.MiniMapEntity:SetIcon("vex.tex") -- PLACEHOLDER: ícone do minimapa
end

local function master_postinit(inst)
    inst.starting_inventory = { "torch", "nightmarefuel" }

    inst.components.health:SetMaxHealth(TUNING.VEX_HEALTH)
    inst.components.hunger:SetMax(TUNING.VEX_HUNGER)
    inst.components.sanity:SetMax(TUNING.VEX_SANITY)

    inst:AddTag("fireimmune")
    if inst.components.playervision ~= nil then
        inst.components.playervision:ToggleNightVision(true)
    end

    inst.components.combat.damagemultiplier = 1.15
    inst.components.hunger.hungerrate = 1.25 * TUNING.WILSON_HUNGER_RATE
    inst.components.locomotor:SetExternalSpeedMultiplier(inst, "vex_speed_mod", 1.1)
    inst.components.foodaffinity:AddFoodtypeAffinity(FOODTYPE.ELEMENTAL, 1.5)
end

return MakePlayerCharacter("vex", prefabs, assets, common_postinit, master_postinit)
