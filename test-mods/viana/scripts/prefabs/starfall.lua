local assets =
{
    Asset("ANIM", "anim/starfall.zip"),
}

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    inst.AnimState:SetBank("starfall")
    inst.AnimState:SetBuild("starfall")
    inst.AnimState:SetOrientation(ANIM_ORIENTATION.OnGround)
    inst.AnimState:SetLayer(LAYER_WORLD_BACKGROUND)
    inst.AnimState:SetSortOrder(3)

    inst:AddTag("FX")
    inst:AddTag("NOCLICK")

    inst.persists = false

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    return inst
end

return Prefab("starfall", fn, assets, prefabs)
