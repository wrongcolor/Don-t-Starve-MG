local wilson_speech = require("speech_wilson")

local speech = setmetatable({}, { __index = wilson_speech })

-- Overrides customizados
speech["ANNOUNCE_COLD"] = "It is cold, for science."

return speech
