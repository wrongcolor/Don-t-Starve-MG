local MakePlayerCharacter = require("prefabs/player_common")

local assets =
{
    -- Build "wilson" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

local start_inv = { "torch", "flint" }

local function common_postinit(inst)
    inst.MiniMapEntity:SetIcon("testchar.tex") -- PLACEHOLDER: ícone do minimapa
    inst.AnimState:SetBuild("wilson") -- reaproveita o visual de "wilson" em vez do build próprio
end

local function master_postinit(inst)
    inst.starting_inventory = { "torch", "flint" }

    inst.components.health:SetMaxHealth(TUNING.TESTCHAR_HEALTH)
    inst.components.hunger:SetMax(TUNING.TESTCHAR_HUNGER)
    inst.components.sanity:SetMax(TUNING.TESTCHAR_SANITY)

    inst:AddTag("freezeimmune")

    inst.components.combat.damagemultiplier = 0.75
    inst.components.hunger.hungerrate = 0 * TUNING.WILSON_HUNGER_RATE
    inst.components.locomotor:SetExternalSpeedMultiplier(inst, "testchar_speed_mod", 1.25)
    inst.components.foodaffinity:AddFoodtypeAffinity(FOODTYPE.VEGGIE, 1.33)
end

return MakePlayerCharacter("testchar", prefabs, assets, common_postinit, master_postinit)
