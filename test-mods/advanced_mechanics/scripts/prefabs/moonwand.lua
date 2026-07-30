local assets =
{
    Asset("ANIM", "anim/moonwand.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("ANIM", "anim/swap_moonwand.zip"), -- PLACEHOLDER: aparência na mão, ver README
    Asset("INV_IMAGE", "moonwand"),
}

local function onequip(inst, owner)
    owner.AnimState:OverrideSymbol("swap_object", "swap_moonwand", "swap_moonwand")
    owner.AnimState:Show("ARM_carry")
    owner.AnimState:Hide("ARM_normal")
end

local function onunequip(inst, owner)
    owner.AnimState:Hide("ARM_carry")
    owner.AnimState:Show("ARM_normal")
end

local function onattack(inst, attacker, target)
    if inst.components.rechargeable ~= nil then
        inst.components.rechargeable:Discharge(TUNING.MOONWAND_COOLDOWN)
    end
end

local function spell_reticuletargetfn()
    return Vector3(ThePlayer.entity:LocalToWorldSpace(5, 0.001, 0))
end

local function createlight(staff, target, pos)
    local light = SpawnPrefab("stafflight") -- reaproveita o prefab de luz do jogo base
    light.Transform:SetPosition(pos:Get())
    if staff.components.finiteuses ~= nil then
        staff.components.finiteuses:Use(1)
    end
    if staff.components.rechargeable ~= nil then
        staff.components.rechargeable:Discharge(TUNING.MOONWAND_COOLDOWN)
    end
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("moonwand")
    inst.AnimState:SetBuild("moonwand")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("weapon")
    inst.components.weapon:SetDamage(TUNING.MOONWAND_DAMAGE)
    inst.components.weapon:SetOnAttack(onattack)

    inst:AddComponent("rechargeable")
    inst.components.rechargeable:SetChargeTime(TUNING.MOONWAND_COOLDOWN)
    inst.components.inspectable.getstatus = function(inst)
        return (inst.components.rechargeable ~= nil and not inst.components.rechargeable:IsCharged()) and "RECHARGING" or nil
    end

    inst:AddComponent("equippable")
    inst.components.equippable:SetOnEquip(onequip)
    inst.components.equippable:SetOnUnequip(onunequip)

    inst:AddComponent("reticule")
    inst.components.reticule.targetfn = spell_reticuletargetfn

    inst:AddComponent("spellcaster")
    inst.components.spellcaster:SetSpellFn(createlight)
    inst.components.spellcaster.canuseonpoint = true

    return inst
end

return Prefab("moonwand", fn, assets, prefabs)
