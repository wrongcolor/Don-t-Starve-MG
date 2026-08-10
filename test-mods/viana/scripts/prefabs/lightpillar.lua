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
    local victims = TheSim:FindEntities(x, y, z, 6, SENTRY_TAGS)
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

    inst.Light:SetRadius(TUNING.LIGHTPILLAR_LIGHT_RADIUS)
    inst.Light:SetFalloff(TUNING.LIGHTPILLAR_LIGHT_FALLOFF)
    inst.Light:SetIntensity(TUNING.LIGHTPILLAR_LIGHT_INTENSITY)
    inst.Light:SetColour(TUNING.LIGHTPILLAR_LIGHT_COLOUR_R, TUNING.LIGHTPILLAR_LIGHT_COLOUR_G, TUNING.LIGHTPILLAR_LIGHT_COLOUR_B)
    inst.Light:Enable(true)

    inst:AddTag("animal")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.LIGHTPILLAR_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.LIGHTPILLAR_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.LIGHTPILLAR_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.LIGHTPILLAR_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)
    inst:DoPeriodicTask(0.2, SentryTick)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGlightpillar")
    inst:SetBrain(require("brains/lightpillarbrain"))

    return inst
end

return Prefab("lightpillar", fn, assets, prefabs)
