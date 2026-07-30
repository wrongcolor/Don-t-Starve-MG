local assets =
{
    -- Build "pighouse" reaproveitado do jogo base, sem asset próprio necessário.
}

local function fn()
    return MakePlacer("residentden_placer", "pighouse", "pighouse", "idle")
end

return Prefab("residentden_placer", fn, assets)
