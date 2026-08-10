local assets =
{
    -- Build "moonrock_idol" reaproveitado do jogo base, sem asset próprio necessário.
}

local function spell_reticuletargetfn()
    return Vector3(ThePlayer.entity:LocalToWorldSpace(5, 0.001, 0))
end

local function summontotem(staff, target, pos)
    if staff.components.fueled ~= nil and staff.components.fueled:IsEmpty() then
        return
    end
    if staff._totemcreature ~= nil and staff._totemcreature:IsValid() then
        staff._totemcreature:Remove()
        staff._totemcreature = nil
        return
    end
    local creature = SpawnPrefab("sunorb")
    creature.Transform:SetPosition(pos:Get())
    if creature.components.follower ~= nil then
        creature.components.follower:SetLeader(staff.components.inventoryitem.owner)
    end
    staff._totemcreature = creature
end

local function OnTotemFuelChanged(inst)
    if inst.components.fueled:IsEmpty() and inst._totemcreature ~= nil then
        if inst._totemcreature:IsValid() then
            inst._totemcreature:Remove()
        end
        inst._totemcreature = nil
    end
end

local function TotemRechargeTick(inst)
    if TheWorld.state.isday and not TheWorld:HasTag("cave") and not inst.components.fueled:IsFull() then
        inst.components.fueled:DoDelta(TUNING.SUNTOTEM_RECHARGE_RATE)
    end
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("moonrock_idol")
    inst.AnimState:SetBuild("moonrock_idol")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("fueled")
    inst.components.fueled.fueltype = FUELTYPE.MAGIC
    inst.components.fueled:InitializeFuelLevel(TUNING.SUNTOTEM_MAX_DURABILITY)
    inst.components.fueled.rate = TUNING.SUNTOTEM_DRAIN_RATE
    inst:ListenForEvent("percentusedchange", OnTotemFuelChanged)
    inst:DoPeriodicTask(1, TotemRechargeTick)

    inst:AddComponent("reticule")
    inst.components.reticule.targetfn = spell_reticuletargetfn

    inst:AddComponent("spellcaster")
    inst.components.spellcaster:SetSpellFn(summontotem)
    inst.components.spellcaster.canuseonpoint = true

    return inst
end

return Prefab("suntotem", fn, assets, prefabs)
