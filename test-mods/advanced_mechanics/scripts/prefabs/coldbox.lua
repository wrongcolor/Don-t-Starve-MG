local assets =
{
    Asset("ANIM", "anim/coldbox.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("INV_IMAGE", "coldbox"),
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("coldbox")
    inst.AnimState:SetBuild("coldbox")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("container")
    inst.components.container:WidgetSetup("coldbox")
    inst.components.inventoryitem:SetOnPutInInventoryFn(function(inst)
        inst.components.container:Close()
    end)

    inst:AddComponent("preserver")
    inst.components.preserver:SetPerishRateMultiplier(0.25)
    inst.components.preserver:SetTemperatureRateMultiplier(0.5)

    return inst
end

return Prefab("coldbox", fn, assets, prefabs)
