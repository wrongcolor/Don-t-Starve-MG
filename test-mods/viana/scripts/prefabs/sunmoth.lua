local assets =
{
    Asset("ANIM", "anim/sunmoth_cauda.zip"),
}

local prefabs = {}

local function OnIsDay(inst, isday)
    if not isday then
        return
    end
    inst:DoTaskInTime(math.random() * 5, function(inst)
        if inst:IsValid() and not (inst.components.health ~= nil and inst.components.health:IsDead()) then
            inst.sg:GoToState("vanish")
        end
    end)
end

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddSoundEmitter()
    inst.entity:AddLight()
    inst.entity:AddNetwork()

    MakeFlyingCharacterPhysics(inst, 1, .5)

    inst.Transform:SetTwoFaced()
    inst.AnimState:SetBank("sunmoth_cauda")
    inst.AnimState:SetBuild("sunmoth_cauda")
    inst.AnimState:PlayAnimation("spawn")
    inst.AnimState:SetBloomEffectHandle("shaders/anim.ksh")
    inst.AnimState:SetLightOverride(0.6)

    inst.Light:SetRadius(TUNING.SUNMOTH_LIGHT_RADIUS)
    inst.Light:SetFalloff(TUNING.SUNMOTH_LIGHT_FALLOFF)
    inst.Light:SetIntensity(TUNING.SUNMOTH_LIGHT_INTENSITY)
    inst.Light:SetColour(TUNING.SUNMOTH_LIGHT_COLOUR_R, TUNING.SUNMOTH_LIGHT_COLOUR_G, TUNING.SUNMOTH_LIGHT_COLOUR_B)
    inst.Light:Enable(true)

    inst:AddTag("animal")
    inst:AddTag("flying")
    inst:AddTag("insect")
    inst:AddTag("smallcreature")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.SUNMOTH_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.SUNMOTH_HEALTH)
    inst.components.health:SetInvincible(true)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.SUNMOTH_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.SUNMOTH_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst:WatchWorldState("isday", OnIsDay)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGsunmoth")
    inst:SetBrain(require("brains/sunmothbrain"))

    inst.OnLoad = function(inst)
        inst.sg:GoToState("idle")
    end

    return inst
end

return Prefab("sunmoth", fn, assets, prefabs)
