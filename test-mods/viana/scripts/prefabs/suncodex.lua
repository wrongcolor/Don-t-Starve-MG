local assets =
{
    -- Build "books" reaproveitado do jogo base, sem asset próprio necessário.
    -- ATENÇÃO: build vanilla escolhido para um item empunhável — confirme se "swap_books" existe no jogo base antes de publicar.
    Asset("ATLAS", "images/inventoryimages/suncodex.xml"),
    Asset("IMAGE", "images/inventoryimages/suncodex.tex"),
}

local function onequip(inst, owner)
    owner.AnimState:OverrideSymbol("swap_object", "swap_books", "swap_books")
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

local function DoSpellFlashbang(user, flashbang)
    local x, y, z = user.Transform:GetWorldPosition()
    local victims = TheSim:FindEntities(x, y, z, flashbang.radius, nil, { "INLIMBO", "player" })
    for _, victim in ipairs(victims) do
        local isowncompanion = victim.components.follower ~= nil and victim.components.follower:GetLeader() == user
        if victim.components.freezable ~= nil and not isowncompanion then
            victim.components.freezable:Freeze(flashbang.stun)
        end
    end
end

local function DoSpellCage(user, pos, cage)
    local x, y, z = pos:Get()
    local pillars = {}
    for i = 1, cage.count do
        local angle = TWOPI * (i - 1) / cage.count
        local pillar = SpawnPrefab(cage.prefab)
        if pillar ~= nil then
            pillar.Transform:SetPosition(x + math.cos(angle) * cage.radius, 0, z - math.sin(angle) * cage.radius)
            table.insert(pillars, pillar)
        end
    end

    local victims = TheSim:FindEntities(x, y, z, cage.radius, nil, { "INLIMBO", "player" })
    for _, victim in ipairs(victims) do
        local isowncompanion = victim.components.follower ~= nil and victim.components.follower:GetLeader() == user
        if victim.components.locomotor ~= nil and not isowncompanion then
            if victim.components.rooted == nil then
                victim:AddComponent("rooted")
            end
            victim.components.rooted:AddSource(user)
            victim:DoTaskInTime(cage.rooted, function()
                if victim.components.rooted ~= nil then
                    victim.components.rooted:RemoveSource(user)
                end
            end)
        end
    end

    user:DoTaskInTime(cage.rooted, function()
        for _, pillar in ipairs(pillars) do
            if pillar:IsValid() then
                pillar:Remove()
            end
        end
    end)
end

local function FindCodex(user)
    local codex = user.replica.inventory ~= nil and user.replica.inventory:FindItem(function(item)
        return item.prefab == "suncodex"
    end)
    if codex == nil and user.replica.inventory ~= nil then
        local equipped = user.replica.inventory:GetEquippedItem(EQUIPSLOTS.HANDS)
        if equipped ~= nil and equipped.prefab == "suncodex" then
            codex = equipped
        end
    end
    return codex
end

local function rebuild_spellbook_items(user)
    local codex = FindCodex(user)
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
            novadamage, novaradius, novastun, refractionradius, refractionduration,
            flashbangradius, flashbangstun, cageprefab, cageradius, cagecount, cagerooted =
            fields[1], fields[2], fields[3], fields[4], fields[5], fields[6],
            fields[7], fields[8], fields[9], fields[10], fields[11], fields[12],
            fields[13], fields[14], fields[15], fields[16], fields[17],
            fields[18], fields[19], fields[20], fields[21], fields[22], fields[23]
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
                    if flashbangradius ~= "" then
                        DoSpellFlashbang(user, { radius = tonumber(flashbangradius), stun = tonumber(flashbangstun) })
                    end
                    if cageprefab ~= "" then
                        DoSpellCage(user, pos, { prefab = cageprefab, radius = tonumber(cageradius), count = tonumber(cagecount), rooted = tonumber(cagerooted) })
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
                    if novadamage ~= "" or cageprefab ~= "" then
                        inst.components.aoetargeting.reticule.reticuleprefab = "reticuleaoe"
                        inst.components.aoetargeting.reticule.pingprefab = "reticuleaoeping"
                    else
                        inst.components.aoetargeting.reticule.reticuleprefab = "reticule"
                        inst.components.aoetargeting.reticule.pingprefab = nil
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
    inst.spell_contents = net_string(inst.GUID, "suncodex.spell_contents", "spell_contentsdirty")

    MakeInventoryPhysics(inst)

    inst.AnimState:SetBank("books")
    inst.AnimState:SetBuild("books")
    inst.AnimState:PlayAnimation("book_light")

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
    inst.components.weapon:SetDamage(TUNING.SUNCODEX_DAMAGE)

    inst:AddComponent("equippable")
    inst.components.equippable:SetOnEquip(onequip)
    inst.components.equippable:SetOnUnequip(onunequip)

    inst:AddComponent("aoespell")

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
                local isaimed = slotitem.spell_beam ~= nil or slotitem.spell_nova ~= nil or slotitem.spell_cage ~= nil or slotitem.spell_aimed
                local beam = slotitem.spell_beam
                local nova = slotitem.spell_nova
                local refraction = slotitem.spell_refraction
                local flashbang = slotitem.spell_flashbang
                local cage = slotitem.spell_cage
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
                    flashbang ~= nil and tostring(flashbang.radius) or "",
                    flashbang ~= nil and tostring(flashbang.stun) or "",
                    cage ~= nil and cage.prefab or "",
                    cage ~= nil and tostring(cage.radius) or "",
                    cage ~= nil and tostring(cage.count) or "",
                    cage ~= nil and tostring(cage.rooted) or "",
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
