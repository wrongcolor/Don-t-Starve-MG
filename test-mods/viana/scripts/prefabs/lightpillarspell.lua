local assets =
{
    Asset("ANIM", "anim/lightpillarspell.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("ATLAS", "images/inventoryimages/lightpillarspell.xml"),
    Asset("IMAGE", "images/inventoryimages/lightpillarspell.tex"),
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("lightpillarspell")
    inst.AnimState:SetBuild("lightpillarspell")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")
    inst:AddTag("spell")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst.spell_label = "Solar Pillar"
    inst.spell_summonprefab = "solarpillar"
    inst.spell_manacost = 80
    inst.spell_healthdelta = nil
    inst.spell_sanitydelta = nil
    inst.spell_hungerdelta = nil
    inst.spell_temperaturedelta = nil
    inst.spell_aimed = true

    return inst
end

return Prefab("lightpillarspell", fn, assets, prefabs)
