local assets =
{
    Asset("ANIM", "anim/beefalo_build.zip"),
}

local function ApplyBuildOverrides(inst, animstate)
    if animstate ~= inst.AnimState then
        animstate:AddOverrideBuild("beefalo_build")
    else
        animstate:SetBuild("beefalo_build")
    end
end

local function ClearBuildOverrides(inst, animstate)
    animstate:ClearOverrideBuild("beefalo_build")
end

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddSoundEmitter()
    inst.entity:AddDynamicShadow()
    inst.entity:AddNetwork()

    MakeCharacterPhysics(inst, 100, .5)

    inst.DynamicShadow:SetSize(5, 2)
    inst.Transform:SetSixFaced()

    inst.AnimState:SetBank("beefalo")
    inst.AnimState:SetBuild("beefalo_build")
    inst.AnimState:PlayAnimation("idle_loop", true)

    inst:AddTag("animal")
    inst:AddTag("largecreature")
    inst:AddTag("companion")

    inst.entity:SetPristine()

    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.TWINSTEED_WALKSPEED
    inst.components.locomotor.runspeed = TUNING.TWINSTEED_RUNSPEED

    inst:AddComponent("rideable")
    inst.components.rideable.canride = true

    inst:AddComponent("pillion")

    inst:SetStateGraph("SGtwinsteed")

    inst.ApplyBuildOverrides = ApplyBuildOverrides
    inst.ClearBuildOverrides = ClearBuildOverrides

    return inst
end

return Prefab("twinsteed", fn, assets)
