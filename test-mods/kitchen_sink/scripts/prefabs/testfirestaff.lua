local assets =
{
    -- Build "nightmarefuel" reaproveitado do jogo base, sem asset próprio necessário.
    -- ATENÇÃO: build vanilla escolhido para um item empunhável — confirme se "swap_nightmarefuel" existe no jogo base antes de publicar.
}

local function onequip(inst, owner)
    owner.AnimState:OverrideSymbol("swap_object", "swap_nightmarefuel", "swap_nightmarefuel")
    owner.AnimState:Show("ARM_carry")
    owner.AnimState:Hide("ARM_normal")
end

local function onunequip(inst, owner)
    owner.AnimState:Hide("ARM_carry")
    owner.AnimState:Show("ARM_normal")
end

local function onattack(inst, attacker, target)
    if attacker ~= nil and attacker.components.sanity ~= nil then
        attacker.components.sanity:DoDelta(-TUNING.TESTFIRESTAFF_SANITY_COST)
    end
    if target ~= nil and target:IsValid() and target.components.burnable ~= nil then
        target.components.burnable:Ignite(true, attacker)
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
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("nightmarefuel")
    inst.AnimState:SetBuild("nightmarefuel")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("weapon")
    inst.components.weapon:SetDamage(TUNING.TESTFIRESTAFF_DAMAGE)
    inst.components.weapon:SetRange(TUNING.TESTFIRESTAFF_MIN_RANGE, TUNING.TESTFIRESTAFF_MAX_RANGE)
    inst.components.weapon:SetProjectile("fire_projectile")
    inst.components.weapon:SetOnAttack(onattack)

    inst:AddComponent("finiteuses")
    inst.components.finiteuses:SetMaxUses(TUNING.TESTFIRESTAFF_USES)
    inst.components.finiteuses:SetUses(TUNING.TESTFIRESTAFF_USES)
    inst.components.finiteuses:SetOnFinished(inst.Remove)

    inst:AddComponent("equippable")
    inst.components.equippable:SetOnEquip(onequip)
    inst.components.equippable:SetOnUnequip(onunequip)
    inst.components.equippable.walkspeedmult = 1.25

    inst:AddComponent("reticule")
    inst.components.reticule.targetfn = spell_reticuletargetfn

    inst:AddComponent("spellcaster")
    inst.components.spellcaster:SetSpellFn(createlight)
    inst.components.spellcaster.canuseonpoint = true

    return inst
end

return Prefab("testfirestaff", fn, assets, prefabs)
