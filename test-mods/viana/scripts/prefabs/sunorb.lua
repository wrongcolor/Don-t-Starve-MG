local assets =
{
    -- Build "flameball_fx" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

local function TryDefendLeader(inst)
    local leader = FindClosestPlayerToInst(inst, 30, true)
    if leader ~= nil and inst.components.follower:GetLeader() ~= leader then
        inst.components.follower:SetLeader(leader)
    end
end

local ORBIT_CONTACT_TAGS = { "hostile" }

local function OrbitLeader(inst)
    if inst.components.combat ~= nil and inst.components.combat:HasTarget() then
        return
    end
    local leader = inst.components.follower ~= nil and inst.components.follower:GetLeader() or nil
    if leader == nil or not leader:IsValid() then
        return
    end
    inst._orbitangle = (inst._orbitangle or 0) + 0.07853981633974483
    local x, y, z = leader.Transform:GetWorldPosition()
    local orbitx = x + 3 * math.cos(inst._orbitangle)
    local orbitz = z + 3 * math.sin(inst._orbitangle)
    inst.Transform:SetPosition(orbitx, 0, orbitz)

    if inst.components.combat ~= nil and not inst.components.combat:InCooldown() then
        local victims = TheSim:FindEntities(orbitx, 0, orbitz, 1.5, ORBIT_CONTACT_TAGS)
        for _, victim in ipairs(victims) do
            if victim ~= inst and victim.components.health ~= nil and not victim.components.health:IsDead() then
                inst.components.combat:StartAttack()
                inst.components.combat:DoAttack(victim)
                break
            end
        end
    end
end

local function OnOrbitPhaseChanged(inst, phase)
    if phase == "day" then
        inst.components.combat:SetDefaultDamage(25)
    elseif phase == "dusk" then
        inst.components.combat:SetDefaultDamage(15)
    else
        inst.components.combat:SetDefaultDamage(10)
    end
end

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddSoundEmitter()
    inst.entity:AddLight()
    inst.entity:AddNetwork()

    MakeCharacterPhysics(inst, 50, .5)

    inst.AnimState:SetBank("flameball_fx")
    inst.AnimState:SetBuild("flameball_fx")
    inst.AnimState:PlayAnimation("idle_loop")

    inst.Light:SetRadius(TUNING.SUNORB_LIGHT_RADIUS)
    inst.Light:SetFalloff(TUNING.SUNORB_LIGHT_FALLOFF)
    inst.Light:SetIntensity(TUNING.SUNORB_LIGHT_INTENSITY)
    inst.Light:SetColour(TUNING.SUNORB_LIGHT_COLOUR_R, TUNING.SUNORB_LIGHT_COLOUR_G, TUNING.SUNORB_LIGHT_COLOUR_B)
    inst.Light:Enable(true)

    inst:AddTag("animal")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.SUNORB_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.SUNORB_HEALTH)
    inst.components.health:SetInvincible(true)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.SUNORB_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.SUNORB_ATTACK_PERIOD)
    inst.components.combat:SetRange(TUNING.SUNORB_ATTACK_RANGE)

    inst:AddComponent("sanityaura")
    inst.components.sanityaura.aura = TUNING.SUNORB_SANITYAURA

    inst:AddComponent("heater")
    inst.components.heater.heat = TUNING.SUNORB_HEATAURA

    inst:AddComponent("follower")
    inst:DoPeriodicTask(2, TryDefendLeader)
    inst:DoPeriodicTask(0.1, OrbitLeader)
    inst:ListenForEvent("phasechanged", function(src, phase) OnOrbitPhaseChanged(inst, phase) end, TheWorld)
    OnOrbitPhaseChanged(inst, TheWorld.state.phase)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGsunorb")
    inst:SetBrain(require("brains/sunorbbrain"))

    return inst
end

return Prefab("sunorb", fn, assets, prefabs)
