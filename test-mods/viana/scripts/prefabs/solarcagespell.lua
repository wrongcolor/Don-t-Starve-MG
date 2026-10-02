local assets =
{
    Asset("ANIM", "anim/solarcagespell.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("ATLAS", "images/inventoryimages/solarcagespell.xml"),
    Asset("IMAGE", "images/inventoryimages/solarcagespell.tex"),
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("solarcagespell")
    inst.AnimState:SetBuild("solarcagespell")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")
    inst:AddTag("spell")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst.spell_label = "Solar Cage"
    inst.spell_summonprefab = nil
    inst.spell_manacost = 60
    inst.spell_healthdelta = nil
    inst.spell_sanitydelta = nil
    inst.spell_hungerdelta = nil
    inst.spell_temperaturedelta = 20
    inst.spell_cage = { fx = "sungate", radius = 7, spacing = 0.8, duration = 10 }

    return inst
end

return Prefab("solarcagespell", fn, assets, prefabs)
