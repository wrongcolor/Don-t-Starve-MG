local assets =
{
    -- Build "staffs" reaproveitado do jogo base, sem asset próprio necessário.
}

local function spell_aoe_reticuletargetfn()
    return Vector3(ThePlayer.entity:LocalToWorldSpace(5, 0.001, 0))
end

local function StartAOETargeting(inst)
    if ThePlayer.components.playercontroller ~= nil then
        ThePlayer.components.playercontroller:StartAOETargetingUsing(inst)
    end
end

local function DoSpellBeamDamage(user, beam)
    local x, y, z = user.Transform:GetWorldPosition()
    local angle = user.Transform:GetRotation() * DEGREES
    local dx, dz = math.cos(angle), -math.sin(angle)
    local hit = {}
    local dist = 2
    while dist <= beam.range do
        local px, pz = x + dx * dist, z + dz * dist
        local ents = TheSim:FindEntities(px, 0, pz, 2, nil, { "INLIMBO", "player" }, { "hostile" })
        for _, v in ipairs(ents) do
            if not hit[v] and v.components.health ~= nil and not v.components.health:IsDead() then
                v.components.health:DoDelta(-beam.damage, false, "solarbeam", false, user)
                hit[v] = true
            end
        end
        dist = dist + 2
    end
end

local function StartSpellBeamTicking(user, beam)
    local task
    task = user:DoPeriodicTask(beam.tickinterval, function()
        DoSpellBeamDamage(user, beam)
    end)
    user:DoTaskInTime(beam.duration, function()
        if task ~= nil then
            task:Cancel()
        end
    end)
end

local function StartSpellBeam(user, beam)
    if beam.telegraph == nil then
        StartSpellBeamTicking(user, beam)
        return
    end

    local x, y, z = user.Transform:GetWorldPosition()
    local angle = user.Transform:GetRotation() * DEGREES
    local marker = SpawnPrefab("reticule")
    if marker ~= nil then
        marker.Transform:SetPosition(x + math.cos(angle) * 3, 0, z - math.sin(angle) * 3)
    end
    user:DoTaskInTime(beam.telegraph, function()
        if marker ~= nil and marker:IsValid() then
            marker:Remove()
        end
        StartSpellBeamTicking(user, beam)
    end)
end

local function DoSpellNova(user, pos, nova)
    local x, y, z = pos:Get()
    local victims = TheSim:FindEntities(x, y, z, nova.radius, { "hostile" })
    for _, victim in ipairs(victims) do
        if victim.components.health ~= nil and not victim.components.health:IsDead() then
            victim.components.health:DoDelta(-nova.damage, false, "solarnova", false, user)
            if victim.components.freezable ~= nil then
                victim.components.freezable:Freeze(nova.stun)
            end
        end
    end
end

local function spellbook_cast_from_slotitem(spellitem)
    return function(inst, user, pos)
        if spellitem.spell_manacost ~= nil and user.components.mana ~= nil
            and not user.components.mana:Spend(spellitem.spell_manacost) then
            return false
        end
        local isaimed = spellitem.spell_beam ~= nil or spellitem.spell_nova ~= nil or spellitem.spell_aimed
        if isaimed then
            user:ForceFacePoint(pos:Get())
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
                if isaimed then
                    fx.Transform:SetPosition(pos:Get())
                else
                    fx.Transform:SetPosition(user.Transform:GetWorldPosition())
                end
            end
        end
        if spellitem.spell_beam ~= nil then
            StartSpellBeam(user, spellitem.spell_beam)
        end
        if spellitem.spell_nova ~= nil then
            DoSpellNova(user, pos, spellitem.spell_nova)
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
                    if spellitem.spell_beam ~= nil or spellitem.spell_nova ~= nil or spellitem.spell_aimed then
                        inst.components.spellbook:SetSpellFn(nil)
                        if spellitem.spell_beam ~= nil then
                            inst.components.aoetargeting:SetRange(spellitem.spell_beam.range)
                        end
                        inst.components.aoespell:SetSpellFn(spellbook_cast_from_slotitem(spellitem))
                    else
                        inst.components.spellbook:SetSpellFn(spellbook_cast_from_slotitem(spellitem))
                        inst.components.aoespell:SetSpellFn(nil)
                    end
                end,
                execute = (spellitem.spell_beam ~= nil or spellitem.spell_nova ~= nil or spellitem.spell_aimed) and StartAOETargeting or function(inst)
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

    inst:AddComponent("aoetargeting")
    inst.components.aoetargeting.reticule.targetfn = spell_aoe_reticuletargetfn
    inst.components.aoetargeting.reticule.mouseenabled = true

    inst:AddComponent("aoespell")

    return inst
end

return Prefab("sunstaff", fn, assets, prefabs)
