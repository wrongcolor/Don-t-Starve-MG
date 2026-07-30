local assets =
{
    Asset("ANIM", "anim/toolbelt.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("ANIM", "anim/ui_toolbelt.zip"), -- PLACEHOLDER: art da UI do contêiner, ver README
    Asset("INV_IMAGE", "toolbelt"),
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("toolbelt")
    inst.AnimState:SetBuild("toolbelt")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("container")
    inst.components.container:WidgetSetup("toolbelt")
    inst.components.inventoryitem:SetOnPutInInventoryFn(function(inst)
        inst.components.container:Close()
    end)

    return inst
end

return Prefab("toolbelt", fn, assets, prefabs)
