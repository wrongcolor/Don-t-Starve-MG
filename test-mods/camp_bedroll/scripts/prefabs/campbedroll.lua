local assets =
{
    -- Build "tent" reaproveitado do jogo base, sem asset próprio necessário.
}

local function onhammered(inst)
    if inst.components.lootdropper ~= nil then
        inst.components.lootdropper:DropLoot()
    end
    inst:Remove()
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeObstaclePhysics(inst, 0.5) -- ajuste o raio conforme o tamanho real da estrutura

    inst.AnimState:SetBank("tent")
    inst.AnimState:SetBuild("tent")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("structure")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("silk", 0.3)

    inst:AddComponent("workable")
    inst.components.workable:SetWorkAction(ACTIONS.HAMMER)
    inst.components.workable:SetWorkLeft(4)
    inst.components.workable:SetOnFinishCallback(onhammered)

    inst:AddComponent("sleepingbag")
    inst.components.sleepingbag:SetSleepPhase("night")
    inst.components.sleepingbag.health_tick = TUNING.CAMPBEDROLL_HEALTH_PER_TICK
    inst.components.sleepingbag.hunger_tick = TUNING.CAMPBEDROLL_HUNGER_PER_TICK
    inst.components.sleepingbag.sanity_tick = TUNING.CAMPBEDROLL_SANITY_PER_TICK

    inst:AddComponent("finiteuses")
    inst.components.finiteuses:SetMaxUses(TUNING.CAMPBEDROLL_USES)
    inst.components.finiteuses:SetUses(TUNING.CAMPBEDROLL_USES)
    inst.components.finiteuses:SetOnFinished(inst.Remove)

    return inst
end

return Prefab("campbedroll", fn, assets, prefabs)
