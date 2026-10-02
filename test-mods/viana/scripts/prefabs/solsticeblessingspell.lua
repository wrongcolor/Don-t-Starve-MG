local assets =
{
    Asset("ANIM", "anim/solsticeblessingspell.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("ATLAS", "images/inventoryimages/solsticeblessingspell.xml"),
    Asset("IMAGE", "images/inventoryimages/solsticeblessingspell.tex"),
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("solsticeblessingspell")
    inst.AnimState:SetBuild("solsticeblessingspell")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")
    inst:AddTag("spell")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst.spell_label = "Solstice Blessing"
    inst.spell_summonprefab = nil
    inst.spell_manacost = 60
    inst.spell_healthdelta = 20
    inst.spell_sanitydelta = 15
    inst.spell_hungerdelta = 10
    inst.spell_temperaturedelta = 15

    return inst
end

return Prefab("solsticeblessingspell", fn, assets, prefabs)
