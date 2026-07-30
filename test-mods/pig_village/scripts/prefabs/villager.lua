local assets =
{
    -- Build "wildbore_build" reaproveitado do mod "Island Adventures - Shipwrecked", sem asset próprio necessário.
}

local prefabs = {}

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
    inst.components.locomotor.walkspeed = TUNING.VILLAGER_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.VILLAGER_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.VILLAGER_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.VILLAGER_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("meat", 1)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGvillager")
    inst:SetBrain(require("brains/villagerbrain"))

    return inst
end

return Prefab("villager", fn, assets, prefabs)
