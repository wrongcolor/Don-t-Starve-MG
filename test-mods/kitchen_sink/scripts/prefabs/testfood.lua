local assets =
{
    -- Build "cutgrass" reaproveitado do jogo base, sem asset próprio necessário.
}

local function oneaten(inst, eater)
    if eater == nil or eater.components.combat == nil then return end

    eater.components.combat.externaldamagemultipliers:SetModifier(inst, 1 + TUNING.TESTFOOD_DAMAGE_BUFF_MULT, "testfood_damage_buff")
    eater:DoTaskInTime(TUNING.TESTFOOD_DAMAGE_BUFF_DURATION, function()
        if eater.components.combat ~= nil then
            eater.components.combat.externaldamagemultipliers:RemoveModifier(inst, "testfood_damage_buff")
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

    inst.AnimState:SetBank("cutgrass")
    inst.AnimState:SetBuild("cutgrass")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("edible")
    inst.components.edible.foodtype = FOODTYPE.MEAT
    inst.components.edible.healthvalue = TUNING.TESTFOOD_HEALTH
    inst.components.edible.hungervalue = TUNING.TESTFOOD_HUNGER
    inst.components.edible.sanityvalue = TUNING.TESTFOOD_SANITY
    inst.components.edible:SetOnEatenFn(oneaten)

    return inst
end

return Prefab("testfood", fn, assets, prefabs)
