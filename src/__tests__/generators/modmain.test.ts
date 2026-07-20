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
      items: [{ ...sampleProject.items[4], finiteuses: undefined, rechargeable: { cooldownSeconds: 30 } }],
    }
    const rechargeCode = generateModMain(withRecharge)
    expect(rechargeCode).toContain('GLOBAL.TUNING.TESTFIRESTAFF_COOLDOWN = 30')
  })

  it('does not wire the Combine action when no item is combinable (patterns.md#19)', () => {
    expect(code).not.toContain('COMBINE_ITEM')
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
