local assets =
{
    -- Build "staffs" reaproveitado do jogo base, sem asset próprio necessário.
}

local function spell_reticuletargetfn()
    return Vector3(ThePlayer.entity:LocalToWorldSpace(5, 0.001, 0))
end

local function createlight(staff, target, pos)
    local light = SpawnPrefab("stafflight") -- reaproveita o prefab de luz do jogo base
    light.Transform:SetPosition(pos:Get())
    if staff.components.finiteuses ~= nil then
        staff.components.finiteuses:Use(1)
    end
    if staff.components.rechargeable ~= nil then
        staff.components.rechargeable:Discharge(TUNING.EMBERROD_COOLDOWN)
    end
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("staffs")
    inst.AnimState:SetBuild("staffs")
    inst.AnimState:PlayAnimation("firestaff")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("rechargeable")
    inst.components.rechargeable:SetChargeTime(TUNING.EMBERROD_COOLDOWN)
    inst.components.inspectable.getstatus = function(inst)
        return (inst.components.rechargeable ~= nil and not inst.components.rechargeable:IsCharged()) and "RECHARGING" or nil
    end

    inst:AddComponent("reticule")
    inst.components.reticule.targetfn = spell_reticuletargetfn

    inst:AddComponent("spellcaster")
    inst.components.spellcaster:SetSpellFn(createlight)
    inst.components.spellcaster.canuseonpoint = true

    return inst
end

return Prefab("emberrod", fn, assets, prefabs)
