local assets =
{
    Asset("ANIM", "anim/emberwispspell.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("ATLAS", "images/inventoryimages/emberwispspell.xml"),
    Asset("IMAGE", "images/inventoryimages/emberwispspell.tex"),
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("emberwispspell")
    inst.AnimState:SetBuild("emberwispspell")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")
    inst:AddTag("spell")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst.spell_label = "Golden Bloom"
    inst.spell_summonprefab = "goldflower"
    inst.spell_manacost = 100
    inst.spell_healthdelta = nil
    inst.spell_sanitydelta = nil
    inst.spell_hungerdelta = nil
    inst.spell_temperaturedelta = 15
    inst.spell_aimed = true

    return inst
end

return Prefab("emberwispspell", fn, assets, prefabs)
