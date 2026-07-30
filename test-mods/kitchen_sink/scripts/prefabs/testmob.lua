local assets =
{
    -- Build "spider" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

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
    inst:AddTag("largecreature")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.TESTMOB_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.TESTMOB_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.TESTMOB_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.TESTMOB_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("monstermeat", 1)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGtestmob")
    inst:SetBrain(require("brains/testmobbrain"))

    return inst
end

return Prefab("testmob", fn, assets, prefabs)
