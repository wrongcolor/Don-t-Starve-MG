local MakePlayerCharacter = require("prefabs/player_common")

local assets =
{
    -- Build "wendy" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

local start_inv = { "sunstaff", "suncodex" }

local function common_postinit(inst)
    inst.MiniMapEntity:SetIcon("viana.tex") -- PLACEHOLDER: ícone do minimapa
    inst.AnimState:SetBuild("wendy") -- reaproveita o visual de "wendy" em vez do build próprio
end

local function master_postinit(inst)
    inst.components.health:SetMaxHealth(TUNING.VIANA_HEALTH)
    inst.components.hunger:SetMax(TUNING.VIANA_HUNGER)
    inst.components.sanity:SetMax(TUNING.VIANA_SANITY)

    inst.components.combat.damagemultiplier = 0.75

    inst:AddComponent("mana")
    inst.components.mana:SetMax(TUNING.VIANA_MANA_MAX)
    inst.components.mana:SetRegenRate(TUNING.VIANA_MANA_REGEN)
end

return MakePlayerCharacter("viana", prefabs, assets, common_postinit, master_postinit, start_inv)
