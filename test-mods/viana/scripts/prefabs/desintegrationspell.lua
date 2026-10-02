local assets =
{
    Asset("ANIM", "anim/desintegrationspell.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("ATLAS", "images/inventoryimages/desintegrationspell.xml"),
    Asset("IMAGE", "images/inventoryimages/desintegrationspell.tex"),
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("desintegrationspell")
    inst.AnimState:SetBuild("desintegrationspell")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")
    inst:AddTag("spell")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst.spell_label = "Desintegration"
    inst.spell_summonprefab = nil
    inst.spell_manacost = 150
    inst.spell_healthdelta = nil
    inst.spell_sanitydelta = nil
    inst.spell_hungerdelta = nil
    inst.spell_temperaturedelta = nil
    inst.spell_desintegrate = { radius = 6, damage = 2000, casttime = 7, overheatdamage = 5000, fx = "starfall", fxscale = 1, fxleadin = 2.112 }

    return inst
end

return Prefab("desintegrationspell", fn, assets, prefabs)
