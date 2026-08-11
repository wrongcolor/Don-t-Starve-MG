local MakePlayerCharacter = require("prefabs/player_common")

local assets =
{
    -- Build "wendy" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

local function CustomCombatDamage(inst, target, weapon, multiplier, mount)
    if target:HasTag("shadowcreature") then
        return 1.5
    end
end

local function ShadowDamageTakenMultiplier(inst, attacker, weapon)
    return (attacker ~= nil and attacker:HasTag("shadowcreature")) and 1.5 or 1
end

local function OnSeasonChange(inst, season)
    local statbonus = (season == "summer" and 75) or (season == "winter" and -50) or 0

    local healthpercent = inst.components.health:GetPercent()
    inst.components.health:SetMaxHealth(TUNING.VIANA_HEALTH + statbonus)
    inst.components.health:SetPercent(healthpercent)

    local hungerpercent = inst.components.hunger:GetPercent()
    inst.components.hunger:SetMax(TUNING.VIANA_HUNGER + statbonus)
    inst.components.hunger:SetPercent(hungerpercent)

    local sanitypercent = inst.components.sanity:GetPercent()
    inst.components.sanity:SetMax(TUNING.VIANA_SANITY + statbonus)
    inst.components.sanity:SetPercent(sanitypercent)

    if season == "summer" then
        inst.components.locomotor:SetExternalSpeedMultiplier(inst, "viana_summer_speed", 1.15)
    else
        inst.components.locomotor:RemoveExternalSpeedMultiplier(inst, "viana_summer_speed")
    end
end

local function CustomSanityRateFn(inst)
    return TheWorld.state.isday and 1 or 0
end

local function OnPhaseChanged(inst, phase)
    if phase == "day" then
        inst.components.hunger:Pause()
        return
    end
    inst.components.hunger:Resume()
    inst.components.hunger:SetRate(phase == "night" and 2 * TUNING.WILSON_HUNGER_RATE or TUNING.WILSON_HUNGER_RATE)
end

local function OnMoistureDelta(inst)
    local percent = inst.components.moisture:GetMoisturePercent()
    if percent > 0 then
        inst.components.sanity.externalmodifiers:SetModifier(inst, -3 * percent, "hates_wet")
    else
        inst.components.sanity.externalmodifiers:RemoveModifier(inst, "hates_wet")
    end
end

local function OverheatIgniteTick(inst)
    local x, y, z = inst.Transform:GetWorldPosition()
    local ents = TheSim:FindEntities(x, y, z, 3, nil, { "INLIMBO", "player" })
    for _, v in ipairs(ents) do
        if v ~= inst and v.components.burnable ~= nil and math.random() < 0.15 then
            v.components.burnable:StartWildfire()
        end
    end
end

local function OverheatCrash(inst)
    inst._overheatcrashtask = nil
    inst.components.temperature:SetTemperature(5)
    if inst.components.health ~= nil then
        inst.components.health:DoDelta(-inst.components.health:GetMaxWithPenalty() * 0.5, true, "overheat_crash")
    end
    if inst.components.hunger ~= nil then
        inst.components.hunger:DoDelta(-inst.components.hunger.max * 0.5)
    end
    if inst.components.sanity ~= nil then
        inst.components.sanity:DoDelta(-inst.components.sanity.max * 0.5)
    end
end

local function SetOverheatActive(inst, active)
    inst._customoverheat = active or nil
    if active then
        inst.components.combat.externaldamagemultipliers:SetModifier(inst, 1.5, "overheat")
        inst.components.sanity.externalmodifiers:SetModifier(inst, -5, "overheat")
        inst.components.heater.heat = 65
        inst.Light:SetRadius(.6)
        inst.Light:SetFalloff(.8)
        inst.Light:SetIntensity(.8)
        inst.Light:SetColour(255 / 255, 140 / 255, 20 / 255)
        inst.Light:Enable(true)
        if inst._overheatignitetask == nil then
            inst._overheatignitetask = inst:DoPeriodicTask(2, OverheatIgniteTick, nil, inst)
        end
        inst.components.locomotor:SetExternalSpeedMultiplier(inst, "viana_overheat_speed", 1.15)
        inst.components.mana:SetRegenRate(TUNING.VIANA_MANA_REGEN + 10)
        inst.components.mana:SetMaxOverride(TUNING.VIANA_MANA_MAX * 2)
        if inst._overheatcrashtask == nil then
            inst._overheatcrashtask = inst:DoTaskInTime(30, OverheatCrash)
        end
    else
        inst.components.combat.externaldamagemultipliers:RemoveModifier(inst, "overheat")
        inst.components.sanity.externalmodifiers:RemoveModifier(inst, "overheat")
        inst.components.heater.heat = nil
        inst.Light:Enable(false)
        if inst._overheatignitetask ~= nil then
            inst._overheatignitetask:Cancel()
            inst._overheatignitetask = nil
        end
        inst.components.locomotor:RemoveExternalSpeedMultiplier(inst, "viana_overheat_speed")
        inst.components.mana:SetRegenRate(TUNING.VIANA_MANA_REGEN)
        inst.components.mana:ClearMaxOverride()
        if inst._overheatcrashtask ~= nil then
            inst._overheatcrashtask:Cancel()
            inst._overheatcrashtask = nil
        end
    end
end

local function OnOverheatTemperatureDelta(inst, data)
    SetOverheatActive(inst, data.new > 65)
end

local function common_postinit(inst)
    inst.MiniMapEntity:SetIcon("viana.tex") -- PLACEHOLDER: ícone do minimapa
    inst.AnimState:SetBuild("wendy") -- reaproveita o visual de "wendy" em vez do build próprio
end

local function master_postinit(inst)
    inst.starting_inventory = { "suncodex" }

    inst.components.health:SetMaxHealth(TUNING.VIANA_HEALTH)
    inst.components.hunger:SetMax(TUNING.VIANA_HUNGER)
    inst.components.sanity:SetMax(TUNING.VIANA_SANITY)

    inst:AddComponent("reader")

    inst.components.combat.damagemultiplier = 0.75

    inst.components.sanity.custom_rate_fn = CustomSanityRateFn
    inst.components.sanity.night_drain_mult = 2
    inst:ListenForEvent("phasechanged", function(src, phase) OnPhaseChanged(inst, phase) end, TheWorld)
    OnPhaseChanged(inst, TheWorld.state.phase)
    inst:ListenForEvent("moisturedelta", OnMoistureDelta)

    inst:AddComponent("mana")
    inst.components.mana:SetMax(TUNING.VIANA_MANA_MAX)
    inst.components.mana:SetRegenRate(TUNING.VIANA_MANA_REGEN)

    inst:AddComponent("heater")
    inst:ListenForEvent("temperaturedelta", OnOverheatTemperatureDelta)
    SetOverheatActive(inst, inst.components.temperature:GetCurrent() > 65)

    inst:WatchWorldState("season", OnSeasonChange)
    OnSeasonChange(inst, TheWorld.state.season)

    inst.components.combat.customdamagemultfn = CustomCombatDamage
    inst.components.combat:AddConditionExternalDamageTakenMultiplier(ShadowDamageTakenMultiplier)
end

return MakePlayerCharacter("viana", prefabs, assets, common_postinit, master_postinit)
