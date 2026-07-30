local prefabs = { "meadowhopper" }

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
    inst.components.herd:SetMemberTag("meadowhopper")
    inst.components.herd:SetMaxSize(TUNING.MEADOWHOPPERHERD_MAX_SIZE)
    inst.components.herd:SetGatherRange(TUNING.MEADOWHOPPERHERD_GATHER_RANGE)
    inst.components.herd:SetUpdateRange(TUNING.MEADOWHOPPERHERD_GATHER_RANGE)
    inst.components.herd:SetOnEmptyFn(inst.Remove)
    inst.components.herd.nomerging = true

    inst:AddComponent("periodicspawner")
    inst.components.periodicspawner:SetRandomTimes(TUNING.MEADOWHOPPERHERD_SPAWN_MIN, TUNING.MEADOWHOPPERHERD_SPAWN_MAX)
    inst.components.periodicspawner:SetPrefab("meadowhopper")
    inst.components.periodicspawner:SetOnSpawnFn(OnSpawned)
    inst.components.periodicspawner:SetSpawnTestFn(CanSpawn)
    inst.components.periodicspawner:SetOnlySpawnOffscreen(true)
    inst.components.periodicspawner:Start()

    return inst
end

return Prefab("meadowhopperherd", fn, nil, prefabs)
