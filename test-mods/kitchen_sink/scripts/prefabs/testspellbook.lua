local assets =
{
    -- Build "goldnugget" reaproveitado do jogo base, sem asset próprio necessário.
}

local function spellbook_cast_1(inst, user, pos)
    local fx = SpawnPrefab("stafflight")
    if fx ~= nil then
        fx.Transform:SetPosition(user.Transform:GetWorldPosition())
    end
    if inst.components.finiteuses ~= nil then
        inst.components.finiteuses:Use(1)
    end
    return true
end

local function spellbook_cast_2(inst, user, pos)
    local fx = SpawnPrefab("firefly")
    if fx ~= nil then
        fx.Transform:SetPosition(user.Transform:GetWorldPosition())
    end
    if inst.components.finiteuses ~= nil then
        inst.components.finiteuses:Use(1)
    end
    return true
end

local SPELLBOOK_SPELLS =
{
    {
        label = "Summon Light",
        onselect = function(inst)
            inst.components.spellbook:SetSpellName("Summon Light")
            inst.components.spellbook:SetSpellFn(spellbook_cast_1)
        end,
        execute = function(inst)
            local inventory = ThePlayer.replica.inventory
            if inventory ~= nil then
                inventory:CastSpellBookFromInv(inst)
            end
        end,
    },
    {
        label = "Summon Fireflies",
        onselect = function(inst)
            inst.components.spellbook:SetSpellName("Summon Fireflies")
            inst.components.spellbook:SetSpellFn(spellbook_cast_2)
        end,
        execute = function(inst)
            local inventory = ThePlayer.replica.inventory
            if inventory ~= nil then
                inventory:CastSpellBookFromInv(inst)
            end
        end,
    },
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("goldnugget")
    inst.AnimState:SetBuild("goldnugget")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("item")

    inst:AddComponent("spellbook")
    inst.components.spellbook:SetItems(SPELLBOOK_SPELLS)

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")
    inst.components.inventoryitem.imagename = "goldnugget"

    return inst
end

return Prefab("testspellbook", fn, assets, prefabs)
