local assets =
{
    -- Build "boomerang" reaproveitado do jogo base, sem asset próprio necessário.
    -- ATENÇÃO: build vanilla escolhido para um item empunhável — confirme se "swap_boomerang" existe no jogo base antes de publicar.
}

local function onequip(inst, owner)
    owner.AnimState:OverrideSymbol("swap_object", "swap_boomerang", "swap_boomerang")
    owner.AnimState:Show("ARM_carry")
    owner.AnimState:Hide("ARM_normal")
end

local function onunequip(inst, owner)
    owner.AnimState:Hide("ARM_carry")
    owner.AnimState:Show("ARM_normal")
end

local function OnChakramDischarged(inst)
    inst.components.weapon:SetRange(nil)
    inst.components.weapon:SetProjectile(nil)
end

local function OnChakramCharged(inst)
    inst.components.weapon:SetRange(TUNING.SOLARCHAKRAM_RANGE)
    inst.components.weapon:SetProjectile("solarchakram_proj")
end

local prefabs = { "solarchakram_proj" }

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("boomerang")
    inst.AnimState:SetBuild("boomerang")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")
    inst.components.inventoryitem.imagename = "boomerang"

    inst:AddComponent("weapon")
    inst.components.weapon:SetDamage(TUNING.SOLARCHAKRAM_DAMAGE)
    inst.components.weapon:SetRange(TUNING.SOLARCHAKRAM_RANGE)
    inst.components.weapon:SetProjectile("solarchakram_proj")
    inst:AddComponent("rechargeable")
    inst.components.rechargeable:SetOnDischargedFn(OnChakramDischarged)
    inst.components.rechargeable:SetOnChargedFn(OnChakramCharged)

    inst:AddComponent("equippable")
    inst.components.equippable:SetOnEquip(onequip)
    inst.components.equippable:SetOnUnequip(onunequip)

    return inst
end

return Prefab("solarchakram", fn, assets, prefabs)
