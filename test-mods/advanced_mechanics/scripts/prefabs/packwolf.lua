local assets =
{
    -- Build "pigman" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

local SQUAD_ALERT_TAGS = { "packwolf" }

local function OnAttacked(inst, data)
    inst.components.combat:SetTarget(data.attacker)

    local x, y, z = inst.Transform:GetWorldPosition()
    local allies = TheSim:FindEntities(x, y, z, TUNING.PACKWOLF_SQUADALERT_RANGE, SQUAD_ALERT_TAGS)
    for _, ally in ipairs(allies) do
        if ally ~= inst and ally.components.combat ~= nil then
            ally.components.combat:SuggestTarget(data.attacker)
        end
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
    inst.AnimState:SetBuild("pigman")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("monster")
    inst:AddTag("hostile")
    inst:AddTag("packwolf")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.PACKWOLF_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.PACKWOLF_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.PACKWOLF_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.PACKWOLF_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)
    inst:ListenForEvent("attacked", OnAttacked)

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("monstermeat", 1)

    inst:AddComponent("herdmember")
    inst.components.herdmember:SetHerdPrefab("packwolfherd")

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGpackwolf")
    inst:SetBrain(require("brains/packwolfbrain"))

    return inst
end

return Prefab("packwolf", fn, assets, prefabs)
