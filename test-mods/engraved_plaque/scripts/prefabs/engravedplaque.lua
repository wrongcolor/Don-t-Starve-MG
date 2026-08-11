local assets =
{
    -- Build "cutstone" reaproveitado do jogo base, sem asset próprio necessário.
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

    inst.AnimState:SetBank("cutstone")
    inst.AnimState:SetBuild("cutstone")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")
    inst.components.inventoryitem.imagename = "cutstone"

    inst:AddComponent("named")

    inst:AddComponent("writeable")
    inst.components.writeable:SetDefaultWriteable(false)
    inst.components.writeable:SetAutomaticDescriptionEnabled(false)
    inst.components.writeable:SetWriteableDistance(1)
    inst.components.writeable:SetOnWrittenFn(onnamed)

    return inst
end

return Prefab("engravedplaque", fn, assets, prefabs)
