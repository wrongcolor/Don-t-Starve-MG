local assets =
{
    -- Build "pig_house" reaproveitado do jogo base, sem asset próprio necessário.
}

local function fn()
    return MakePlacer("quarry_placer", "pig_house", "pig_house", "idle")
end

return Prefab("quarry_placer", fn, assets)
