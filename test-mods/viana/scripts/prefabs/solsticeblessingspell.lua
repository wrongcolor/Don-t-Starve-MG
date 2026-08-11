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

    inst.spell_label = "Solstice Blessing"
    inst.spell_summonprefab = nil
    inst.spell_manacost = 60
    inst.spell_healthdelta = nil
    inst.spell_sanitydelta = 30
    inst.spell_hungerdelta = nil
    inst.spell_temperaturedelta = 15
    inst.spell_healovertime = { total = 50, persecond = 5 }

    return inst
end

return Prefab("solsticeblessingspell", fn, assets, prefabs)
