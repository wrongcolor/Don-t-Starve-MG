local assets =
{
    -- Build "researchlab" reaproveitado do jogo base, sem asset próprio necessário.
}

local function onhammered(inst)
    if inst.components.lootdropper ~= nil then
        inst.components.lootdropper:DropLoot()
    end
    inst:Remove()
end

local function trydayspawn(inst, src, phase)
    if phase ~= "day" or math.random() > TUNING.DEERCLOPSALARM_SPAWN_CHANCE then
        return
    end

    local x, y, z = inst.Transform:GetWorldPosition()
    local offset = FindWalkableOffset(Vector3(x, y, z), math.random() * TWOPI, TUNING.DEERCLOPSALARM_SPAWN_RANGE, 12, true, false)
    if offset == nil then
        return
    end

    local spawned = SpawnPrefab("deerclops")
    if spawned ~= nil then
        spawned.Transform:SetPosition(x + offset.x, y + offset.y, z + offset.z)
    end
end

local prefabs = { "deerclops" }

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeObstaclePhysics(inst, 0.5) -- ajuste o raio conforme o tamanho real da estrutura

    inst.AnimState:SetBank("researchlab")
    inst.AnimState:SetBuild("researchlab")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("structure")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")

    inst:AddComponent("lootdropper")

    inst:AddComponent("workable")
    inst.components.workable:SetWorkAction(ACTIONS.HAMMER)
    inst.components.workable:SetWorkLeft(4)
    inst.components.workable:SetOnFinishCallback(onhammered)

    inst:ListenForEvent("phasechanged", trydayspawn, TheWorld)

    return inst
end

return Prefab("deerclopsalarm", fn, assets, prefabs)
