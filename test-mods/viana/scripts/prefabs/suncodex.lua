local assets =
{
    -- Build "books" reaproveitado do jogo base, sem asset próprio necessário.
    -- ATENÇÃO: build vanilla escolhido para um item empunhável — confirme se "swap_books" existe no jogo base antes de publicar.
    Asset("ANIM", "anim/ui_suncodex.zip"),
    Asset("ATLAS", "images/suncodex_slot.xml"),
    Asset("IMAGE", "images/suncodex_slot.tex"),
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

local function spell_aoe_mousetargetfn(inst, pos)
    if pos == nil then
        return nil
    end
    local range = inst.components.aoetargeting ~= nil and inst.components.aoetargeting.range or 8
    local x, y, z = ThePlayer.Transform:GetWorldPosition()
    local dx, dz = pos.x - x, pos.z - z
    local distsq = dx * dx + dz * dz
    if distsq > range * range then
        local scale = range / math.sqrt(distsq)
        return Vector3(x + dx * scale, y, z + dz * scale)
    end
    return pos
end

local function spell_aoe_reticuletargetfn(inst)
    local range = inst.components.aoetargeting ~= nil and inst.components.aoetargeting.range or 8
    return Vector3(ThePlayer.entity:LocalToWorldSpace(range, 0.001, 0))
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

local function DoSpellCastPose(user)
    if user.components.locomotor ~= nil then
        user.components.locomotor:Stop()
    end
    if user.sg ~= nil and user.sg:HasAnyStateTag("idle", "running") then
        user.sg:GoToState("castspell")
    end
end

local function spell_aoe_linetargetfn(inst)
    local range = inst.components.aoetargeting ~= nil and inst.components.aoetargeting.range or 8
    return Vector3(ThePlayer.entity:LocalToWorldSpace(range, 0, 0))
end

local function spell_aoe_linemousetargetfn(inst, pos)
    if pos == nil then
        return nil
    end
    local range = inst.components.aoetargeting ~= nil and inst.components.aoetargeting.range or 8
    local x, y, z = inst.Transform:GetWorldPosition()
    local dx, dz = pos.x - x, pos.z - z
    local distsq = dx * dx + dz * dz
    if distsq <= 0 then
        return inst.components.reticule ~= nil and inst.components.reticule.targetpos or pos
    end
    local scale = range / math.sqrt(distsq)
    return Vector3(x + dx * scale, 0, z + dz * scale)
end

local function spell_aoe_lineupdatepositionfn(inst, pos, reticule, ease, smoothing, dt)
    local x, y, z = inst.Transform:GetWorldPosition()
    reticule.Transform:SetPosition(x, 0, z)
    local rot = -math.atan2(pos.z - z, pos.x - x) / DEGREES
    if ease and dt ~= nil then
        local rot0 = reticule.Transform:GetRotation()
        local drot = rot - rot0
        rot = Lerp((drot > 180 and rot0 + 360) or (drot < -180 and rot0 - 360) or rot0, rot, dt * smoothing)
    end
    reticule.Transform:SetRotation(rot)
end

local function StartSpellBeamTicking(user, beam, pos)
    local fx
    if beam.fx ~= nil then
        fx = SpawnPrefab(beam.fx)
        if fx ~= nil then
            local ux, uy, uz = user.Transform:GetWorldPosition()
            fx.Transform:SetPosition(ux, 0, uz)
            if pos ~= nil then
                local px, py, pz = pos:Get()
                local worldangle = -math.atan2(pz - uz, px - ux) / DEGREES
                fx.Transform:SetRotation(worldangle)
            else
                fx.Transform:SetRotation(user.Transform:GetRotation())
            end
            if beam.fxscale ~= nil then
                fx.Transform:SetScale(beam.fxscale, beam.fxscale, beam.fxscale)
            end
            if beam.fxspeed ~= nil then
                fx.AnimState:SetDeltaTimeMultiplier(beam.fxspeed)
            end
        end
    end
    local task
    task = user:DoPeriodicTask(beam.tickinterval, function()
        DoSpellBeamDamage(user, beam)
        if fx ~= nil and fx:IsValid() then
            local fux, fuy, fuz = user.Transform:GetWorldPosition()
            fx.Transform:SetPosition(fux, 0, fuz)
        end
    end)
    TheWorld:DoTaskInTime(beam.duration, function()
        if task ~= nil then
            task:Cancel()
        end
        if fx ~= nil and fx:IsValid() then
            fx.AnimState:PlayAnimation("pst")
            fx:ListenForEvent("animover", fx.Remove)
            fx:DoTaskInTime(3, fx.Remove)
        end
    end)
end

local function StartSpellBeam(user, beam, pos)
    if beam.telegraph == nil then
        StartSpellBeamTicking(user, beam, pos)
        return
    end

    local x, y, z = user.Transform:GetWorldPosition()
    local angle = user.Transform:GetRotation() * DEGREES
    local marker = SpawnPrefab("reticule")
    if marker ~= nil then
        marker.Transform:SetPosition(x + math.cos(angle) * 3, 0, z - math.sin(angle) * 3)
    end
    TheWorld:DoTaskInTime(beam.telegraph, function()
        if marker ~= nil and marker:IsValid() then
            marker:Remove()
        end
        if user:IsValid() then
            StartSpellBeamTicking(user, beam, pos)
        end
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

local CAGE_RISE_DELAY = 0.035
local CAGE_TICK = 0.1
local CAGE_MARGIN = 0.6
local CAGE_CANT_TAGS = { "INLIMBO", "player", "playerghost", "FX", "NOCLICK", "notarget", "wall" }

local function IsCageable(victim, user)
    if victim.components.locomotor == nil then
        return false
    end
    local leader = victim.components.follower ~= nil and victim.components.follower:GetLeader() or nil
    return leader == nil or not leader:HasTag("player")
end

local function DoSpellCage(user, pos, cage)
    local x, y, z = pos:Get()
    local count = math.max(8, math.floor(TWOPI * cage.radius / cage.spacing))
    if count % 2 == 1 then
        count = count + 1
    end

    local bars = {}
    local ended = false
    for i = 0, count - 1 do
        local angle = PI / 2 + i / count * TWOPI
        local bx, bz = x + math.cos(angle) * cage.radius, z + math.sin(angle) * cage.radius
        TheWorld:DoTaskInTime(i * CAGE_RISE_DELAY, function()
            if ended then
                return
            end
            local bar = SpawnPrefab(cage.fx .. (i % 2 == 0 and "_tall" or "_short"))
            if bar ~= nil then
                bar.Transform:SetPosition(bx, 0, bz)
                table.insert(bars, bar)
            end
        end)
    end

    local inside = {}
    for _, victim in ipairs(TheSim:FindEntities(x, y, z, cage.radius, nil, CAGE_CANT_TAGS)) do
        if IsCageable(victim, user) then
            inside[victim] = true
        end
    end

    local inner, outer = cage.radius - CAGE_MARGIN, cage.radius + CAGE_MARGIN
    local contain = TheWorld:DoPeriodicTask(CAGE_TICK, function()
        for _, victim in ipairs(TheSim:FindEntities(x, y, z, outer + 2, nil, CAGE_CANT_TAGS)) do
            if victim:IsValid() and IsCageable(victim, user) then
                local vx, vy, vz = victim.Transform:GetWorldPosition()
                local dx, dz = vx - x, vz - z
                local dist = math.sqrt(dx * dx + dz * dz)
                local clampto
                if inside[victim] then
                    if dist > inner then
                        clampto = inner
                    end
                elseif dist < inner - CAGE_MARGIN then
                    inside[victim] = true
                elseif dist < outer then
                    clampto = outer
                end
                if clampto ~= nil and dist > 0.001 then
                    local nx, nz = x + dx / dist * clampto, z + dz / dist * clampto
                    if victim.Physics ~= nil then
                        victim.Physics:Teleport(nx, vy, nz)
                    else
                        victim.Transform:SetPosition(nx, vy, nz)
                    end
                end
            end
        end
    end)

    TheWorld:DoTaskInTime(cage.duration, function()
        ended = true
        contain:Cancel()
        for i, bar in ipairs(bars) do
            TheWorld:DoTaskInTime(i * CAGE_RISE_DELAY, function()
                if bar:IsValid() and bar.Dismiss ~= nil then
                    bar:Dismiss()
                end
            end)
        end
    end)
end

local function DoSpellDesintegrate(user, pos, desintegrate)
    local x, y, z = pos:Get()
    local marker = SpawnPrefab("reticule")
    if marker ~= nil then
        marker.Transform:SetPosition(x, 0, z)
    end

    local fx
    if desintegrate.fx ~= nil then
        fx = SpawnPrefab(desintegrate.fx)
        if fx ~= nil then
            fx.Transform:SetPosition(x, 0, z)
            if desintegrate.fxscale ~= nil then
                fx.Transform:SetScale(desintegrate.fxscale, desintegrate.fxscale, desintegrate.fxscale)
            end
            if desintegrate.fxleadin ~= nil and desintegrate.casttime > 0 then
                fx.AnimState:SetDeltaTimeMultiplier(desintegrate.fxleadin / desintegrate.casttime)
            end
            fx.AnimState:PlayAnimation("pre")
            fx.AnimState:PushAnimation("fall", false)
        end
    end

    TheWorld:DoTaskInTime(desintegrate.casttime, function()
        if marker ~= nil and marker:IsValid() then
            marker:Remove()
        end

        if fx ~= nil and fx:IsValid() then
            fx.AnimState:SetDeltaTimeMultiplier(1)
            fx.AnimState:PlayAnimation("explode")
            fx:ListenForEvent("animover", function()
                if not fx:IsValid() then
                    return
                elseif fx.AnimState:IsCurrentAnimation("explode") then
                    fx.AnimState:PlayAnimation("pst")
                elseif fx.AnimState:IsCurrentAnimation("pst") then
                    fx:Remove()
                end
            end)
        end

        local victims = TheSim:FindEntities(x, y, z, desintegrate.radius, nil, { "INLIMBO", "player" })
        for _, victim in ipairs(victims) do
            local isowncompanion = victim.components.follower ~= nil and victim.components.follower:GetLeader() == user
            if victim.components.health ~= nil and not victim.components.health:IsDead() and not isowncompanion then
                local damage = (desintegrate.overheatdamage ~= nil and user._customoverheat) and desintegrate.overheatdamage or desintegrate.damage
                victim.components.health:DoDelta(-damage, false, "desintegrate", false, user:IsValid() and user or nil)
            end
        end
    end)
end

local function DoSpellGearDrop(user, geardrop)
    local x, y, z = user.Transform:GetWorldPosition()
    for _, prefab in ipairs(geardrop.prefabs) do
        local spawned = SpawnPrefab(prefab)
        if spawned ~= nil then
            local offset = FindWalkableOffset(Vector3(x, y, z), math.random() * TWOPI, geardrop.radius, 8, true, false)
            if offset ~= nil then
                spawned.Transform:SetPosition(x + offset.x, y + offset.y, z + offset.z)
            else
                spawned.Transform:SetPosition(x, y, z)
            end
        end
    end
end

local function DoSpellHealOverTime(user, hot)
    if user.components.health == nil then
        return
    end

    user.components.health:AddRegenSource(user, hot.persecond, 1, "spell_healovertime")
    local duration = hot.total / hot.persecond
    user:DoTaskInTime(duration, function()
        if user.components.health ~= nil then
            user.components.health:RemoveRegenSource(user, "spell_healovertime")
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
            flashbangradius, flashbangstun, cagefx, cageradius, cagespacing, cageduration,
            desintegrateradius, desintegratedamage, desintegratecasttime,
            geardropprefabs, geardropradius, temperaturedelta, healtotal, healpersecond,
            desintegrateoverheatdamage, beamfx, beamfxscale, beamfxspeed,
            desintegratefx, desintegratefxscale, desintegratefxleadin =
            fields[1], fields[2], fields[3], fields[4], fields[5], fields[6],
            fields[7], fields[8], fields[9], fields[10], fields[11], fields[12],
            fields[13], fields[14], fields[15], fields[16], fields[17],
            fields[18], fields[19], fields[20], fields[21], fields[22], fields[23],
            fields[24], fields[25], fields[26],
            fields[27], fields[28], fields[29], fields[30], fields[31],
            fields[32], fields[33], fields[34], fields[35],
            fields[36], fields[37], fields[38]
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
                    if temperaturedelta ~= "" and user.components.temperature ~= nil then
                        user.components.temperature:DoDelta(tonumber(temperaturedelta), true)
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
                        DoSpellCastPose(user)
                        StartSpellBeam(user, {
                            damage = tonumber(beamdamage),
                            tickinterval = tonumber(beamtickinterval),
                            range = tonumber(beamrange),
                            duration = tonumber(beamduration),
                            telegraph = beamtelegraph ~= "" and tonumber(beamtelegraph) or nil,
                            fx = beamfx ~= "" and beamfx or nil,
                            fxscale = beamfxscale ~= "" and tonumber(beamfxscale) or nil,
                            fxspeed = beamfxspeed ~= "" and tonumber(beamfxspeed) or nil,
                        }, pos)
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
                    if cagefx ~= "" then
                        DoSpellCage(user, pos, { fx = cagefx, radius = tonumber(cageradius), spacing = tonumber(cagespacing), duration = tonumber(cageduration) })
                    end
                    if desintegrateradius ~= "" then
                        DoSpellDesintegrate(user, pos, {
                            radius = tonumber(desintegrateradius),
                            damage = tonumber(desintegratedamage),
                            casttime = tonumber(desintegratecasttime),
                            overheatdamage = desintegrateoverheatdamage ~= "" and tonumber(desintegrateoverheatdamage) or nil,
                            fx = desintegratefx ~= "" and desintegratefx or nil,
                            fxscale = desintegratefxscale ~= "" and tonumber(desintegratefxscale) or nil,
                            fxleadin = desintegratefxleadin ~= "" and tonumber(desintegratefxleadin) or nil,
                        })
                    end
                    if geardropprefabs ~= "" then
                        local dropprefabs = {}
                        for dropprefab in geardropprefabs:gmatch("[^,]+") do
                            table.insert(dropprefabs, dropprefab)
                        end
                        DoSpellGearDrop(user, { prefabs = dropprefabs, radius = tonumber(geardropradius) })
                    end
                    if healtotal ~= "" then
                        DoSpellHealOverTime(user, { total = tonumber(healtotal), persecond = tonumber(healpersecond) })
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
                    if beamdamage ~= "" then
                        inst.components.aoetargeting.reticule.reticuleprefab = "reticuleline"
                        inst.components.aoetargeting.reticule.pingprefab = "reticulelineping"
                        inst.components.aoetargeting.reticule.targetfn = spell_aoe_linetargetfn
                        inst.components.aoetargeting.reticule.mousetargetfn = spell_aoe_linemousetargetfn
                        inst.components.aoetargeting.reticule.updatepositionfn = spell_aoe_lineupdatepositionfn
                    elseif novadamage ~= "" or cagefx ~= "" or desintegrateradius ~= "" then
                        local aoeradius = tonumber(novadamage ~= "" and novaradius or (cagefx ~= "" and cageradius or desintegrateradius))
                        if aoeradius ~= nil and aoeradius <= 6 then
                            inst.components.aoetargeting.reticule.reticuleprefab = "reticuleaoe_1_6"
                            inst.components.aoetargeting.reticule.pingprefab = "reticuleaoeping_1_6"
                        else
                            inst.components.aoetargeting.reticule.reticuleprefab = "reticuleaoe"
                            inst.components.aoetargeting.reticule.pingprefab = "reticuleaoeping"
                        end
                        inst.components.aoetargeting.reticule.targetfn = spell_aoe_reticuletargetfn
                        inst.components.aoetargeting.reticule.mousetargetfn = spell_aoe_mousetargetfn
                        inst.components.aoetargeting.reticule.updatepositionfn = nil
                    else
                        inst.components.aoetargeting.reticule.reticuleprefab = "reticule"
                        inst.components.aoetargeting.reticule.pingprefab = nil
                        inst.components.aoetargeting.reticule.targetfn = spell_aoe_reticuletargetfn
                        inst.components.aoetargeting.reticule.mousetargetfn = spell_aoe_mousetargetfn
                        inst.components.aoetargeting.reticule.updatepositionfn = nil
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
    inst.components.aoetargeting.reticule.mousetargetfn = spell_aoe_mousetargetfn
    inst.components.aoetargeting.reticule.mouseenabled = true
    inst.components.aoetargeting.reticule.twinstickmode = 1

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
                local isaimed = slotitem.spell_beam ~= nil or slotitem.spell_nova ~= nil or slotitem.spell_cage ~= nil or slotitem.spell_desintegrate ~= nil or slotitem.spell_aimed
                local beam = slotitem.spell_beam
                local nova = slotitem.spell_nova
                local refraction = slotitem.spell_refraction
                local flashbang = slotitem.spell_flashbang
                local cage = slotitem.spell_cage
                local desintegrate = slotitem.spell_desintegrate
                local geardrop = slotitem.spell_geardrop
                local healovertime = slotitem.spell_healovertime
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
                    cage ~= nil and cage.fx or "",
                    cage ~= nil and tostring(cage.radius) or "",
                    cage ~= nil and tostring(cage.spacing) or "",
                    cage ~= nil and tostring(cage.duration) or "",
                    desintegrate ~= nil and tostring(desintegrate.radius) or "",
                    desintegrate ~= nil and tostring(desintegrate.damage) or "",
                    desintegrate ~= nil and tostring(desintegrate.casttime) or "",
                    geardrop ~= nil and table.concat(geardrop.prefabs, ",") or "",
                    geardrop ~= nil and tostring(geardrop.radius) or "",
                    tostring(slotitem.spell_temperaturedelta or ""),
                    healovertime ~= nil and tostring(healovertime.total) or "",
                    healovertime ~= nil and tostring(healovertime.persecond) or "",
                    (desintegrate ~= nil and desintegrate.overheatdamage ~= nil) and tostring(desintegrate.overheatdamage) or "",
                    beam ~= nil and (beam.fx or "") or "",
                    (beam ~= nil and beam.fxscale ~= nil) and tostring(beam.fxscale) or "",
                    (beam ~= nil and beam.fxspeed ~= nil) and tostring(beam.fxspeed) or "",
                    desintegrate ~= nil and (desintegrate.fx or "") or "",
                    (desintegrate ~= nil and desintegrate.fxscale ~= nil) and tostring(desintegrate.fxscale) or "",
                    (desintegrate ~= nil and desintegrate.fxleadin ~= nil) and tostring(desintegrate.fxleadin) or "",
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
