local assets =
{
    Asset("ANIM", "anim/calmingcenser_cloud.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
}

local function TameNearbyHostiles(inst)
    if inst.owner == nil or not inst.owner:IsValid() then
        return
    end

    local x, y, z = inst.Transform:GetWorldPosition()
    local ents = TheSim:FindEntities(x, y, z, TUNING.CALMINGCENSER_CLOUD_RADIUS, { "hostile" })
    for _, ent in ipairs(ents) do
        if ent.components.follower == nil then
            ent:AddComponent("follower")
        end
        ent.components.follower:SetLeader(inst.owner)
        ent.components.follower:AddLoyaltyTime(TUNING.CALMINGCENSER_CLOUD_TAME_DURATION)
    end
end

local function SetOwner(inst, owner)
    inst.owner = owner
end

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    inst:AddTag("FX")
    inst:AddTag("NOCLICK")

    inst.AnimState:SetBank("calmingcenser_cloud")
    inst.AnimState:SetBuild("calmingcenser_cloud")
    inst.AnimState:PlayAnimation("idle", true)

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst.SetOwner = SetOwner
    inst.persists = false

    inst:DoPeriodicTask(1, TameNearbyHostiles)
    inst:DoTaskInTime(TUNING.CALMINGCENSER_CLOUD_DURATION, inst.Remove)

    return inst
end

return Prefab("calmingcenser_cloud", fn, assets)
