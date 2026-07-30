local assets =
{
    -- Build "wildbore_build" reaproveitado do mod "Island Adventures - Shipwrecked", sem asset próprio necessário.
}

local prefabs = {}

local function TryDepositAtHome(inst)
    local home = inst.components.homeseeker ~= nil and inst.components.homeseeker.home or nil
    if home == nil or home.components.container == nil or inst.components.inventory == nil then
        return
    end
    if inst:GetDistanceSqToInst(home) > 16 then
        return
    end

    local items = {}
    inst.components.inventory:ForEachItem(function(item) table.insert(items, item) end)
    for _, item in ipairs(items) do
        if home.components.container:IsFull() then
            break
        end
        local removed = inst.components.inventory:RemoveItem(item, true)
        if removed ~= nil then
            home.components.container:GiveItem(removed)
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
    inst.AnimState:SetBuild("wildbore_build")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("animal")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.MINER_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.MINER_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.MINER_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.MINER_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("meat", 1)

    inst:AddComponent("inventory")

    inst:AddComponent("worker")
    inst.components.worker:SetAction(ACTIONS.MINE, 1)

    inst:DoPeriodicTask(3, TryDepositAtHome)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGminer")
    inst:SetBrain(require("brains/minerbrain"))

    return inst
end

return Prefab("miner", fn, assets, prefabs)
