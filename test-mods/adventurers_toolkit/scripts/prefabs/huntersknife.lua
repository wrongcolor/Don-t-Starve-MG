local assets =
{
    Asset("ANIM", "anim/huntersknife.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("ANIM", "anim/swap_huntersknife.zip"), -- PLACEHOLDER: aparência na mão, ver README
    Asset("INV_IMAGE", "huntersknife"),
}

local function onequip(inst, owner)
    owner.AnimState:OverrideSymbol("swap_object", "swap_huntersknife", "swap_huntersknife")
    owner.AnimState:Show("ARM_carry")
    owner.AnimState:Hide("ARM_normal")
end

local function onunequip(inst, owner)
    owner.AnimState:Hide("ARM_carry")
    owner.AnimState:Show("ARM_normal")
end

local function CombineWith(inst, material)
    if material == nil or not material:IsValid() or material == inst or material.prefab ~= inst.prefab then
        return false
    end

    if inst.components.finiteuses ~= nil and material.components.finiteuses ~= nil then
        inst.components.finiteuses:SetPercent(math.min(inst.components.finiteuses:GetPercent() + material.components.finiteuses:GetPercent(), 1))
    elseif inst.components.armor ~= nil and material.components.armor ~= nil then
        inst.components.armor:SetPercent(math.min(inst.components.armor:GetPercent() + material.components.armor:GetPercent(), 1))
    elseif inst.components.perishable ~= nil and material.components.perishable ~= nil then
        inst.components.perishable:SetPercent(math.min(inst.components.perishable:GetPercent() + material.components.perishable:GetPercent(), 1))
    else
        return false
    end

    material:Remove()
    return true
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("huntersknife")
    inst.AnimState:SetBuild("huntersknife")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")
    inst:AddTag("combinable_item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("weapon")
    inst.components.weapon:SetDamage(TUNING.HUNTERSKNIFE_DAMAGE)

    inst:AddComponent("finiteuses")
    inst.components.finiteuses:SetMaxUses(TUNING.HUNTERSKNIFE_USES)
    inst.components.finiteuses:SetUses(TUNING.HUNTERSKNIFE_USES)
    inst.components.finiteuses:SetOnFinished(inst.Remove)

    inst:AddComponent("equippable")
    inst.components.equippable:SetOnEquip(onequip)
    inst.components.equippable:SetOnUnequip(onunequip)

    inst.CombineWith = CombineWith

    return inst
end

return Prefab("huntersknife", fn, assets, prefabs)
