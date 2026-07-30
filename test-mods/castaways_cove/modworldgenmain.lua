AddRoom("CastawayShore", {
    value = WORLD_TILES.PEBBLEBEACH,
    contents = {
        countprefabs = {
            ["treasurechest"] = 1,
            ["rocks"] = function() return 2 + math.random(4) end,
        },
        distributepercent = 0.12,
        distributeprefabs = {
            ["goldnugget"] = 1,
            ["flint"] = 1,
            ["redgem"] = 0.3,
            ["bluegem"] = 0.3,
        },
    },
})

AddTask("Castaway's Cove", {
    locks = { LOCKS.NONE },
    keys_given = {  },
    room_choices = {
        ["CastawayShore"] = 1,
    },
    room_bg = WORLD_TILES.PEBBLEBEACH,
    colour = { r = 0, g = 0.6, b = 1, a = 1 },
    region_id = "castawayscove1", -- agrupa com outras Tasks do mesmo region_id numa ilha só (ver README)
})

AddTaskSetPreInitAny(function(self)
    if self.location == "forest" then
        table.insert(self.tasks, "Castaway's Cove")
    end
end)
