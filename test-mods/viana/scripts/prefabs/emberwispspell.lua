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
    inst.components.inventoryitem.imagename = "papyrus"

    inst.spell_label = "Ember Wisp"
    inst.spell_summonprefab = "emberlight"
    inst.spell_manacost = 20
    inst.spell_healthdelta = nil
    inst.spell_sanitydelta = nil
    inst.spell_hungerdelta = nil
    inst.spell_aimed = true

    return inst
end

return Prefab("emberwispspell", fn, assets, prefabs)
