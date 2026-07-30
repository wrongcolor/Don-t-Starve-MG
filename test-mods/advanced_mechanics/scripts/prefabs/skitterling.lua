local assets =
{
    -- Build "pigman" reaproveitado do jogo base, sem asset próprio necessário.
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
    inst.AnimState:SetBuild("pigman")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("monster")
    inst:AddTag("hostile")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.SKITTERLING_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.SKITTERLING_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.SKITTERLING_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.SKITTERLING_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("silk", 1)

    -- "body" é o símbolo mais comum pro efeito de fogo — ajuste se o build usar outro nome.
    MakeMediumBurnableCharacter(inst, "body")

    inst:AddComponent("hauntable")

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGskitterling")
    inst:SetBrain(require("brains/skitterlingbrain"))

    return inst
end

return Prefab("skitterling", fn, assets, prefabs)
