local assets =
{
    Asset("ANIM", "anim/solarbeamspell.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("ATLAS", "images/inventoryimages/solarbeamspell.xml"),
    Asset("IMAGE", "images/inventoryimages/solarbeamspell.tex"),
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("solarbeamspell")
    inst.AnimState:SetBuild("solarbeamspell")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")
    inst:AddTag("spell")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst.spell_label = "Solar Beam"
    inst.spell_summonprefab = nil
    inst.spell_manacost = 50
    inst.spell_healthdelta = nil
    inst.spell_sanitydelta = nil
    inst.spell_hungerdelta = nil
    inst.spell_temperaturedelta = 10
    inst.spell_beam = { damage = 35, tickinterval = 0.5, range = 10, duration = 3, telegraph = 0.5, fx = "lightbeam", fxscale = 2, fxspeed = 0.5 }

    return inst
end

return Prefab("solarbeamspell", fn, assets, prefabs)
