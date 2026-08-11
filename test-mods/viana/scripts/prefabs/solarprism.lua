local assets =
{
    -- Build "gems" reaproveitado do jogo base, sem asset próprio necessário.
}

local function OnActivate(inst, doer)
    inst.is_on = not inst.is_on
end

local function ChargeTick(inst)
    if inst.is_on and TheWorld.state.isday and not TheWorld:HasTag("cave")
        and inst.components.inventoryitem.owner == nil and not inst.components.fueled:IsFull() then
        inst.components.fueled:DoDelta(TUNING.SOLARPRISM_CHARGE_RATE)
    end
end

local function DrainIntoMana(inst, doer)
    if inst.components.fueled:IsEmpty() or doer.components.mana == nil then
        return false
    end
    local amount = inst.components.fueled.currentfuel
    doer.components.mana:DoDelta(amount)
    inst.components.fueled:DoDelta(-amount)
    return true
end

local function DrainIntoTarget(inst, target)
    if inst.components.fueled:IsEmpty() or target.components.fueled == nil then
        return false
    end
    local amount = math.min(inst.components.fueled.currentfuel, target.components.fueled.maxfuel - target.components.fueled.currentfuel)
    if amount <= 0 then
        return false
    end
    target.components.fueled:DoDelta(amount)
    inst.components.fueled:DoDelta(-amount)
    return true
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
    inst:AddTag("solarprism")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")
    inst.components.inventoryitem.imagename = "gems"

    inst:AddComponent("fueled")
    inst.components.fueled.fueltype = FUELTYPE.MAGIC
    inst.components.fueled.maxfuel = TUNING.SOLARPRISM_MAX_CHARGE

    inst:AddComponent("activatable")
    inst.components.activatable.OnActivate = OnActivate
    inst.components.activatable.quickaction = true

    inst.DrainIntoMana = DrainIntoMana
    inst.DrainIntoTarget = DrainIntoTarget

    inst:DoPeriodicTask(1, ChargeTick)

    return inst
end

return Prefab("solarprism", fn, assets, prefabs)
