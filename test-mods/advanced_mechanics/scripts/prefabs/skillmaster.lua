local MakePlayerCharacter = require("prefabs/player_common")

local assets =
{
    Asset("ANIM", "anim/skillmaster.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("ANIM", "anim/ghost_skillmaster_build.zip"), -- PLACEHOLDER: build do fantasma
}

local prefabs = {}

local start_inv = { "torch" }

local function common_postinit(inst)
    inst.MiniMapEntity:SetIcon("skillmaster.tex") -- PLACEHOLDER: ícone do minimapa
end

local function master_postinit(inst)
    inst.components.health:SetMaxHealth(TUNING.SKILLMASTER_HEALTH)
    inst.components.hunger:SetMax(TUNING.SKILLMASTER_HUNGER)
    inst.components.sanity:SetMax(TUNING.SKILLMASTER_SANITY)
end

return MakePlayerCharacter("skillmaster", prefabs, assets, common_postinit, master_postinit, start_inv)
