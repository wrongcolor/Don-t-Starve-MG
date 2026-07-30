local assets =
{
    Asset("ANIM", "anim/wormholegate.zip"), -- PLACEHOLDER: mesmo build da estrutura, ver README
}

local function fn()
    return MakePlacer("wormholegate_placer", "wormholegate", "wormholegate", "idle")
end

return Prefab("wormholegate_placer", fn, assets)
