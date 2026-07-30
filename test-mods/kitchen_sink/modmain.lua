local require = GLOBAL.require
local STRINGS = GLOBAL.STRINGS
local TUNING = GLOBAL.TUNING
local TECH = GLOBAL.TECH
local Ingredient = GLOBAL.Ingredient

PrefabFiles = { "testsword", "testtrinket", "testaxe", "testfirestaff", "testarmor", "testfood", "testspellbook", "teststructure", "teststructure_placer", "testmob", "testspidermob", "testhound" }

-- Items: tuning + strings
GLOBAL.TUNING.TESTSWORD_DAMAGE = 34
GLOBAL.TUNING.TESTSWORD_USES = 150
STRINGS.NAMES.TESTSWORD = "Test Sword"
STRINGS.RECIPE_DESC.TESTSWORD = "A sword for testing"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTSWORD = "A sword for testing"
STRINGS.NAMES.TESTTRINKET = "Test Trinket"
STRINGS.RECIPE_DESC.TESTTRINKET = "A trinket reusing a vanilla build"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTTRINKET = "A trinket reusing a vanilla build"
GLOBAL.TUNING.TESTAXE_DAMAGE = 27
GLOBAL.TUNING.TESTAXE_USES = 100
STRINGS.NAMES.TESTAXE = "Test Axe"
STRINGS.RECIPE_DESC.TESTAXE = "A tool for testing"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTAXE = "A tool for testing"
GLOBAL.TUNING.TESTFIRESTAFF_DAMAGE = 0
GLOBAL.TUNING.TESTFIRESTAFF_SANITY_COST = 3
GLOBAL.TUNING.TESTFIRESTAFF_MIN_RANGE = 6
GLOBAL.TUNING.TESTFIRESTAFF_MAX_RANGE = 10
GLOBAL.TUNING.TESTFIRESTAFF_USES = 30
STRINGS.NAMES.TESTFIRESTAFF = "Test Fire Staff"
STRINGS.RECIPE_DESC.TESTFIRESTAFF = "A ranged magic weapon for testing"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTFIRESTAFF = "A ranged magic weapon for testing"
GLOBAL.TUNING.TESTARMOR_USES = 100
GLOBAL.TUNING.TESTARMOR_CONDITION = 450
GLOBAL.TUNING.TESTARMOR_ABSORPTION = 0.8
GLOBAL.TUNING.TESTARMOR_SANITY_LOSS_PERCENT = 0.5
STRINGS.NAMES.TESTARMOR = "Test Armor"
STRINGS.RECIPE_DESC.TESTARMOR = "A body armor for testing"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTARMOR = "A body armor for testing"
GLOBAL.TUNING.TESTFOOD_HEALTH = 3
GLOBAL.TUNING.TESTFOOD_HUNGER = 25
GLOBAL.TUNING.TESTFOOD_SANITY = -5
GLOBAL.TUNING.TESTFOOD_DAMAGE_BUFF_MULT = 0.25
GLOBAL.TUNING.TESTFOOD_DAMAGE_BUFF_DURATION = 120
STRINGS.NAMES.TESTFOOD = "Test Food"
STRINGS.RECIPE_DESC.TESTFOOD = "A food item for testing"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTFOOD = "A food item for testing"
STRINGS.NAMES.TESTSPELLBOOK = "Test Spellbook"
STRINGS.RECIPE_DESC.TESTSPELLBOOK = "An item with a spell wheel for testing"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTSPELLBOOK = "An item with a spell wheel for testing"

-- Items: recipes
AddRecipe2("testsword", { Ingredient("twigs", 2), Ingredient("flint", 1) }, TECH.SCIENCE_ONE, {
        image = "flint.tex",
    }, { "WEAPONS" })
AddRecipe2("testtrinket", { Ingredient("flint", 1) }, TECH.NONE, {
        image = "trinket_1.tex",
    }, { "TOOLS" })
AddRecipe2("testaxe", { Ingredient("twigs", 1), Ingredient("flint", 1) }, TECH.NONE, {
        image = "rocks.tex",
    }, { "TOOLS" })
AddRecipe2("testfirestaff", { Ingredient("nightmarefuel", 3) }, TECH.MAGIC_TWO, {
        image = "nightmarefuel.tex",
    }, { "MAGIC" })
AddRecipe2("testarmor", { Ingredient("log", 4) }, TECH.NONE, {
        image = "log.tex",
    }, { "ARMOUR" })
AddRecipe2("testfood", { Ingredient("monstermeat", 1) }, TECH.NONE, {
        image = "cutgrass.tex",
    }, { "COOKING" })
AddRecipe2("testspellbook", { Ingredient("nightmarefuel", 2) }, TECH.MAGIC_TWO, {
        image = "goldnugget.tex",
    }, { "MAGIC" })

-- Structures: tuning + strings
STRINGS.NAMES.TESTSTRUCTURE = "Test Structure"
STRINGS.RECIPE_DESC.TESTSTRUCTURE = "A structure for testing"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTSTRUCTURE = "A structure for testing"

-- Structures: recipes
AddRecipe2("teststructure", { Ingredient("boards", 4) }, TECH.NONE, {
        image = "treasurechest.tex",
        placer = "teststructure_placer",
    }, { "STRUCTURES" })

-- Creatures: tuning + strings
GLOBAL.TUNING.TESTMOB_HEALTH = 100
GLOBAL.TUNING.TESTMOB_DAMAGE = 20
GLOBAL.TUNING.TESTMOB_ATTACK_PERIOD = 2
GLOBAL.TUNING.TESTMOB_WALKSPEED = 4
STRINGS.NAMES.TESTMOB = "Test Mob"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTMOB = "A mob for testing"
GLOBAL.TUNING.TESTSPIDERMOB_HEALTH = 80
GLOBAL.TUNING.TESTSPIDERMOB_DAMAGE = 15
GLOBAL.TUNING.TESTSPIDERMOB_ATTACK_PERIOD = 2
GLOBAL.TUNING.TESTSPIDERMOB_WALKSPEED = 4
STRINGS.NAMES.TESTSPIDERMOB = "Test Spider Mob"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTSPIDERMOB = "A mob reusing a vanilla build"
GLOBAL.TUNING.TESTHOUND_HEALTH = 100
GLOBAL.TUNING.TESTHOUND_DAMAGE = 20
GLOBAL.TUNING.TESTHOUND_ATTACK_PERIOD = 2
GLOBAL.TUNING.TESTHOUND_WALKSPEED = 6
GLOBAL.TUNING.TESTHOUND_ATTACK_RANGE = 4
GLOBAL.TUNING.TESTHOUND_SANITYAURA = -10
STRINGS.NAMES.TESTHOUND = "Test Hound"
STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTHOUND = "A mob with combat/status effects for testing"
