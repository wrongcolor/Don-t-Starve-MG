local assets =
{
    -- Build "trinket_1" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("trinket_1")
    inst.AnimState:SetBuild("trinket_1")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")
    inst.components.inventoryitem.imagename = "trinket_1"

    return inst
end

return Prefab("testtrinket", fn, assets, prefabs)
