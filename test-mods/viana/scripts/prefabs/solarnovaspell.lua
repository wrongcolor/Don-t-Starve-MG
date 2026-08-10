local assets =
{
    -- Build "papyrus" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("papyrus")
    inst.AnimState:SetBuild("papyrus")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")
    inst:AddTag("spell")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst.spell_label = "Solar Nova"
    inst.spell_summonprefab = nil
    inst.spell_manacost = 45
    inst.spell_healthdelta = nil
    inst.spell_sanitydelta = nil
    inst.spell_hungerdelta = nil
    inst.spell_nova = { damage = 40, radius = 5, stun = 3 }

    return inst
end

return Prefab("solarnovaspell", fn, assets, prefabs)
