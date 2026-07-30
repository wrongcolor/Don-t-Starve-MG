local assets =
{
    -- Build "tent" reaproveitado do jogo base, sem asset próprio necessário.
}

local function fn()
    return MakePlacer("campbedroll_placer", "tent", "tent", "idle")
end

return Prefab("campbedroll_placer", fn, assets)
