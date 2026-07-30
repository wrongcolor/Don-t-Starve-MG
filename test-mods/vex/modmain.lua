local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "vex", "skilltree_vex" }

-- Characters: tuning + strings + registration
GLOBAL.TUNING.VEX_HEALTH = 100
GLOBAL.TUNING.VEX_HUNGER = 100
GLOBAL.TUNING.VEX_SANITY = 250
STRINGS.CHARACTER_TITLES.vex = "the pyromancer"
STRINGS.CHARACTER_NAMES.vex = "Vex"
STRINGS.CHARACTER_DESCRIPTIONS.vex = "A wanderer who bent fire to her will, and now can't always control it."
STRINGS.CHARACTER_QUOTES.vex = "The fire listens, if you ask nicely."
STRINGS.CHARACTERS.VEX = require("speech_vex")
AddModCharacter("vex", "FEMALE")

-- Skill trees (docs/dst-knowledge/patterns.md#28)
local skilltree_defs = require("prefabs/skilltree_defs")
local vex_skilltree_data = require("prefabs/skilltree_vex")(skilltree_defs.FN)
skilltree_defs.CreateSkillTreeFor("vex", vex_skilltree_data.SKILLS)
skilltree_defs.SKILLTREE_ORDERS["vex"] = vex_skilltree_data.ORDERS
