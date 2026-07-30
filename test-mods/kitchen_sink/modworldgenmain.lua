AddRoom("TestGrove", {
    value = WORLD_TILES.FOREST,
    tags = { "Town" },
    contents = {
        countprefabs = {
            ["pighouse"] = function() return 1 + math.random(3) end,
        },
        distributepercent = 0.1,
        distributeprefabs = {
            ["grass"] = 0.05,
        },
        countstaticlayouts = {
            ["TestGraveyard"] = 1,
        },
    },
})

AddTask("Test Island Shard", {
    locks = { LOCKS.NONE },
    keys_given = { KEYS.TIER1 },
    room_choices = {
        ["TestGrove"] = function() return 0 + math.random(3) end,
    },
    room_bg = WORLD_TILES.FOREST,
    colour = { r = 0, g = 1, b = 0, a = 1 },
    region_id = "testisland1", -- agrupa com outras Tasks do mesmo region_id numa ilha só (ver README)
})

AddTaskSetPreInitAny(function(self)
    if self.location == "forest" then
        table.insert(self.tasks, "Test Island Shard")
    end
end)

require("map/layouts").Layouts["TestGraveyard"] =
require("map/static_layout").Get("map/static_layouts/TestGraveyard", {
    layout_position = GLOBAL.LAYOUT_POSITION.CENTER,
    start_mask = GLOBAL.PLACE_MASK.IGNORE_IMPASSABLE_BARREN_RESERVED,
    fill_mask = GLOBAL.PLACE_MASK.IGNORE_IMPASSABLE_BARREN_RESERVED,
})
