AddRoom("UShapeGrove", {
    value = WORLD_TILES.GRASS,
    contents = {
        countstaticlayouts = {
            ["UShapeCourtyard"] = 1,
        },
    },
})

AddTask("U-Shape Courtyard", {
    locks = { LOCKS.NONE },
    keys_given = {  },
    room_choices = {
        ["UShapeGrove"] = 1,
    },
    room_bg = WORLD_TILES.GRASS,
    colour = { r = 1, g = 0.8, b = 0, a = 1 },
    region_id = "ushapecourtyard1", -- agrupa com outras Tasks do mesmo region_id numa ilha só (ver README)
})

AddTaskSetPreInitAny(function(self)
    if self.location == "forest" then
        table.insert(self.tasks, "U-Shape Courtyard")
    end
end)

require("map/layouts").Layouts["UShapeCourtyard"] =
require("map/static_layout").Get("map/static_layouts/UShapeCourtyard", {
    layout_position = GLOBAL.LAYOUT_POSITION.CENTER,
    start_mask = GLOBAL.PLACE_MASK.IGNORE_IMPASSABLE_BARREN_RESERVED,
    fill_mask = GLOBAL.PLACE_MASK.IGNORE_IMPASSABLE_BARREN_RESERVED,
})
