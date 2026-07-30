local prefabs = { "packwolf" }

local function CanSpawn(inst)
    return inst.components.herd ~= nil and not inst.components.herd:IsFull()
end

local function OnSpawned(inst, newent)
    if inst.components.herd ~= nil then
        inst.components.herd:AddMember(newent)
    end
end

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()

    inst:AddTag("herd")
    inst:AddTag("NOBLOCK")
    inst:AddTag("NOCLICK")

    inst:AddComponent("herd")
    inst.components.herd:SetMemberTag("packwolf")
    inst.components.herd:SetMaxSize(TUNING.PACKWOLFHERD_MAX_SIZE)
    inst.components.herd:SetGatherRange(TUNING.PACKWOLFHERD_GATHER_RANGE)
    inst.components.herd:SetUpdateRange(TUNING.PACKWOLFHERD_GATHER_RANGE)
    inst.components.herd:SetOnEmptyFn(inst.Remove)
    inst.components.herd.nomerging = true

    inst:AddComponent("periodicspawner")
    inst.components.periodicspawner:SetRandomTimes(TUNING.PACKWOLFHERD_SPAWN_MIN, TUNING.PACKWOLFHERD_SPAWN_MAX)
    inst.components.periodicspawner:SetPrefab("packwolf")
    inst.components.periodicspawner:SetOnSpawnFn(OnSpawned)
    inst.components.periodicspawner:SetSpawnTestFn(CanSpawn)
    inst.components.periodicspawner:SetOnlySpawnOffscreen(true)
    inst.components.periodicspawner:Start()

    return inst
end

return Prefab("packwolfherd", fn, nil, prefabs)
