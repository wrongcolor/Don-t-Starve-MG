local assets =
{
    -- Build "researchlab" reaproveitado do jogo base, sem asset próprio necessário.
}

local function fn()
    return MakePlacer("deerclopsalarm_placer", "researchlab", "researchlab", "idle")
end

return Prefab("deerclopsalarm_placer", fn, assets)
