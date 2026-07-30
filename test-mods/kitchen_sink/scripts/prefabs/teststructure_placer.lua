local assets =
{
    -- Build "treasurechest" reaproveitado do jogo base, sem asset próprio necessário.
}

local function fn()
    return MakePlacer("teststructure_placer", "treasurechest", "treasurechest", "idle")
end

return Prefab("teststructure_placer", fn, assets)
