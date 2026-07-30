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

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.TESTSPIDERMOB_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.TESTSPIDERMOB_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.TESTSPIDERMOB_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.TESTSPIDERMOB_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("silk", 1)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGtestspidermob")
    inst:SetBrain(require("brains/testspidermobbrain"))

    return inst
end

return Prefab("testspidermob", fn, assets, prefabs)
