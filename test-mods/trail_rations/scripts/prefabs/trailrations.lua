local assets =
{
    -- Build "jerky" reaproveitado do jogo base, sem asset próprio necessário.
}

local function oneaten(inst, eater)
    if eater == nil or eater.components.combat == nil then return end

    eater.components.combat.externaldamagemultipliers:SetModifier(inst, 1 + TUNING.TRAILRATIONS_DAMAGE_BUFF_MULT, "trailrations_damage_buff")
    eater:DoTaskInTime(TUNING.TRAILRATIONS_DAMAGE_BUFF_DURATION, function()
        if eater.components.combat ~= nil then
            eater.components.combat.externaldamagemultipliers:RemoveModifier(inst, "trailrations_damage_buff")
        end
    end)
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("jerky")
    inst.AnimState:SetBuild("jerky")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("stackable")
    inst.components.stackable:SetMaxSize(TUNING.TRAILRATIONS_STACK_SIZE)

    inst:AddComponent("perishable")
    inst.components.perishable:SetPerishTime(TUNING.TRAILRATIONS_PERISH_TIME)
    inst.components.perishable:StartPerishing()
    inst.components.perishable:SetOnPerishFn(inst.Remove)

    inst:AddComponent("edible")
    inst.components.edible.foodtype = FOODTYPE.MEAT
    inst.components.edible.healthvalue = TUNING.TRAILRATIONS_HEALTH
    inst.components.edible.hungervalue = TUNING.TRAILRATIONS_HUNGER
    inst.components.edible.sanityvalue = TUNING.TRAILRATIONS_SANITY
    inst.components.edible:SetOnEatenFn(oneaten)

    return inst
end

return Prefab("trailrations", fn, assets, prefabs)
