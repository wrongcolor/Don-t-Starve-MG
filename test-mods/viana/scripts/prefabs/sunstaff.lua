local assets =
{
    -- Build "staffs" reaproveitado do jogo base, sem asset próprio necessário.
}

local function spellbook_cast_from_slotitem(spellitem)
    return function(inst, user)
        if spellitem.spell_manacost ~= nil and user.components.mana ~= nil
            and not user.components.mana:Spend(spellitem.spell_manacost) then
            return false
        end
        if spellitem.spell_healthdelta ~= nil and user.components.health ~= nil then
            user.components.health:DoDelta(spellitem.spell_healthdelta)
        end
        if spellitem.spell_sanitydelta ~= nil and user.components.sanity ~= nil then
            user.components.sanity:DoDelta(spellitem.spell_sanitydelta)
        end
        if spellitem.spell_hungerdelta ~= nil and user.components.hunger ~= nil then
            user.components.hunger:DoDelta(spellitem.spell_hungerdelta)
        end
        if spellitem.spell_summonprefab ~= nil then
            local fx = SpawnPrefab(spellitem.spell_summonprefab)
            if fx ~= nil then
                fx.Transform:SetPosition(user.Transform:GetWorldPosition())
            end
        end
        if inst.components.finiteuses ~= nil then
            inst.components.finiteuses:Use(1)
        end
        return true
    end
end

local function rebuild_spellbook_items(user)
    local codex = user.components.inventory ~= nil and user.components.inventory:FindItem(function(item)
        return item.prefab == "suncodex"
    end)
    if codex == nil or codex.components.container == nil then
        return nil
    end

    local items = {}
    for slot = 1, codex.components.container.numslots do
        local spellitem = codex.components.container.slots[slot]
        if spellitem ~= nil and spellitem.spell_label ~= nil then
            table.insert(items, {
                label = spellitem.spell_label,
                onselect = function(inst)
                    inst.components.spellbook:SetSpellName(spellitem.spell_label)
                    inst.components.spellbook:SetSpellFn(spellbook_cast_from_slotitem(spellitem))
                end,
                execute = function(inst)
                    local inventory = ThePlayer.replica.inventory
                    if inventory ~= nil then
                        inventory:CastSpellBookFromInv(inst)
                    end
                end,
            })
        end
    end
    return items
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("staffs")
    inst.AnimState:SetBuild("staffs")
    inst.AnimState:PlayAnimation("yellowstaff")

    inst:AddTag("item")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("spellbook")
    inst.components.spellbook:SetShouldOpenFn(function(inst, user)
        local items = rebuild_spellbook_items(user)
        if items == nil or #items == 0 then
            return false
        end
        inst.components.spellbook:SetItems(items)
        return true
    end)

    return inst
end

return Prefab("sunstaff", fn, assets, prefabs)
