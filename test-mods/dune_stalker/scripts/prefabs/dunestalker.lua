local assets =
{
    -- Build "spider" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

local function dogroundattack(pos)
    local SPIKE_SIZES = { "short", "med", "tall" }
    for i = 1, TUNING.DUNESTALKER_SPIKE_COUNT do
        local offset = FindWalkableOffset(pos, math.random() * TWOPI, math.random() * TUNING.DUNESTALKER_RADIUS, 4, true, false)
        if offset ~= nil then
            SpawnPrefab("sandspike_" .. SPIKE_SIZES[math.random(#SPIKE_SIZES)]).Transform:SetPosition(pos.x + offset.x, 0, pos.z + offset.z)
        end
    end
    for i = 1, TUNING.DUNESTALKER_WALL_COUNT do
        local offset = FindWalkableOffset(pos, math.random() * TWOPI, math.random() * TUNING.DUNESTALKER_RADIUS, 4, true, false)
        if offset ~= nil then
            SpawnPrefab("sandblock").Transform:SetPosition(pos.x + offset.x, 0, pos.z + offset.z)
        end
    end
end

local function TryGroundAttack(inst)
    if inst.components.combat:HasTarget() then
        local x, y, z = inst.Transform:GetWorldPosition()
        dogroundattack(Vector3(x, y, z))
    end
end

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddSoundEmitter()
    inst.entity:AddNetwork()

    MakeCharacterPhysics(inst, 50, .5)

    inst.AnimState:SetBank("spider")
    inst.AnimState:SetBuild("spider")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("monster")
    inst:AddTag("hostile")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.DUNESTALKER_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.DUNESTALKER_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.DUNESTALKER_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.DUNESTALKER_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)
    inst:DoPeriodicTask(TUNING.DUNESTALKER_GROUNDATTACK_COOLDOWN, TryGroundAttack)

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("flint", 1)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGdunestalker")
    inst:SetBrain(require("brains/dunestalkerbrain"))

    return inst
end

return Prefab("dunestalker", fn, assets, prefabs)
