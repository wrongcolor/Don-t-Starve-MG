local assets =
{
    -- Build "pig_house" reaproveitado do jogo base, sem asset próprio necessário.
}

local function onhammered(inst)
    if inst.components.lootdropper ~= nil then
        inst.components.lootdropper:DropLoot()
    end
    inst:Remove()
end

local function OnSave(inst, data)
    data.interiorID = inst.interiorID
end

local function OnLoad(inst, data)
    if data and data.interiorID then
        inst.interiorID = data.interiorID
    end
end

local function EnsureInterior(inst)
    if inst.interiorID ~= nil then
        TheWorld.components.interiorspawner:AddDoor(inst, {
            my_door_id = inst.prefab .. "_door",
            target_door_id = inst.interiorID .. "_exit",
            target_interior = inst.interiorID,
        })
        return
    end

    local id = TheWorld.components.interiorspawner:GetNewID()
    inst.interiorID = id

    local exterior_door_def = {
        my_door_id = inst.prefab .. "_door",
        target_door_id = id .. "_exit",
        target_interior = id,
    }
    TheWorld.components.interiorspawner:AddDoor(inst, exterior_door_def)
    TheWorld.components.interiorspawner:CreateRoom({
        width = TUNING.ROOM_TINY_WIDTH,
        depth = TUNING.ROOM_TINY_DEPTH,
        group_id = id,
        roomindex = id,
        interior_coordinate_x = 0,
        interior_coordinate_y = 0,
        walltexture = "levels/textures/interiors/shop_wall_woodwall.tex",
        floortexture = "levels/textures/noise_woodfloor.tex",
        minimaptexture = "levels/textures/map_interior/mini_floor_wood.tex",
        colour_cube = "images/colour_cubes/pigshop_interior_cc.tex",
        footstep_tile = WORLD_TILES.WOODFLOOR,
        playerroom = true,
        addprops = {
            {
                name = "prop_door",
                x_offset = 5,
                z_offset = 0,
                animdata = { bank = "pig_shop_doormats", build = "pig_shop_doormats", anim = "idle_old", background = true },
                my_door_id = exterior_door_def.target_door_id,
                target_door_id = exterior_door_def.my_door_id,
                is_exit = true,
            },
        },
        exits = {},
    })
end

local prefabs = {}

local function fn()
    local inst = CreateEntity()

    inst.entity:AddTransform()
    inst.entity:AddAnimState()
    inst.entity:AddNetwork()

    MakeObstaclePhysics(inst, 0.5) -- ajuste o raio conforme o tamanho real da estrutura

    inst.AnimState:SetBank("pig_house")
    inst.AnimState:SetBuild("pig_house")
    inst.AnimState:PlayAnimation("idle")

    inst:AddTag("structure")

    inst.entity:SetPristine()
    if not TheWorld.ismastersim then
        return inst
    end

    inst:AddComponent("inspectable")

    inst:AddComponent("lootdropper")
    inst.components.lootdropper:AddChancedLoot("boards", 0.5)

    inst:AddComponent("workable")
    inst.components.workable:SetWorkAction(ACTIONS.HAMMER)
    inst.components.workable:SetWorkLeft(4)
    inst.components.workable:SetOnFinishCallback(onhammered)

    inst:AddComponent("door")

    inst.OnSave = OnSave
    inst.OnLoad = OnLoad
    inst:DoTaskInTime(0, function() EnsureInterior(inst) end)

    return inst
end

return Prefab("hideawayhut", fn, assets, prefabs)
