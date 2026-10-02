local assets =
{
    -- Build "moonglass" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("moonglass")
    inst.AnimState:SetBuild("moonglass")
    inst.AnimState:PlayAnimation("f1")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")
    inst.components.inventoryitem.imagename = "moonglass"

    inst:AddComponent("stackable")
    inst.components.stackable.maxsize = TUNING.SUN_PILLAR_SHARD_STACK_SIZE

    return inst
end

return Prefab("sun_pillar_shard", fn, assets, prefabs)
