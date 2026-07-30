local wilson_speech = require("speech_wilson")

local speech = setmetatable({}, { __index = wilson_speech })

-- Overrides customizados
speech["ANNOUNCE_COLD"] = "Cold is just fire that hasn't started yet."
speech["ANNOUNCE_HOT"] = "Now THIS I like."

return speech
