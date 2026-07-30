local assets =
{
    -- Build "rocks" reaproveitado do jogo base, sem asset próprio necessário.
}

local function spell_reticuletargetfn()
    return Vector3(ThePlayer.entity:LocalToWorldSpace(5, 0.001, 0))
end

local function dogroundattack(pos)
    local SPIKE_SIZES = { "short", "med", "tall" }
    for i = 1, TUNING.SPIKEROD_SPIKE_COUNT do
        local offset = FindWalkableOffset(pos, math.random() * TWOPI, math.random() * TUNING.SPIKEROD_RADIUS, 4, true, false)
        if offset ~= nil then
            SpawnPrefab("sandspike_" .. SPIKE_SIZES[math.random(#SPIKE_SIZES)]).Transform:SetPosition(pos.x + offset.x, 0, pos.z + offset.z)
        end
    end
    for i = 1, TUNING.SPIKEROD_WALL_COUNT do
        local offset = FindWalkableOffset(pos, math.random() * TWOPI, math.random() * TUNING.SPIKEROD_RADIUS, 4, true, false)
        if offset ~= nil then
            SpawnPrefab("sandblock").Transform:SetPosition(pos.x + offset.x, 0, pos.z + offset.z)
        end
    end
end

local function throwgroundattack(staff, target, pos)
    dogroundattack(pos)
    if staff.components.finiteuses ~= nil then
        staff.components.finiteuses:Use(1)
    end
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("rocks")
    inst.AnimState:SetBuild("rocks")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("finiteuses")
    inst.components.finiteuses:SetMaxUses(TUNING.SPIKEROD_USES)
    inst.components.finiteuses:SetUses(TUNING.SPIKEROD_USES)
    inst.components.finiteuses:SetOnFinished(inst.Remove)

    inst:AddComponent("reticule")
    inst.components.reticule.targetfn = spell_reticuletargetfn

    inst:AddComponent("spellcaster")
    inst.components.spellcaster:SetSpellFn(throwgroundattack)
    inst.components.spellcaster.canuseonpoint = true

    return inst
end

return Prefab("spikerod", fn, assets, prefabs)
