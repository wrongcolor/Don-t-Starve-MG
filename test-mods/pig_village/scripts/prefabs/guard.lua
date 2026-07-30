local assets =
{
    -- Build "wildbore_build" reaproveitado do mod "Island Adventures - Shipwrecked", sem asset próprio necessário.
}

local prefabs = {}

local function TryDefendLeader(inst)
    local leader = FindClosestPlayerToInst(inst, 30, true)
    if leader ~= nil and inst.components.follower:GetLeader() ~= leader then
        inst.components.follower:SetLeader(leader)
    end
end

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddSoundEmitter()
    inst.entity:AddNetwork()

    MakeCharacterPhysics(inst, 50, .5)

    inst.AnimState:SetBank("pigman")
    inst.AnimState:SetBuild("wildbore_build")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("animal")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.GUARD_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.GUARD_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.GUARD_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.GUARD_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("meat", 1)

    inst:AddComponent("follower")
    inst:DoPeriodicTask(2, TryDefendLeader)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGguard")
    inst:SetBrain(require("brains/guardbrain"))

    return inst
end

return Prefab("guard", fn, assets, prefabs)
