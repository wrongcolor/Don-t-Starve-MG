local Badge = require("widgets/badge")

local ManaBadge = Class(Badge, function(self, owner)
    Badge._ctor(self, nil, owner, { 0.3, 0.5, 1, 1 }, nil, nil, nil, true)
end)

return ManaBadge
