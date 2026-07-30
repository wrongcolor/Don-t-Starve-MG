local assets =
{
    -- Build "treasurechest" reaproveitado do jogo base, sem asset próprio necessário.
}

local function ondeploy(inst, pt)
    local placed = SpawnPrefab("portablesupplycrate")
    if placed ~= nil then
        placed.Transform:SetPosition(pt:Get())
    end
    inst:Remove()
end

local prefabs = { "portablesupplycrate" }

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("treasurechest")
    inst.AnimState:SetBuild("treasurechest")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("deployable")
    inst.components.deployable.ondeploy = ondeploy

    return inst
end

return Prefab("portablesupplycrate_item", fn, assets, prefabs)
