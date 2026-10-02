local assets =
{
    Asset("ANIM", "anim/goldflower.zip"),
}

local prefabs = { "sunmoth" }

local function CanSpawnChild(inst)
    return (inst._child == nil or not inst._child:IsValid())
        and inst.components.health ~= nil and not inst.components.health:IsDead()
end

local function SpawnChild(inst)
    if not CanSpawnChild(inst) then
        return
    end
    local child = SpawnPrefab("sunmoth")
    if child ~= nil then
        local x, y, z = inst.Transform:GetWorldPosition()
        child.Transform:SetPosition(x, 0, z)
        child.persists = false
        inst._child = child
    end
end

local function TryReleaseChild(inst)
    if TheWorld.state.isday then
        return
    end
    if CanSpawnChild(inst) and inst.sg:HasStateTag("idle") then
        inst.sg:GoToState("release")
    end
end

local function OnHammered(inst)
    if inst.components.health ~= nil and not inst.components.health:IsDead() then
        inst.components.health:ForceKill()
    end
end

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddSoundEmitter()
    inst.entity:AddLight()
    inst.entity:AddNetwork()

    MakeObstaclePhysics(inst, .3)

    inst.AnimState:SetBank("goldflower")
    inst.AnimState:SetBuild("goldflower")
    inst.AnimState:PlayAnimation("grow")
    inst.AnimState:SetBloomEffectHandle("shaders/anim.ksh")
    inst.AnimState:SetLightOverride(0.5)

    inst.Light:SetRadius(TUNING.GOLDFLOWER_LIGHT_RADIUS)
    inst.Light:SetFalloff(TUNING.GOLDFLOWER_LIGHT_FALLOFF)
    inst.Light:SetIntensity(TUNING.GOLDFLOWER_LIGHT_INTENSITY)
    inst.Light:SetColour(TUNING.GOLDFLOWER_LIGHT_COLOUR_R, TUNING.GOLDFLOWER_LIGHT_COLOUR_G, TUNING.GOLDFLOWER_LIGHT_COLOUR_B)
    inst.Light:Enable(true)

    inst:AddTag("animal")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.GOLDFLOWER_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.GOLDFLOWER_HEALTH)
    inst.components.health:SetInvincible(true)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.GOLDFLOWER_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.GOLDFLOWER_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst.SpawnChild = SpawnChild
    inst:DoPeriodicTask(60, TryReleaseChild)

    inst:AddComponent("workable")
    inst.components.workable:SetWorkAction(ACTIONS.HAMMER)
    inst.components.workable:SetWorkLeft(3)
    inst.components.workable:SetOnFinishCallback(OnHammered)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGgoldflower")
    inst:SetBrain(require("brains/goldflowerbrain"))

    inst.OnLoad = function(inst)
        inst.sg:GoToState("idle")
    end

    return inst
end

return Prefab("goldflower", fn, assets, prefabs)
