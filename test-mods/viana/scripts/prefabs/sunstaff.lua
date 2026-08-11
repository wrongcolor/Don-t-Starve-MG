local assets =
{
    -- Build "staffs" reaproveitado do jogo base, sem asset próprio necessário.
    -- ATENÇÃO: build vanilla escolhido para um item empunhável — confirme se "swap_staffs" existe no jogo base antes de publicar.
    Asset("ATLAS", "images/inventoryimages/sunstaff.xml"),
    Asset("IMAGE", "images/inventoryimages/sunstaff.tex"),
}

local function onequip(inst, owner)
    owner.AnimState:OverrideSymbol("swap_object", "swap_staffs", "swap_staffs")
    owner.AnimState:Show("ARM_carry")
    owner.AnimState:Hide("ARM_normal")
end

local function onunequip(inst, owner)
    owner.AnimState:Hide("ARM_carry")
    owner.AnimState:Show("ARM_normal")
end

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

local function DoSpellRefraction(user, refraction)
    local x, y, z = user.Transform:GetWorldPosition()
    local allies = TheSim:FindEntities(x, y, z, refraction.radius, { "player" })
    for _, ally in ipairs(allies) do
        if ally.components.health ~= nil then
            ally.components.health:SetInvincible(true)
            ally:DoTaskInTime(refraction.duration, function()
                if ally.components.health ~= nil then
                    ally.components.health:SetInvincible(false)
                end
            end)
        end
    end
end

local function rebuild_spellbook_items(user)
    local codex = user.replica.inventory ~= nil and user.replica.inventory:FindItem(function(item)
        return item.prefab == "suncodex"
    end)
    if codex == nil or codex.spell_contents == nil then
        return nil
    end

    local items = {}
    for entry in codex.spell_contents:value():gmatch("[^\30]+") do
        local fields = {}
        for field in (entry .. "\31"):gmatch("(.-)\31") do
            table.insert(fields, field)
        end
        local label, manacost, healthdelta, sanitydelta, hungerdelta, summonprefab,
            isaimed, beamdamage, beamtickinterval, beamrange, beamduration, beamtelegraph,
            novadamage, novaradius, novastun, refractionradius, refractionduration =
            fields[1], fields[2], fields[3], fields[4], fields[5], fields[6],
            fields[7], fields[8], fields[9], fields[10], fields[11], fields[12],
            fields[13], fields[14], fields[15], fields[16], fields[17]
        table.insert(items, {
            label = label,
            checkenabled = function(owner) return manacost == "" or owner.mana_current == nil or owner.mana_current:value() >= tonumber(manacost) end,
            onselect = function(inst)
                inst.components.spellbook:SetSpellName(label)
                local function cast(inst, user, pos)
                    if manacost ~= "" and user.components.mana ~= nil
                        and not user.components.mana:Spend(tonumber(manacost)) then
                        return false
                    end
                    if isaimed == "1" then
                        user:ForceFacePoint(pos:Get())
                    end
                    if healthdelta ~= "" and user.components.health ~= nil then
                        user.components.health:DoDelta(tonumber(healthdelta))
                    end
                    if sanitydelta ~= "" and user.components.sanity ~= nil then
                        user.components.sanity:DoDelta(tonumber(sanitydelta))
                    end
                    if hungerdelta ~= "" and user.components.hunger ~= nil then
                        user.components.hunger:DoDelta(tonumber(hungerdelta))
                    end
                    if summonprefab ~= "" then
                        local fx = SpawnPrefab(summonprefab)
                        if fx ~= nil then
                            if isaimed == "1" then
                                fx.Transform:SetPosition(pos:Get())
                            else
                                fx.Transform:SetPosition(user.Transform:GetWorldPosition())
                            end
                        end
                    end
                    if beamdamage ~= "" then
                        StartSpellBeam(user, {
                            damage = tonumber(beamdamage),
                            tickinterval = tonumber(beamtickinterval),
                            range = tonumber(beamrange),
                            duration = tonumber(beamduration),
                            telegraph = beamtelegraph ~= "" and tonumber(beamtelegraph) or nil,
                        })
                    end
                    if novadamage ~= "" then
                        DoSpellNova(user, pos, { damage = tonumber(novadamage), radius = tonumber(novaradius), stun = tonumber(novastun) })
                    end
                    if refractionradius ~= "" then
                        DoSpellRefraction(user, { radius = tonumber(refractionradius), duration = tonumber(refractionduration) })
                    end
                    if inst.components.finiteuses ~= nil then
                        inst.components.finiteuses:Use(1)
                    end
                    return true
                end
                if isaimed == "1" then
                    inst.components.spellbook:SetSpellFn(nil)
                    if beamrange ~= "" then
                        inst.components.aoetargeting:SetRange(tonumber(beamrange))
                    end
                    if TheWorld.ismastersim then
                        inst.components.aoespell:SetSpellFn(cast)
                    end
                else
                    inst.components.spellbook:SetSpellFn(cast)
                    if TheWorld.ismastersim then
                        inst.components.aoespell:SetSpellFn(nil)
                    end
                end
            end,
            execute = (isaimed == "1") and StartAOETargeting or function(inst)
                local inventory = ThePlayer.replica.inventory
                if inventory ~= nil then
                    inventory:CastSpellBookFromInv(inst)
                end
            end,
        })
    end
    return items
end

local function GetSpellbookOwner(inst)
    if TheWorld.ismastersim then
        return inst.components.inventoryitem ~= nil and inst.components.inventoryitem:GetGrandOwner() or nil
    end
    return inst.replica.inventoryitem ~= nil and inst.replica.inventoryitem:IsGrandOwner(ThePlayer) and ThePlayer or nil
end

local function RefreshSpellbookItems(inst)
    local owner = GetSpellbookOwner(inst)
    inst.components.spellbook:SetItems(owner ~= nil and rebuild_spellbook_items(owner) or nil)
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

    inst:AddComponent("spellbook")
    inst:DoPeriodicTask(0.5, RefreshSpellbookItems)

    inst:AddComponent("aoetargeting")
    inst.components.aoetargeting.reticule.targetfn = spell_aoe_reticuletargetfn
    inst.components.aoetargeting.reticule.mouseenabled = true

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")
    inst:AddComponent("inventoryitem")

    inst:AddComponent("weapon")
    inst.components.weapon:SetDamage(TUNING.SUNSTAFF_DAMAGE)

    inst:AddComponent("equippable")
    inst.components.equippable:SetOnEquip(onequip)
    inst.components.equippable:SetOnUnequip(onunequip)

    inst:AddComponent("aoespell")

    return inst
end

return Prefab("sunstaff", fn, assets, prefabs)
