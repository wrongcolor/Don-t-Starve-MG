local assets =
{
    Asset("ANIM", "anim/simbolo_solar.zip"),
}

local prefabs = { "bufferedmapaction" }

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddSoundEmitter()
    inst.entity:AddLight()
    inst.entity:AddNetwork()

    MakeCharacterPhysics(inst, 50, .5)
    RemovePhysicsColliders(inst)

    inst.AnimState:SetBank("simbolo_solar")
    inst.AnimState:SetBuild("simbolo_solar")
    inst.AnimState:PlayAnimation("surgir")
    inst.AnimState:SetOrientation(ANIM_ORIENTATION.OnGround)
    inst.AnimState:SetLayer(LAYER_BACKGROUND)
    inst.AnimState:SetSortOrder(3)
    inst.AnimState:SetBloomEffectHandle("shaders/anim.ksh")
    inst.AnimState:SetLightOverride(1)

    inst.Light:SetRadius(TUNING.SUNPORTAL_LIGHT_RADIUS)
    inst.Light:SetFalloff(TUNING.SUNPORTAL_LIGHT_FALLOFF)
    inst.Light:SetIntensity(TUNING.SUNPORTAL_LIGHT_INTENSITY)
    inst.Light:SetColour(TUNING.SUNPORTAL_LIGHT_COLOUR_R, TUNING.SUNPORTAL_LIGHT_COLOUR_G, TUNING.SUNPORTAL_LIGHT_COLOUR_B)
    inst.Light:Enable(true)

    inst:AddTag("animal")
    inst:AddTag("spellportal")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.SUNPORTAL_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.SUNPORTAL_HEALTH)
    inst.components.health:SetInvincible(true)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.SUNPORTAL_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.SUNPORTAL_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst:AddComponent("spellportalteleporter")
    inst:DoTaskInTime(TUNING.SUNPORTAL_EXPIRE_SECONDS, function(inst)
        if inst.components.health == nil or not inst.components.health:IsDead() then
            inst.sg:GoToState("vanish")
        end
    end)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGsunportal")
    inst:SetBrain(require("brains/sunportalbrain"))

    inst.OnLoad = function(inst)
        inst.sg:GoToState("idle")
    end

    return inst
end

return Prefab("sunportal", fn, assets, prefabs)
