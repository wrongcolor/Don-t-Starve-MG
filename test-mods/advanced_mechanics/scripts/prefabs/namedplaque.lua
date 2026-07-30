local assets =
{
    Asset("ANIM", "anim/namedplaque.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("INV_IMAGE", "namedplaque"),
}

local function onnamed(inst, name)
    if inst.components.named ~= nil then
        inst.components.named:SetName(name)
    end
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("namedplaque")
    inst.AnimState:SetBuild("namedplaque")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("named")

    inst:AddComponent("writeable")
    inst.components.writeable:SetDefaultWriteable(false)
    inst.components.writeable:SetAutomaticDescriptionEnabled(false)
    inst.components.writeable:SetWriteableDistance(1)
    inst.components.writeable:SetOnWrittenFn(onnamed)

    return inst
end

return Prefab("namedplaque", fn, assets, prefabs)
