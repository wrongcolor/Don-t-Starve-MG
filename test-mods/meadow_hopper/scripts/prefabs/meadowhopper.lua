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

    inst:AddTag("animal")
    inst:AddTag("meadowhopper")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.MEADOWHOPPER_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.MEADOWHOPPER_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.MEADOWHOPPER_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.MEADOWHOPPER_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("poop", 1)

    inst:AddComponent("sanityaura")
    inst.components.sanityaura.aura = TUNING.MEADOWHOPPER_SANITYAURA

    -- "body" é o símbolo mais comum pro efeito de fogo — ajuste se o build usar outro nome.
    MakeMediumBurnableCharacter(inst, "body")

    inst:AddComponent("herdmember")
    inst.components.herdmember:SetHerdPrefab("meadowhopperherd")

    inst:AddComponent("inventory")

    inst:AddComponent("worker")
    inst.components.worker:SetAction(ACTIONS.CHOP, 1)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGmeadowhopper")
    inst:SetBrain(require("brains/meadowhopperbrain"))

    return inst
end

return Prefab("meadowhopper", fn, assets, prefabs)
