local assets =
{
    -- Build "flameball_fx" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

local SENTRY_TAGS = { "hostile" }

local function SentryTick(inst)
    if inst.components.combat == nil or inst.components.combat:InCooldown() then
        return
    end
    local x, y, z = inst.Transform:GetWorldPosition()
    local victims = TheSim:FindEntities(x, y, z, 8, SENTRY_TAGS)
    for _, victim in ipairs(victims) do
        if victim ~= inst and victim.components.health ~= nil and not victim.components.health:IsDead() then
            inst.components.combat:StartAttack()
            inst.components.combat:DoAttack(victim)
            break
        end
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

    inst.Light:SetRadius(TUNING.SOLARPILLAR_LIGHT_RADIUS)
    inst.Light:SetFalloff(TUNING.SOLARPILLAR_LIGHT_FALLOFF)
    inst.Light:SetIntensity(TUNING.SOLARPILLAR_LIGHT_INTENSITY)
    inst.Light:SetColour(TUNING.SOLARPILLAR_LIGHT_COLOUR_R, TUNING.SOLARPILLAR_LIGHT_COLOUR_G, TUNING.SOLARPILLAR_LIGHT_COLOUR_B)
    inst.Light:Enable(true)

    inst:AddTag("animal")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.SOLARPILLAR_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.SOLARPILLAR_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.SOLARPILLAR_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.SOLARPILLAR_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)
    inst:DoPeriodicTask(0.2, SentryTick)
    inst:DoTaskInTime(TUNING.SOLARPILLAR_EXPIRE_SECONDS, function(inst)
        if inst.components.health == nil or not inst.components.health:IsDead() then
            inst:Remove()
        end
    end)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGsolarpillar")
    inst:SetBrain(require("brains/solarpillarbrain"))

    return inst
end

return Prefab("solarpillar", fn, assets, prefabs)
