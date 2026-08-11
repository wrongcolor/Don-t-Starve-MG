local assets =
{
    -- Build "rocks" reaproveitado do jogo base, sem asset próprio necessário.
    -- ATENÇÃO: build vanilla escolhido para um item empunhável — confirme se "swap_rocks" existe no jogo base antes de publicar.
}

local function onequip(inst, owner)
    owner.AnimState:OverrideSymbol("swap_object", "swap_rocks", "swap_rocks")
    owner.AnimState:Show("ARM_carry")
    owner.AnimState:Hide("ARM_normal")
end

local function onunequip(inst, owner)
    owner.AnimState:Hide("ARM_carry")
    owner.AnimState:Show("ARM_normal")
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("rocks")
    inst.AnimState:SetBuild("rocks")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")
    inst.components.inventoryitem.imagename = "rocks"

    inst:AddComponent("tool")
    inst.components.tool:SetAction(ACTIONS.CHOP)

    inst:AddComponent("weapon")
    inst.components.weapon:SetDamage(TUNING.TESTAXE_DAMAGE)

    inst:AddComponent("finiteuses")
    inst.components.finiteuses:SetMaxUses(TUNING.TESTAXE_USES)
    inst.components.finiteuses:SetUses(TUNING.TESTAXE_USES)
    inst.components.finiteuses:SetOnFinished(inst.Remove)
    inst.components.finiteuses:SetConsumption(ACTIONS.CHOP, 1)
    inst.components.finiteuses:SetIgnoreCombatDurabilityLoss(true)

    inst:AddComponent("equippable")
    inst.components.equippable:SetOnEquip(onequip)
    inst.components.equippable:SetOnUnequip(onunequip)

    return inst
end

return Prefab("testaxe", fn, assets, prefabs)
