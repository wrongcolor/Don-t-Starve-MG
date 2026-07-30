AddRoom("AlchemistGrove", {
    value = WORLD_TILES.GRASS,
    contents = {
        countprefabs = {
            ["prestihatitator"] = 1,
            ["treasurechest"] = 1,
        },
    },
})

AddTask("Alchemist Island", {
    locks = { LOCKS.NONE },
    keys_given = {  },
    room_choices = {
        ["AlchemistGrove"] = 1,
    },
    room_bg = WORLD_TILES.GRASS,
    colour = { r = 0, g = 1, b = 0, a = 1 },
    region_id = "alchemistisland1", -- agrupa com outras Tasks do mesmo region_id numa ilha só (ver README)
})

AddTaskSetPreInitAny(function(self)
    if self.location == "forest" then
        table.insert(self.tasks, "Alchemist Island")
    end
end)
