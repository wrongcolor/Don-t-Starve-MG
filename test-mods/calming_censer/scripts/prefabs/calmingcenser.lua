local assets =
{
    -- Build "goldnugget" reaproveitado do jogo base, sem asset próprio necessário.
}

local function spell_reticuletargetfn()
    return Vector3(ThePlayer.entity:LocalToWorldSpace(5, 0.001, 0))
end

local function throwtamecloud(staff, target, pos)
    local cloud = SpawnPrefab("calmingcenser_cloud")
    cloud.Transform:SetPosition(pos:Get())
    cloud:SetOwner(staff.components.inventoryitem.owner)
    if staff.components.finiteuses ~= nil then
        staff.components.finiteuses:Use(1)
    end
end

local prefabs = { "calmingcenser_cloud" }

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("goldnugget")
    inst.AnimState:SetBuild("goldnugget")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("finiteuses")
    inst.components.finiteuses:SetMaxUses(TUNING.CALMINGCENSER_USES)
    inst.components.finiteuses:SetUses(TUNING.CALMINGCENSER_USES)
    inst.components.finiteuses:SetOnFinished(inst.Remove)

    inst:AddComponent("reticule")
    inst.components.reticule.targetfn = spell_reticuletargetfn

    inst:AddComponent("spellcaster")
    inst.components.spellcaster:SetSpellFn(throwtamecloud)
    inst.components.spellcaster.canuseonpoint = true

    return inst
end

return Prefab("calmingcenser", fn, assets, prefabs)
