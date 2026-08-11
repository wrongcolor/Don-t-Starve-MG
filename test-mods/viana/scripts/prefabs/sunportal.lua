local assets =
{
    -- Build "teleporter_worm_build" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = { "bufferedmapaction" }

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddSoundEmitter()
    inst.entity:AddNetwork()

    MakeCharacterPhysics(inst, 50, .5)

    inst.AnimState:SetBank("teleporter_worm")
    inst.AnimState:SetBuild("teleporter_worm_build")
    inst.AnimState:PlayAnimation("idle_loop")

    inst:AddTag("animal")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.SUNPORTAL_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.SUNPORTAL_HEALTH)
    inst.components.health:SetInvincible(true)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.SUNPORTAL_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.SUNPORTAL_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst:AddComponent("spellportalteleporter")
    inst:DoTaskInTime(TUNING.SUNPORTAL_EXPIRE_SECONDS, function(inst)
        if inst.components.health == nil or not inst.components.health:IsDead() then
            inst:Remove()
        end
    end)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGsunportal")
    inst:SetBrain(require("brains/sunportalbrain"))

    return inst
end

return Prefab("sunportal", fn, assets, prefabs)
