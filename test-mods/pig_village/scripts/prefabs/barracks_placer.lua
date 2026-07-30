local assets =
{
    -- Build "pig_house" reaproveitado do jogo base, sem asset próprio necessário.
}

local function fn()
    return MakePlacer("barracks_placer", "pig_house", "pig_house", "idle")
end

return Prefab("barracks_placer", fn, assets)
