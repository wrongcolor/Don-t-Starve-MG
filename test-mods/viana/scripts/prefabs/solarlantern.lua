local assets =
{
    -- Build "lantern" reaproveitado do jogo base, sem asset próprio necessário.
}

local function onequip(inst, owner)
    owner.AnimState:OverrideSymbol("swap_hat", "lantern", "swap_hat")
    owner.AnimState:Show("HAT")
    owner.AnimState:Show("HAIR_HAT")
    owner.AnimState:Hide("HAIR_NOHAT")
    owner.AnimState:Hide("HAIR")
    inst.Light:Enable(true)
    inst.components.fueled:StartConsuming()
end

local function onunequip(inst, owner)
    owner.AnimState:ClearOverrideSymbol("swap_hat")
    owner.AnimState:Hide("HAT")
    owner.AnimState:Hide("HAIR_HAT")
    owner.AnimState:Show("HAIR_NOHAT")
    owner.AnimState:Show("HAIR")
    inst.Light:Enable(false)
    inst.components.fueled:StopConsuming()
end

local function SolarLanternRechargeTick(inst)
    if TheWorld.state.isday and not TheWorld:HasTag("cave") and not inst.components.fueled:IsFull() then
        inst.components.fueled:DoDelta(TUNING.SOLARLANTERN_RECHARGE_RATE)
    end
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()
    inst.entity:AddLight()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("lantern")
    inst.AnimState:SetBuild("lantern")
    inst.AnimState:PlayAnimation("idle_off")

    inst.Light:SetRadius(TUNING.SOLARLANTERN_LIGHT_RADIUS)
    inst.Light:SetFalloff(.9)
    inst.Light:SetIntensity(.7)
    inst.Light:SetColour(255 / 255, 220 / 255, 150 / 255)
    inst.Light:Enable(false)

    inst:AddTag("item")
    inst:AddTag("solarfueled")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("equippable")
    inst.components.equippable.equipslot = EQUIPSLOTS.HEAD
    inst.components.equippable:SetOnEquip(onequip)
    inst.components.equippable:SetOnUnequip(onunequip)

    inst:AddComponent("fueled")
    inst.components.fueled.fueltype = FUELTYPE.MAGIC
    inst.components.fueled:InitializeFuelLevel(TUNING.SOLARLANTERN_MAX_FUEL)
    inst.components.fueled.rate = TUNING.SOLARLANTERN_DRAIN_RATE
    inst:DoPeriodicTask(1, SolarLanternRechargeTick)

    return inst
end

return Prefab("solarlantern", fn, assets, prefabs)
