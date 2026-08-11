local assets =
{
    -- Build "gems" reaproveitado do jogo base, sem asset próprio necessário.
}

local function oneaten(inst, eater)
    if eater == nil then return end

    if eater.components.mana ~= nil then
        eater.components.mana:IncreaseMaxPermanent(TUNING.SOLARCORE_MANA_BOOST, TUNING.SOLARCORE_MANA_BOOST_CAP)
    end
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("gems")
    inst.AnimState:SetBuild("gems")
    inst.AnimState:PlayAnimation("yellowgem_idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")
    inst.components.inventoryitem.imagename = "gems"

    inst:AddComponent("edible")
    inst.components.edible.foodtype = FOODTYPE.GOODIES
    inst.components.edible.healthvalue = TUNING.SOLARCORE_HEALTH
    inst.components.edible.hungervalue = TUNING.SOLARCORE_HUNGER
    inst.components.edible.sanityvalue = TUNING.SOLARCORE_SANITY
    inst.components.edible:SetOnEatenFn(oneaten)

    return inst
end

return Prefab("solarcore", fn, assets, prefabs)
