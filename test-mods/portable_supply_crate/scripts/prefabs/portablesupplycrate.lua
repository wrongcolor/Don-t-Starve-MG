local assets =
{
    -- Build "treasurechest" reaproveitado do jogo base, sem asset próprio necessário.
}

local function onhammered(inst)
    local item = SpawnPrefab("portablesupplycrate_item")
    if item ~= nil then
        item.Transform:SetPosition(inst.Transform:GetWorldPosition())
    end
    inst:Remove()
end

local prefabs = { "portablesupplycrate_item" }

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeObstaclePhysics(inst, 0.5) -- ajuste o raio conforme o tamanho real da estrutura

    inst.AnimState:SetBank("treasurechest")
    inst.AnimState:SetBuild("treasurechest")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("structure")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("workable")
    inst.components.workable:SetWorkAction(ACTIONS.HAMMER)
    inst.components.workable:SetWorkLeft(4)
    inst.components.workable:SetOnFinishCallback(onhammered)

    inst:AddComponent("container")
    inst.components.container:WidgetSetup("portablesupplycrate")

    return inst
end

return Prefab("portablesupplycrate", fn, assets, prefabs)
