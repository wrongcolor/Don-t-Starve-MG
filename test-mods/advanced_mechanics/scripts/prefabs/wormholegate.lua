local assets =
{
    Asset("ANIM", "anim/wormholegate.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)
    Asset("INV_IMAGE", "wormholegate"),
}

local function onhammered(inst)
    if inst.components.lootdropper ~= nil then
        inst.components.lootdropper:DropLoot()
    end
    inst:Remove()
end

local function OnTeleportPairRemoved(inst)
    local siblings = GLOBAL.TELEPORT_PAIRS and GLOBAL.TELEPORT_PAIRS[inst.prefab]
    if siblings == nil then return end
    for i = #siblings, 1, -1 do
        if siblings[i] == inst then
            table.remove(siblings, i)
            break
        end
    end
end

local function LinkTeleportPair(inst)
    GLOBAL.TELEPORT_PAIRS = GLOBAL.TELEPORT_PAIRS or {}
    local siblings = GLOBAL.TELEPORT_PAIRS[inst.prefab]
    if siblings == nil then
        siblings = {}
        GLOBAL.TELEPORT_PAIRS[inst.prefab] = siblings
    end
    table.insert(siblings, inst)
    if #siblings % 2 == 0 then
        local a, b = siblings[#siblings - 1], siblings[#siblings]
        a.components.teleporter:Target(b)
        b.components.teleporter:Target(a)
    end
    inst:ListenForEvent("onremove", OnTeleportPairRemoved)
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeObstaclePhysics(inst, 0.5) -- ajuste o raio conforme o tamanho real da estrutura

    inst.AnimState:SetBank("wormholegate")
    inst.AnimState:SetBuild("wormholegate")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("structure")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")

    inst:AddComponent("lootdropper")

    inst:AddComponent("workable")
    inst.components.workable:SetWorkAction(ACTIONS.HAMMER)
    inst.components.workable:SetWorkLeft(4)
    inst.components.workable:SetOnFinishCallback(onhammered)

    inst:AddComponent("teleporter")
    LinkTeleportPair(inst)

    return inst
end

return Prefab("wormholegate", fn, assets, prefabs)
