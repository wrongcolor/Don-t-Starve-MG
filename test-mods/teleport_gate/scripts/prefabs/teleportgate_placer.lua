local assets =
{
    -- Build "wormhole" reaproveitado do jogo base, sem asset próprio necessário.
}

local function fn()
    return MakePlacer("teleportgate_placer", "wormhole", "wormhole", "idle")
end

return Prefab("teleportgate_placer", fn, assets)
