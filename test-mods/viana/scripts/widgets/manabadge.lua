local Badge = require("widgets/badge")

local ManaBadge = Class(Badge, function(self, owner, tint)
    Badge._ctor(self, nil, owner, tint or { 0.3, 0.5, 1, 1 }, nil, nil, nil, true)
end)

return ManaBadge
