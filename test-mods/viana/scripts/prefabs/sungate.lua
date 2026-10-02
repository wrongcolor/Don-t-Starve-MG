local assets =
{
    Asset("ANIM", "anim/sungate.zip"),
}

local function Dismiss(inst)
    if inst._dismissed then
        return
    end
    inst._dismissed = true
    RemovePhysicsColliders(inst)
    inst.AnimState:PlayAnimation(inst._pstclip)
    inst:ListenForEvent("animover", inst.Remove)
    inst:DoTaskInTime(3, inst.Remove)
end

local function tallfn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddLight()
    inst.entity:AddNetwork()

    MakeObstaclePhysics(inst, .3)

    inst.AnimState:SetBank("sungate")
    inst.AnimState:SetBuild("sungate")
    inst.AnimState:PlayAnimation("post_pre")
    inst.AnimState:PushAnimation("post_idle", true)
    inst.AnimState:SetBloomEffectHandle("shaders/anim.ksh")
    inst.AnimState:SetLightOverride(0.5)

    inst.Light:SetRadius(1.2)
    inst.Light:SetIntensity(0.6)
    inst.Light:SetFalloff(0.8)
    inst.Light:SetColour(1, 0.82, 0.4)
    inst.Light:Enable(true)

    inst:AddTag("NOCLICK")
    inst:AddTag("notarget")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst.persists = false
    inst._pstclip = "post_pst"
    inst.Dismiss = Dismiss

    return inst
end

local function shortfn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeObstaclePhysics(inst, .3)

    inst.AnimState:SetBank("sungate")
    inst.AnimState:SetBuild("sungate")
    inst.AnimState:PlayAnimation("short_pre")
    inst.AnimState:PushAnimation("short_idle", true)
    inst.AnimState:SetBloomEffectHandle("shaders/anim.ksh")
    inst.AnimState:SetLightOverride(0.5)

    inst:AddTag("NOCLICK")
    inst:AddTag("notarget")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst.persists = false
    inst._pstclip = "short_pst"
    inst.Dismiss = Dismiss

    return inst
end

return Prefab("sungate_tall", tallfn, assets),
    Prefab("sungate_short", shortfn, assets)
