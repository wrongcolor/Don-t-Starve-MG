local assets =
{
    -- Build "log" reaproveitado do jogo base, sem asset próprio necessário.
}

local function onblocked_armor(owner)
    owner.SoundEmitter:PlaySound("dontstarve/wilson/hit_armour")
end

local function onequip(inst, owner)
    owner.AnimState:OverrideSymbol("swap_body", "log", "swap_body")
    inst:ListenForEvent("blocked", onblocked_armor, owner)
end

local function onunequip(inst, owner)
    owner.AnimState:ClearOverrideSymbol("swap_body")
    inst:RemoveEventCallback("blocked", onblocked_armor, owner)
end

local function onarmortakedamage(inst, damage_amount)
    local owner = inst.components.inventoryitem.owner
    if owner ~= nil and owner.components.sanity ~= nil then
        owner.components.sanity:DoDelta(-damage_amount * TUNING.TESTARMOR_SANITY_LOSS_PERCENT, false)
    end
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("log")
    inst.AnimState:SetBuild("log")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("finiteuses")
    inst.components.finiteuses:SetMaxUses(TUNING.TESTARMOR_USES)
    inst.components.finiteuses:SetUses(TUNING.TESTARMOR_USES)
    inst.components.finiteuses:SetOnFinished(inst.Remove)

    inst:AddComponent("armor")
    inst.components.armor:InitCondition(TUNING.TESTARMOR_CONDITION, TUNING.TESTARMOR_ABSORPTION)
    inst.components.armor:AddWeakness("beaver", 5)
    inst.components.armor.ontakedamage = onarmortakedamage

    inst:AddComponent("fuel")
    inst.components.fuel.fuelvalue = TUNING.LARGE_FUEL
    MakeSmallBurnable(inst, TUNING.SMALL_BURNTIME)
    MakeSmallPropagator(inst)

    inst:AddComponent("equippable")
    inst.components.equippable.equipslot = EQUIPSLOTS.BODY
    inst.components.equippable:SetOnEquip(onequip)
    inst.components.equippable:SetOnUnequip(onunequip)
    inst.components.equippable.walkspeedmult = 0.9
    inst.components.equippable.dapperness = -0.5

    return inst
end

return Prefab("testarmor", fn, assets, prefabs)
