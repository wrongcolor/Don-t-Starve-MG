local assets =
{
    -- Build "hound" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddSoundEmitter()
    inst.entity:AddNetwork()

    MakeCharacterPhysics(inst, 50, .5)

    inst.AnimState:SetBank("hound")
    inst.AnimState:SetBuild("hound")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("monster")
    inst:AddTag("hostile")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.BOGLURKER_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.BOGLURKER_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.BOGLURKER_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.BOGLURKER_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("monstermeat", 1)

    inst:AddComponent("sanityaura")
    inst.components.sanityaura.aura = TUNING.BOGLURKER_SANITYAURA

    -- "body" é o símbolo mais comum pro efeito de fogo — ajuste se o build usar outro nome.
    MakeMediumBurnableCharacter(inst, "body")

    inst:AddComponent("hauntable")

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGboglurker")
    inst:SetBrain(require("brains/boglurkerbrain"))

    return inst
end

return Prefab("boglurker", fn, assets, prefabs)
