local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "raidmonkey" }

-- Creatures: tuning + strings
GLOBAL.TUNING.RAIDMONKEY_HEALTH = 100
GLOBAL.TUNING.RAIDMONKEY_DAMAGE = 20
GLOBAL.TUNING.RAIDMONKEY_ATTACK_PERIOD = 2
GLOBAL.TUNING.RAIDMONKEY_WALKSPEED = 5
GLOBAL.TUNING.RAIDMONKEY_SQUADALERT_RANGE = 30
STRINGS.NAMES.RAIDMONKEY = "Raid Monkey"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.RAIDMONKEY = "Never travels alone."

-- World events
GLOBAL.TUNING.MONKEYDUSKRAID_CHANCE = 0.3
GLOBAL.TUNING.MONKEYDUSKRAID_RADIUS = 20

local function PickRandomOnlinePlayer()
    local candidates = {}
    for _, v in ipairs(AllPlayers) do
        if not (v.components.health:IsDead() or v:HasTag("playerghost")) then
            table.insert(candidates, v)
        end
    end
    return #candidates > 0 and candidates[math.random(#candidates)] or nil
end


local function DoMonkeyduskraid(anchor)
    if math.random() > TUNING.MONKEYDUSKRAID_CHANCE then
        return
    end

    local x, y, z = anchor.Transform:GetWorldPosition()
    local offset = FindWalkableOffset(Vector3(x, y, z), math.random() * TWOPI, TUNING.MONKEYDUSKRAID_RADIUS, 12, true, false)
    if offset == nil then
        return
    end

    local px, py, pz = x + offset.x, y + offset.y, z + offset.z

    for i = 1, math.random(2, 4) do
        local spawned = SpawnPrefab("raidmonkey")
        if spawned ~= nil then
            spawned.Transform:SetPosition(px, py, pz)
        end
    end

    if math.random() <= 0.5 then
        local loot = SpawnPrefab("goldnugget")
        if loot ~= nil then
            loot.Transform:SetPosition(px, py, pz)
        end
    end
end

TheWorld:ListenForEvent("phasechanged", function(inst, data)
    if data.newphase == "dusk" then
        local player = PickRandomOnlinePlayer()
        if player ~= nil then
            DoMonkeyduskraid(player)
        end
    end
end)
