local assets =
{
    Asset("ANIM", "anim/travelpack.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("INV_IMAGE", "travelpack"),
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("travelpack")
    inst.AnimState:SetBuild("travelpack")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("container")
    inst.components.container:WidgetSetup("travelpack")
    inst.components.inventoryitem:SetOnPutInInventoryFn(function(inst)
        inst.components.container:Close()
    end)

    return inst
end

return Prefab("travelpack", fn, assets, prefabs)
