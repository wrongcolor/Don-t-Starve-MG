local assets =
{
    -- Build "boomerang" reaproveitado do jogo base, sem asset próprio necessário.
}

local CHAIN_MUST_TAGS = { "_combat" }
local CHAIN_CANT_TAGS = { "INLIMBO", "player", "flying" }
local CHAIN_ONEOF_TAGS = { "hostile" }

local function FindNextChainTarget(inst)
    return FindEntity(inst, TUNING.SOLARCHAKRAM_PROJ_SEARCH_RADIUS, function(ent)
        return ent.components.health ~= nil and not ent.components.health:IsDead() and not inst._hit[ent]
    end, CHAIN_MUST_TAGS, CHAIN_CANT_TAGS, CHAIN_ONEOF_TAGS)
end

local function ReturnToOwner(inst)
    inst._returning = true
    inst.components.projectile:Stop()
    inst.Physics:ClearCollidesWith(COLLISION.LIMITS)
end

local function OnHit(inst, attacker, target)
    inst._hit[target] = true
    inst._hitcount = inst._hitcount + 1
    if inst._hitcount < TUNING.SOLARCHAKRAM_PROJ_MAX_CHAIN_HITS then
        local nexttarget = FindNextChainTarget(inst)
        if nexttarget ~= nil then
            inst.components.projectile:Throw(inst._weapon, nexttarget, inst._player)
            return
        end
    end
    ReturnToOwner(inst)
end

local function OnMiss(inst)
    ReturnToOwner(inst)
end

local function OnThrown(inst, owner, target, attacker)
    if inst._weapon == nil then
        inst._weapon = owner
        inst._player = attacker
        inst._hitcount = 0
        inst._hit = {}
        if inst._weapon.components.rechargeable ~= nil then
            inst._weapon.components.rechargeable:Discharge(999999)
        end
    end
end

local function OnRemoved(inst)
    if inst._weapon ~= nil and inst._weapon:IsValid() and inst._weapon.components.rechargeable ~= nil then
        inst._weapon.components.rechargeable:SetPercent(1)
    end
end

local function OnUpdate(inst, dt)
    if not inst._returning or inst._player == nil or not inst._player:IsValid() then
        return
    end
    local pos = inst:GetPosition()
    local targetpos = inst._player:GetPosition()
    if distsq(pos, targetpos) < 1 then
        inst:Remove()
        return
    end
    inst:FacePoint(targetpos)
    inst.Physics:SetMotorVel(TUNING.SOLARCHAKRAM_PROJ_SPEED, 0, 0)
end

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddSoundEmitter()
    inst.entity:AddNetwork()

    MakeProjectilePhysics(inst)

    inst.AnimState:SetBank("boomerang")
    inst.AnimState:SetBuild("boomerang")
    inst.AnimState:PlayAnimation("spin_loop", true)

    inst:AddTag("weapon")
    inst:AddTag("projectile")
    inst:AddTag("NOCLICK")
    inst:AddTag("NOBLOCK")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst.persists = false
    inst.OnRemoveEntity = OnRemoved

    inst:AddComponent("weapon")
    inst.components.weapon:SetDamage(TUNING.SOLARCHAKRAM_PROJ_DAMAGE)

    inst:AddComponent("projectile")
    inst.components.projectile:SetSpeed(TUNING.SOLARCHAKRAM_PROJ_SPEED)
    inst.components.projectile:SetRange(TUNING.SOLARCHAKRAM_PROJ_RANGE)
    inst.components.projectile:SetHoming(true)
    inst.components.projectile:SetOnThrownFn(OnThrown)
    inst.components.projectile:SetOnHitFn(OnHit)
    inst.components.projectile:SetOnMissFn(OnMiss)
    inst.components.projectile.has_damage_set = true

    inst:AddComponent("updatelooper")
    inst.components.updatelooper:AddOnUpdateFn(OnUpdate)

    return inst
end

return Prefab("solarchakram_proj", fn, assets)
