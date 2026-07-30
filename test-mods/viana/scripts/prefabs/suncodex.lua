local assets =
{
    -- Build "books" reaproveitado do jogo base, sem asset próprio necessário.
    Asset("ANIM", "anim/ui_suncodex.zip"), -- PLACEHOLDER: art da UI do contêiner, ver README
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("books")
    inst.AnimState:SetBuild("books")
    inst.AnimState:PlayAnimation("book_light")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("container")
    inst.components.container:WidgetSetup("suncodex")
    inst.components.inventoryitem:SetOnPutInInventoryFn(function(inst)
        inst.components.container:Close()
    end)

    return inst
end

return Prefab("suncodex", fn, assets, prefabs)
