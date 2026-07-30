local assets =
{
    -- Build "pig_house" reaproveitado do jogo base, sem asset próprio necessário.
    Asset("ANIM", "anim/ui_sawmill.zip"), -- PLACEHOLDER: art da UI do contêiner, ver README
}

local function onhammered(inst)
    if inst.components.lootdropper ~= nil then
        inst.components.lootdropper:DropLoot()
    end
    inst:Remove()
end

local prefabs = { "lumberjack" }

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeObstaclePhysics(inst, 0.5) -- ajuste o raio conforme o tamanho real da estrutura

    inst.AnimState:SetBank("pig_house")
    inst.AnimState:SetBuild("pig_house")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("structure")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("boards", 0.5)

    inst:AddComponent("workable")
    inst.components.workable:SetWorkAction(ACTIONS.HAMMER)
    inst.components.workable:SetWorkLeft(4)
    inst.components.workable:SetOnFinishCallback(onhammered)

    inst:AddComponent("container")
    inst.components.container:WidgetSetup("sawmill")

    inst:AddComponent("spawner")
    inst.components.spawner:Configure("lumberjack", TUNING.SAWMILL_RESPAWN_DELAY)

    return inst
end

return Prefab("sawmill", fn, assets, prefabs)
