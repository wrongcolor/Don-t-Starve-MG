local assets =
{
    -- Build "books" reaproveitado do jogo base, sem asset próprio necessário.
    Asset("ATLAS", "images/inventoryimages/suncodex.xml"),
    Asset("IMAGE", "images/inventoryimages/suncodex.tex"),
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()
    inst.spell_contents = net_string(inst.GUID, "suncodex.spell_contents", "spell_contentsdirty")

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("books")
    inst.AnimState:SetBuild("books")
    inst.AnimState:PlayAnimation("book_light")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("container")
    inst.components.container:WidgetSetup("suncodex")
    inst.components.inventoryitem:SetOnPutInInventoryFn(function(inst)
        inst.components.container:Close()
    end)

    local function UpdateSpellContents(inst)
        local parts = {}
        for slot = 1, inst.components.container.numslots do
            local slotitem = inst.components.container.slots[slot]
            if slotitem ~= nil and slotitem.spell_label ~= nil then
                local isaimed = slotitem.spell_beam ~= nil or slotitem.spell_nova ~= nil or slotitem.spell_aimed
                local beam = slotitem.spell_beam
                local nova = slotitem.spell_nova
                local refraction = slotitem.spell_refraction
                table.insert(parts, table.concat({
                    slotitem.spell_label,
                    tostring(slotitem.spell_manacost or ""),
                    tostring(slotitem.spell_healthdelta or ""),
                    tostring(slotitem.spell_sanitydelta or ""),
                    tostring(slotitem.spell_hungerdelta or ""),
                    slotitem.spell_summonprefab or "",
                    isaimed and "1" or "",
                    beam ~= nil and tostring(beam.damage) or "",
                    beam ~= nil and tostring(beam.tickinterval) or "",
                    beam ~= nil and tostring(beam.range) or "",
                    beam ~= nil and tostring(beam.duration) or "",
                    (beam ~= nil and beam.telegraph ~= nil) and tostring(beam.telegraph) or "",
                    nova ~= nil and tostring(nova.damage) or "",
                    nova ~= nil and tostring(nova.radius) or "",
                    nova ~= nil and tostring(nova.stun) or "",
                    refraction ~= nil and tostring(refraction.radius) or "",
                    refraction ~= nil and tostring(refraction.duration) or "",
                }, "\31"))
            end
        end
        inst.spell_contents:set(table.concat(parts, "\30"))
    end
    inst:ListenForEvent("itemget", UpdateSpellContents)
    inst:ListenForEvent("itemlose", UpdateSpellContents)
    UpdateSpellContents(inst)

    return inst
end

return Prefab("suncodex", fn, assets, prefabs)
