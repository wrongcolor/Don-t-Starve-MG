import { describe, it, expect } from 'vitest'
import { generateModMain } from '../../generators/modmain'
import { sampleProject } from '../fixtures'

describe('generateModMain', () => {
  const code = generateModMain(sampleProject)

  it('lists every prefab (including the placer) in PrefabFiles', () => {
    expect(code).toContain('PrefabFiles =')
    expect(code).toContain('"testsword"')
    expect(code).toContain('"teststructure"')
    expect(code).toContain('"teststructure_placer"')
    expect(code).toContain('"testchar"')
    expect(code).toContain('"testmob"')
  })

  it('uses AddRecipe2, not the deprecated AddRecipe', () => {
    expect(code).toContain('AddRecipe2(')
    expect(code).not.toContain('AddRecipe(')
  })

  it('passes recipe filters as a string array, not RECIPETABS', () => {
    expect(code).toContain('{ "WEAPONS" }')
    expect(code).not.toContain('RECIPETABS')
  })

  it('registers the placer prefab name in the recipe config for structures', () => {
    expect(code).toContain('placer = "teststructure_placer"')
  })

  it('registers every character with AddModCharacter and its gender', () => {
    expect(code).toContain('AddModCharacter("testchar", "NEUTRAL")')
  })

  it('wires up character strings and speech require', () => {
    expect(code).toContain('STRINGS.CHARACTER_TITLES.testchar = "the tester"')
    expect(code).toContain('STRINGS.CHARACTERS.TESTCHAR = require("speech_testchar")')
  })

  describe('mana HUD (docs/dst-knowledge/patterns.md#61)', () => {
    const mageProject = {
      ...sampleProject,
      characters: [{ ...sampleProject.characters[0], mana: { max: 100, regenPerSecond: 2 } }],
    }
    const mageCode = generateModMain(mageProject)

    it('requires the mana badge widget once and sets its TUNING values', () => {
      expect(mageCode).toContain('local ManaBadge = require("widgets/manabadge")')
      expect(mageCode).toContain('GLOBAL.TUNING.TESTCHAR_MANA_MAX = 100')
      expect(mageCode).toContain('GLOBAL.TUNING.TESTCHAR_MANA_REGEN = 2')
    })

    it('syncs a net_int off the manadelta event, filtered to this character\'s own prefab', () => {
      expect(mageCode).toContain('AddPlayerPostInit(TestcharPlayerPostInit)')
      expect(mageCode).toContain('if inst.prefab ~= "testchar" then')
      expect(mageCode).toContain('inst.testchar_mana_percent = GLOBAL.net_int(inst.GUID, "testchar.manapercent", "testchar_manaisdirty")')
      expect(mageCode).toContain('inst:ListenForEvent("manadelta", OnTestcharManaUpdate)')
    })

    it('injects a ManaBadge into widgets/statusdisplays, positioned relative to the real hunger badge field (self.stomach)', () => {
      expect(mageCode).toContain('AddClassPostConstruct("widgets/statusdisplays", TestcharStatusPostConstruct)')
      expect(mageCode).toContain('self.testcharmana = self:AddChild(ManaBadge(self.owner))')
      expect(mageCode).toContain('local stomachpos = self.stomach:GetPosition()')
    })

    it("passes the character's real TUNING max to SetPercent, not a hardcoded 100 (badge.lua's 2nd arg feeds the displayed number)", () => {
      expect(mageCode).toContain('self.testcharmana:SetPercent(percent, TUNING.TESTCHAR_MANA_MAX)')
    })

    it('does not wire any mana HUD code when no character has mana', () => {
      expect(code).not.toContain('ManaBadge')
      expect(code).not.toContain('AddPlayerPostInit')
    })
  })

  it('sets TUNING values for items, characters and creatures', () => {
    expect(code).toContain('GLOBAL.TUNING.TESTSWORD_DAMAGE = 34')
    expect(code).toContain('GLOBAL.TUNING.TESTCHAR_HEALTH = 150')
    expect(code).toContain('GLOBAL.TUNING.TESTMOB_HEALTH = 100')
  })

  it('sets TUNING hunger/health/sanity values for food items', () => {
    expect(code).toContain('GLOBAL.TUNING.TESTFOOD_HEALTH = 3')
    expect(code).toContain('GLOBAL.TUNING.TESTFOOD_HUNGER = 25')
    expect(code).toContain('GLOBAL.TUNING.TESTFOOD_SANITY = -5')
  })

  it('sets TUNING values for the on-eat damage buff', () => {
    expect(code).toContain('GLOBAL.TUNING.TESTFOOD_DAMAGE_BUFF_MULT = 0.25')
    expect(code).toContain('GLOBAL.TUNING.TESTFOOD_DAMAGE_BUFF_DURATION = 120')
  })

  it('sets TUNING for a melee weapon with a custom range, distinct from a ranged weapon\'s min/max range', () => {
    const withMeleeRange = {
      ...sampleProject,
      items: [{ ...sampleProject.items[0], weapon: { ...sampleProject.items[0].weapon!, meleeRange: 3 } }],
    }
    const meleeRangeCode = generateModMain(withMeleeRange)
    expect(meleeRangeCode).toContain('GLOBAL.TUNING.TESTSWORD_MELEE_RANGE = 3')
    expect(meleeRangeCode).not.toContain('_MIN_RANGE')
  })

  it('lists the herd manager prefab and sets its TUNING values when a creature has a herd (patterns.md#27)', () => {
    const withHerd = {
      ...sampleProject,
      creatures: [
        { ...sampleProject.creatures[0], herd: { maxSize: 8, gatherRange: 40, spawnIntervalDays: { min: 4, max: 6 } } },
      ],
    }
    const herdCode = generateModMain(withHerd)
    expect(herdCode).toContain('"testmobherd"')
    expect(herdCode).toContain('GLOBAL.TUNING.TESTMOBHERD_MAX_SIZE = 8')
    expect(herdCode).toContain('GLOBAL.TUNING.TESTMOBHERD_GATHER_RANGE = 40')
    expect(herdCode).toContain('GLOBAL.TUNING.TESTMOBHERD_SPAWN_MIN = TUNING.TOTAL_DAY_TIME * 4')
    expect(herdCode).toContain('GLOBAL.TUNING.TESTMOBHERD_SPAWN_MAX = TUNING.TOTAL_DAY_TIME * 6')
  })

  it('sets TUNING values for a rechargeable item (patterns.md#26)', () => {
    const withRecharge = {
      ...sampleProject,
      items: [{ ...sampleProject.items[3], finiteuses: undefined, rechargeable: { cooldownSeconds: 30 } }],
    }
    const rechargeCode = generateModMain(withRecharge)
    expect(rechargeCode).toContain('GLOBAL.TUNING.TESTFIRESTAFF_COOLDOWN = 30')
  })

  it('does not wire the Combine action when no item is combinable (patterns.md#19)', () => {
    expect(code).not.toContain('COMBINE_ITEM')
  })

  it('sets TUNING values (keyed to the cloud id) and lists the cloud prefab for a tameBomb item', () => {
    const withTameBomb = {
      ...sampleProject,
      items: [{ ...sampleProject.items[1], id: 'testtamebomb', tameBomb: { radius: 4, cloudDurationSeconds: 10, tameDurationSeconds: 60 } }],
    }
    const tameBombCode = generateModMain(withTameBomb)
    expect(tameBombCode).toContain('GLOBAL.TUNING.TESTTAMEBOMB_CLOUD_RADIUS = 4')
    expect(tameBombCode).toContain('GLOBAL.TUNING.TESTTAMEBOMB_CLOUD_DURATION = 10')
    expect(tameBombCode).toContain('GLOBAL.TUNING.TESTTAMEBOMB_CLOUD_TAME_DURATION = 60')
    expect(tameBombCode).toContain('"testtamebomb_cloud"')
  })

  it('sets TUNING values (keyed to the item id) for a groundAttack item, omitting WALL_COUNT when wallCount is 0', () => {
    const withGroundAttack = {
      ...sampleProject,
      items: [{ ...sampleProject.items[1], id: 'testgroundattack', groundAttack: { spikeCount: 5, wallCount: 0, radius: 6 } }],
    }
    const groundAttackCode = generateModMain(withGroundAttack)
    expect(groundAttackCode).toContain('GLOBAL.TUNING.TESTGROUNDATTACK_SPIKE_COUNT = 5')
    expect(groundAttackCode).toContain('GLOBAL.TUNING.TESTGROUNDATTACK_RADIUS = 6')
    expect(groundAttackCode).not.toContain('WALL_COUNT')
  })

  it('sets TUNING values for a creature groundAttack, including its own cooldown', () => {
    const withGroundAttack = {
      ...sampleProject,
      creatures: [{ ...sampleProject.creatures[0], groundAttack: { spikeCount: 5, wallCount: 2, radius: 6, cooldownSeconds: 20 } }],
    }
    const groundAttackCode = generateModMain(withGroundAttack)
    expect(groundAttackCode).toContain('GLOBAL.TUNING.TESTMOB_SPIKE_COUNT = 5')
    expect(groundAttackCode).toContain('GLOBAL.TUNING.TESTMOB_WALL_COUNT = 2')
    expect(groundAttackCode).toContain('GLOBAL.TUNING.TESTMOB_RADIUS = 6')
    expect(groundAttackCode).toContain('GLOBAL.TUNING.TESTMOB_GROUNDATTACK_COOLDOWN = 20')
  })

  it('sets TUNING values for a day spawner structure', () => {
    const withSpawner = {
      ...sampleProject,
      structures: [{ ...sampleProject.structures[0], daySpawner: { prefab: 'deerclops', chance: 0.1, range: 40 } }],
    }
    const spawnerCode = generateModMain(withSpawner)
    expect(spawnerCode).toContain('GLOBAL.TUNING.TESTSTRUCTURE_SPAWN_CHANCE = 0.1')
    expect(spawnerCode).toContain('GLOBAL.TUNING.TESTSTRUCTURE_SPAWN_RANGE = 40')
  })

  it('sets TUNING values for a resident structure (components/spawner.lua)', () => {
    const withResident = {
      ...sampleProject,
      structures: [{ ...sampleProject.structures[0], resident: { prefab: 'pigman', respawnDelayDays: 2 } }],
    }
    const residentCode = generateModMain(withResident)
    expect(residentCode).toContain('GLOBAL.TUNING.TESTSTRUCTURE_RESPAWN_DELAY = TUNING.TOTAL_DAY_TIME * 2')
  })

  it('sets TUNING values for a rest station structure (components/sleepingbag.lua)', () => {
    const withRestStation = {
      ...sampleProject,
      structures: [
        { ...sampleProject.structures[0], restStation: { sleepPhase: 'night' as const, healthPerTick: 1, hungerPerTick: -1, sanityPerTick: 1 } },
      ],
    }
    const restCode = generateModMain(withRestStation)
    expect(restCode).toContain('GLOBAL.TUNING.TESTSTRUCTURE_HEALTH_PER_TICK = 1')
    expect(restCode).toContain('GLOBAL.TUNING.TESTSTRUCTURE_HUNGER_PER_TICK = -1')
    expect(restCode).toContain('GLOBAL.TUNING.TESTSTRUCTURE_SANITY_PER_TICK = 1')
    expect(restCode).not.toContain('GLOBAL.TUNING.TESTSTRUCTURE_USES')
  })

  it('sets a USES tuning value only when the rest station has limited uses', () => {
    const withMaxUses = {
      ...sampleProject,
      structures: [
        {
          ...sampleProject.structures[0],
          restStation: { sleepPhase: 'day' as const, healthPerTick: 2, hungerPerTick: -1, sanityPerTick: 1, maxUses: 15 },
        },
      ],
    }
    const usesCode = generateModMain(withMaxUses)
    expect(usesCode).toContain('GLOBAL.TUNING.TESTSTRUCTURE_USES = 15')
  })

  describe('deployMode: deployableItem (Original/scripts/recipes.lua Recipe2("portablecookpot_item", ...))', () => {
    const portableProject = {
      ...sampleProject,
      structures: [{ ...sampleProject.structures[0], id: 'testportable', deployMode: 'deployableItem' as const }],
    }
    const portableCode = generateModMain(portableProject)

    it('lists the item prefab, not a placer, in PrefabFiles', () => {
      expect(portableCode).toContain('"testportable"')
      expect(portableCode).toContain('"testportable_item"')
      expect(portableCode).not.toContain('"testportable_placer"')
    })

    it('crafts straight to the item, with no placer field', () => {
      expect(portableCode).toContain('AddRecipe2("testportable_item"')
      expect(portableCode).not.toContain('placer = "testportable')
      expect(portableCode).toContain('atlas = "images/inventoryimages/testportable_item.xml"')
    })

    it('names both the item and the structure, but keys RECIPE_DESC to the crafted item', () => {
      expect(portableCode).toContain('STRINGS.NAMES.TESTPORTABLE = "Test Structure"')
      expect(portableCode).toContain('STRINGS.NAMES.TESTPORTABLE_ITEM = "Test Structure"')
      expect(portableCode).toContain('STRINGS.RECIPE_DESC.TESTPORTABLE_ITEM = "A structure for testing"')
      expect(portableCode).not.toContain('STRINGS.RECIPE_DESC.TESTPORTABLE =')
    })

    it('makes both the item and the placed structure inspectable (STRINGS.NAMES.PORTABLECOOKPOT_ITEM pair)', () => {
      expect(portableCode).toContain('STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTPORTABLE = "A structure for testing"')
      expect(portableCode).toContain('STRINGS.CHARACTERS.GENERIC.DESCRIBE.TESTPORTABLE_ITEM = "A structure for testing"')
    })
  })

  it('wires the Combine action once when at least one item is combinable', () => {
    const withCombinable = {
      ...sampleProject,
      items: sampleProject.items.map((item, i) => (i === 0 ? { ...item, combinable: true } : item)),
    }
    const combinedCode = generateModMain(withCombinable)
    expect(combinedCode).toContain('AddAction("COMBINE_ITEM", "Combine", function(act)')
    expect(combinedCode).toContain('AddComponentAction("USEITEM", "inventoryitem", function(inst, doer, target, actions, right)')
    expect(combinedCode).toContain('AddStategraphActionHandler("wilson", ActionHandler(ACTIONS.COMBINE_ITEM, "dolongaction"))')
    // Emitted once, not once per item.
    expect(combinedCode.split('AddAction("COMBINE_ITEM"').length - 1).toBe(1)
  })

  it('does not require the containers module when no item is a container (patterns.md#20)', () => {
    expect(code).not.toContain('require("containers")')
  })

  it('wires containers.params for a vanilla-widget container by cloning an existing container (patterns.md#20)', () => {
    const withContainer = {
      ...sampleProject,
      items: [
        ...sampleProject.items,
        {
          ...sampleProject.items[0],
          id: 'testbag',
          container: { widget: { source: 'vanilla' as const, reusePrefab: 'sacred_chest' }, sideWidget: true },
        },
      ],
    }
    const containerCode = generateModMain(withContainer)
    expect(containerCode).toContain('local containers = require("containers")')
    expect(containerCode).toContain('local params = containers.params')
    expect(containerCode).toContain('params.testbag = GLOBAL.deepcopy(containers.params["sacred_chest"])')
    expect(containerCode).toContain('params.testbag.issidewidget = true')
    expect(containerCode).toContain('params.testbag.type = "testbag"')
    expect(containerCode).toContain('containers.MAXITEMSLOTS = math.max(containers.MAXITEMSLOTS, #params.testbag.widget.slotpos)')
  })

  it('unrolls a custom container grid into exactly `slots` table.insert calls, and wires itemtestfn for acceptsTag', () => {
    const withCustomContainer = {
      ...sampleProject,
      items: [
        ...sampleProject.items,
        {
          ...sampleProject.items[0],
          id: 'testcustombag',
          container: {
            widget: { source: 'custom' as const, slots: 5, columns: 2 },
            sideWidget: false,
            acceptsTag: 'pocketwatch',
          },
        },
      ],
    }
    const containerCode = generateModMain(withCustomContainer)
    const insertCount = containerCode.split('table.insert(params.testcustombag.widget.slotpos').length - 1
    expect(insertCount).toBe(5)
    expect(containerCode).toContain('function params.testcustombag.itemtestfn(container, item, slot)')
    expect(containerCode).toContain('return item:HasTag("pocketwatch")')
  })

  it('ORs acceptsTag and acceptsPrefabs together in a single itemtestfn (patterns.md#20)', () => {
    const withBoth = {
      ...sampleProject,
      items: [
        ...sampleProject.items,
        {
          ...sampleProject.items[0],
          id: 'testtoolbox',
          container: {
            widget: { source: 'custom' as const, slots: 9, columns: 3 },
            sideWidget: false,
            acceptsTag: 'pocketwatch',
            acceptsPrefabs: ['sewing_tape', 'winona_remote'],
          },
        },
      ],
    }
    const code = generateModMain(withBoth)
    expect(code).toContain(
      'return item:HasTag("pocketwatch") or item.prefab == "sewing_tape" or item.prefab == "winona_remote"',
    )
  })
})
