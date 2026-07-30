local assets =
{
    -- Build "flameball_fx" reaproveitado do jogo base, sem asset próprio necessário.
}

local prefabs = {}

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

    inst.Light:SetRadius(TUNING.SUNWISP_LIGHT_RADIUS)
    inst.Light:SetFalloff(TUNING.SUNWISP_LIGHT_FALLOFF)
    inst.Light:SetIntensity(TUNING.SUNWISP_LIGHT_INTENSITY)
    inst.Light:SetColour(TUNING.SUNWISP_LIGHT_COLOUR_R, TUNING.SUNWISP_LIGHT_COLOUR_G, TUNING.SUNWISP_LIGHT_COLOUR_B)
    inst.Light:Enable(true)

    inst:AddTag("animal")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("locomotor")
    inst.components.locomotor.walkspeed = TUNING.SUNWISP_WALKSPEED

    inst:AddComponent("health")
    inst.components.health:SetMaxHealth(TUNING.SUNWISP_HEALTH)

    inst:AddComponent("combat")
    inst.components.combat:SetDefaultDamage(TUNING.SUNWISP_DAMAGE)
    inst.components.combat:SetAttackPeriod(TUNING.SUNWISP_ATTACK_PERIOD)
    inst.components.combat:SetRange(2)

    inst:AddComponent("inspectable")

    inst:SetStateGraph("SGsunwisp")
    inst:SetBrain(require("brains/sunwispbrain"))

    return inst
end

return Prefab("sunwisp", fn, assets, prefabs)
