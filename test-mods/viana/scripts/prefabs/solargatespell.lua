local assets =
{
    Asset("ANIM", "anim/solargatespell.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("ATLAS", "images/inventoryimages/solargatespell.xml"),
    Asset("IMAGE", "images/inventoryimages/solargatespell.tex"),
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("solargatespell")
    inst.AnimState:SetBuild("solargatespell")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")
    inst:AddTag("spell")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst.spell_label = "Solar Gate"
    inst.spell_summonprefab = "sunportal"
    inst.spell_manacost = 90
    inst.spell_healthdelta = nil
    inst.spell_sanitydelta = nil
    inst.spell_hungerdelta = nil
    inst.spell_temperaturedelta = nil
    inst.spell_aimed = true

    return inst
end

return Prefab("solargatespell", fn, assets, prefabs)
