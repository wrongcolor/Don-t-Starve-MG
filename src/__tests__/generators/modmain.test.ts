import { describe, it, expect } from 'vitest'
import { generateModMain } from '../../generators/modmain'
import { sampleProject, sampleCharacter } from '../fixtures'
import type { ModProject } from '../../types/modProject'

const projectWithCharacter: ModProject = { ...sampleProject, characters: [sampleCharacter] }

describe('generateModMain', () => {
  const code = generateModMain(projectWithCharacter)

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

  // Confirmed against scripts/simutil.lua's GetInventoryItemAtlas — see
  // modmain.ts's comment for the "Could not find region... from atlas
  // 'images/inventoryimages4.xml'" warning this fixes (Asset("ATLAS"/"IMAGE")
  // alone loads the file but doesn't make the inventory-slot widget find it).
  it('registers a custom-icon item\'s atlas via GLOBAL.RegisterInventoryItemAtlas', () => {
    const withCustomIcon = {
      ...sampleProject,
      items: [{ ...sampleProject.items[0], hasCustomIcon: true }, ...sampleProject.items.slice(1)],
    }
    const customIconCode = generateModMain(withCustomIcon)
    expect(customIconCode).toContain('GLOBAL.RegisterInventoryItemAtlas("images/inventoryimages/testsword.xml", "testsword.tex")')
  })

  it('does not register anything when no item has a custom icon', () => {
    expect(code).not.toContain('RegisterInventoryItemAtlas')
  })

  it('registers every character with AddModCharacter and its gender', () => {
    expect(code).toContain('AddModCharacter("testchar", "NEUTRAL")')
  })

  it('wires up character strings and speech require', () => {
    expect(code).toContain('STRINGS.CHARACTER_TITLES.testchar = "the tester"')
    expect(code).toContain('STRINGS.CHARACTERS.TESTCHAR = require("speech_testchar")')
  })

  // Confirmed against a real published character mod's modmain.lua
  // (e00dan/naruto-dont-starve-together) — see characterPortraitAssets.
  it('declares a top-level Assets table with the bigportrait/avatar ATLAS entries for a vanilla-sourced character', () => {
    expect(code).toContain('Assets = {')
    expect(code).toContain('Asset("ATLAS", "bigportraits/testchar.xml")')
    expect(code).toContain('Asset("ATLAS", "images/avatars/avatar_testchar.xml")')
  })

  it('does not declare a top-level Assets table when no character has any (custom-sourced, no portrait assets to preload)', () => {
    const noPortraitProject = { ...sampleProject, characters: [{ ...sampleProject.characters[0], animation: undefined }] }
    const noPortraitCode = generateModMain(noPortraitProject)
    expect(noPortraitCode).not.toContain('Assets = {')
  })

  describe('mana HUD (docs/dst-knowledge/patterns.md#61)', () => {
    const mageProject = {
      ...projectWithCharacter,
      characters: [{ ...projectWithCharacter.characters[0], mana: { max: 100, regenPerSecond: 2 } }],
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

    // Reproduced in-game: item.ts's spellbook checkenabled needs to read the
    // caster's CURRENT mana from a CLIENT-side context (the wheel widget),
    // where `.components.mana` never exists — checking that field there
    // always fell through to "no component, allow it" and never actually
    // blocked casting a spell with insufficient mana. This netvar (deliberately
    // NOT prefixed by the character's own id, unlike testchar_mana_percent
    // above) mirrors the raw current amount so any item can check it without
    // knowing which CharacterDef(s) exist in the project.
    it('mirrors the raw current mana into a plain, non-character-prefixed netvar for item.ts\'s checkenabled to read', () => {
      expect(mageCode).toContain('inst.mana_current = GLOBAL.net_float(inst.GUID, "mana.current", "manacurrentdirty")')
      expect(mageCode).toContain('inst.mana_current:set(inst.components.mana.current)')
      expect(mageCode).toContain('OnTestcharManaUpdate(inst)')
    })
  })

  it('sets TUNING values for a character with backstab', () => {
    const rogueProject = {
      ...projectWithCharacter,
      characters: [{ ...projectWithCharacter.characters[0], backstab: { multiplier: 3, arcDegrees: 90 } }],
    }
    const rogueCode = generateModMain(rogueProject)
    expect(rogueCode).toContain('GLOBAL.TUNING.TESTCHAR_BACKSTAB_MULT = 3')
    expect(rogueCode).toContain('GLOBAL.TUNING.TESTCHAR_BACKSTAB_ARC = 90')
  })

  it('does not set backstab TUNING values when backstab is not set', () => {
    expect(code).not.toContain('BACKSTAB')
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
      ...projectWithCharacter,
      items: [{ ...projectWithCharacter.items[0], weapon: { ...projectWithCharacter.items[0].weapon!, meleeRange: 3 } }],
    }
    const meleeRangeCode = generateModMain(withMeleeRange)
    expect(meleeRangeCode).toContain('GLOBAL.TUNING.TESTSWORD_MELEE_RANGE = 3')
    expect(meleeRangeCode).not.toContain('_MIN_RANGE')
  })

  it('lists the herd manager prefab and sets its TUNING values when a creature has a herd (patterns.md#27)', () => {
    const withHerd = {
      ...projectWithCharacter,
      creatures: [
        { ...projectWithCharacter.creatures[0], herd: { maxSize: 8, gatherRange: 40, spawnIntervalDays: { min: 4, max: 6 } } },
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
      ...projectWithCharacter,
      items: [{ ...projectWithCharacter.items[3], finiteuses: undefined, rechargeable: { cooldownSeconds: 30 } }],
    }
    const rechargeCode = generateModMain(withRecharge)
    expect(rechargeCode).toContain('GLOBAL.TUNING.TESTFIRESTAFF_COOLDOWN = 30')
  })

  it('does not wire the Combine action when no item is combinable (patterns.md#19)', () => {
    expect(code).not.toContain('COMBINE_ITEM')
  })

  it('sets TUNING values (keyed to the cloud id) and lists the cloud prefab for a tameBomb item', () => {
    const withTameBomb = {
      ...projectWithCharacter,
      items: [{ ...projectWithCharacter.items[1], id: 'testtamebomb', tameBomb: { radius: 4, cloudDurationSeconds: 10, tameDurationSeconds: 60 } }],
    }
    const tameBombCode = generateModMain(withTameBomb)
    expect(tameBombCode).toContain('GLOBAL.TUNING.TESTTAMEBOMB_CLOUD_RADIUS = 4')
    expect(tameBombCode).toContain('GLOBAL.TUNING.TESTTAMEBOMB_CLOUD_DURATION = 10')
    expect(tameBombCode).toContain('GLOBAL.TUNING.TESTTAMEBOMB_CLOUD_TAME_DURATION = 60')
    expect(tameBombCode).toContain('"testtamebomb_cloud"')
  })

  it('sets TUNING values (keyed to the smoke cloud id) and lists the smoke cloud prefab for a smokeBomb item', () => {
    const withSmokeBomb = {
      ...projectWithCharacter,
      items: [{ ...projectWithCharacter.items[1], id: 'testsmokebomb', smokeBomb: { radius: 5, cloudDurationSeconds: 8 } }],
    }
    const smokeBombCode = generateModMain(withSmokeBomb)
    expect(smokeBombCode).toContain('GLOBAL.TUNING.TESTSMOKEBOMB_SMOKE_RADIUS = 5')
    expect(smokeBombCode).toContain('GLOBAL.TUNING.TESTSMOKEBOMB_SMOKE_DURATION = 8')
    expect(smokeBombCode).toContain('"testsmokebomb_smoke"')
  })

  it('sets TUNING values (keyed to the item id) for a groundAttack item, omitting WALL_COUNT when wallCount is 0', () => {
    const withGroundAttack = {
      ...projectWithCharacter,
      items: [{ ...projectWithCharacter.items[1], id: 'testgroundattack', groundAttack: { spikeCount: 5, wallCount: 0, radius: 6 } }],
    }
    const groundAttackCode = generateModMain(withGroundAttack)
    expect(groundAttackCode).toContain('GLOBAL.TUNING.TESTGROUNDATTACK_SPIKE_COUNT = 5')
    expect(groundAttackCode).toContain('GLOBAL.TUNING.TESTGROUNDATTACK_RADIUS = 6')
    expect(groundAttackCode).not.toContain('WALL_COUNT')
  })

  it('sets TUNING values for a creature groundAttack, including its own cooldown', () => {
    const withGroundAttack = {
      ...projectWithCharacter,
      creatures: [{ ...projectWithCharacter.creatures[0], groundAttack: { spikeCount: 5, wallCount: 2, radius: 6, cooldownSeconds: 20 } }],
    }
    const groundAttackCode = generateModMain(withGroundAttack)
    expect(groundAttackCode).toContain('GLOBAL.TUNING.TESTMOB_SPIKE_COUNT = 5')
    expect(groundAttackCode).toContain('GLOBAL.TUNING.TESTMOB_WALL_COUNT = 2')
    expect(groundAttackCode).toContain('GLOBAL.TUNING.TESTMOB_RADIUS = 6')
    expect(groundAttackCode).toContain('GLOBAL.TUNING.TESTMOB_GROUNDATTACK_COOLDOWN = 20')
  })

  it('sets TUNING values for a creature squadAlert', () => {
    const withSquadAlert = {
      ...projectWithCharacter,
      creatures: [{ ...projectWithCharacter.creatures[0], squadAlert: { range: 30 } }],
    }
    const squadAlertCode = generateModMain(withSquadAlert)
    expect(squadAlertCode).toContain('GLOBAL.TUNING.TESTMOB_SQUADALERT_RANGE = 30')
  })

  it('sets TUNING values for a creature light, dividing the 0-255 colour into 0-1 floats (patterns.md#65)', () => {
    const withLight = {
      ...projectWithCharacter,
      creatures: [{ ...projectWithCharacter.creatures[0], light: { radius: 12, intensity: 0.8, falloff: 0.8, colour: { r: 250, g: 149, b: 18 } } }],
    }
    const lightCode = generateModMain(withLight)
    expect(lightCode).toContain('GLOBAL.TUNING.TESTMOB_LIGHT_RADIUS = 12')
    expect(lightCode).toContain('GLOBAL.TUNING.TESTMOB_LIGHT_FALLOFF = 0.8')
    expect(lightCode).toContain('GLOBAL.TUNING.TESTMOB_LIGHT_INTENSITY = 0.8')
    expect(lightCode).toContain(`GLOBAL.TUNING.TESTMOB_LIGHT_COLOUR_R = ${250 / 255}`)
    expect(lightCode).toContain(`GLOBAL.TUNING.TESTMOB_LIGHT_COLOUR_G = ${149 / 255}`)
    expect(lightCode).toContain(`GLOBAL.TUNING.TESTMOB_LIGHT_COLOUR_B = ${18 / 255}`)
  })

  it('sets TUNING values for a day spawner structure', () => {
    const withSpawner = {
      ...projectWithCharacter,
      structures: [{ ...projectWithCharacter.structures[0], daySpawner: { prefab: 'deerclops', chance: 0.1, range: 40 } }],
    }
    const spawnerCode = generateModMain(withSpawner)
    expect(spawnerCode).toContain('GLOBAL.TUNING.TESTSTRUCTURE_SPAWN_CHANCE = 0.1')
    expect(spawnerCode).toContain('GLOBAL.TUNING.TESTSTRUCTURE_SPAWN_RANGE = 40')
  })

  it('sets TUNING values for a resident structure (components/spawner.lua)', () => {
    const withResident = {
      ...projectWithCharacter,
      structures: [{ ...projectWithCharacter.structures[0], resident: { prefab: 'pigman', respawnDelayDays: 2 } }],
    }
    const residentCode = generateModMain(withResident)
    expect(residentCode).toContain('GLOBAL.TUNING.TESTSTRUCTURE_RESPAWN_DELAY = TUNING.TOTAL_DAY_TIME * 2')
  })

  it('sets TUNING values for a rest station structure (components/sleepingbag.lua)', () => {
    const withRestStation = {
      ...projectWithCharacter,
      structures: [
        { ...projectWithCharacter.structures[0], restStation: { sleepPhase: 'night' as const, healthPerTick: 1, hungerPerTick: -1, sanityPerTick: 1 } },
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
      ...projectWithCharacter,
      structures: [
        {
          ...projectWithCharacter.structures[0],
          restStation: { sleepPhase: 'day' as const, healthPerTick: 2, hungerPerTick: -1, sanityPerTick: 1, maxUses: 15 },
        },
      ],
    }
    const usesCode = generateModMain(withMaxUses)
    expect(usesCode).toContain('GLOBAL.TUNING.TESTSTRUCTURE_USES = 15')
  })

  describe('deployMode: deployableItem (Original/scripts/recipes.lua Recipe2("portablecookpot_item", ...))', () => {
    const portableProject = {
      ...projectWithCharacter,
      structures: [
        { ...projectWithCharacter.structures[0], id: 'testportable', deployMode: 'deployableItem' as const, animation: { source: 'custom' as const } },
      ],
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
      ...projectWithCharacter,
      items: projectWithCharacter.items.map((item, i) => (i === 0 ? { ...item, combinable: true } : item)),
    }
    const combinedCode = generateModMain(withCombinable)
    expect(combinedCode).toContain('AddAction("COMBINE_ITEM", "Combine", function(act)')
    expect(combinedCode).toContain('AddComponentAction("USEITEM", "inventoryitem", function(inst, doer, target, actions, right)')
    expect(combinedCode).toContain('AddStategraphActionHandler("wilson", ActionHandler(ACTIONS.COMBINE_ITEM, "dolongaction"))')
    // Emitted once, not once per item.
    expect(combinedCode.split('AddAction("COMBINE_ITEM"').length - 1).toBe(1)
  })

  it('wires the solar battery charge action once when at least one item has solarBattery, draining into a solarfueled target or the wielder\'s own mana', () => {
    const withBattery = {
      ...projectWithCharacter,
      items: projectWithCharacter.items.map((item, i) =>
        i === 0 ? { ...item, solarBattery: { maxCharge: 200, chargePerSecondInSunlight: 0.5 } } : item,
      ),
    }
    const batteryCode = generateModMain(withBattery)
    expect(batteryCode).toContain('AddAction("CHARGE_SOLAR", "Charge", function(act)')
    expect(batteryCode).toContain('act.target.components.fueled ~= nil and act.target:HasTag("solarfueled")')
    expect(batteryCode).toContain('return act.invobject:DrainIntoTarget(act.target)')
    expect(batteryCode).toContain('return act.invobject:DrainIntoMana(act.doer)')
    expect(batteryCode).toContain('AddComponentAction("USEITEM", "inventoryitem", function(inst, doer, target, actions, right)')
    expect(batteryCode).toContain('if right and inst:HasTag("solarprism") then')
    expect(batteryCode).toContain('AddStategraphActionHandler("wilson", ActionHandler(ACTIONS.CHARGE_SOLAR, "doshortaction"))')
    expect(batteryCode.split('AddAction("CHARGE_SOLAR"').length - 1).toBe(1)
  })

  // Reproduced in-game: the user wanted the staff's own action button (while
  // equipped) to open the spell wheel, not just a right-click-in-inventory
  // action — but componentactions.lua's real "spellbook" handler only exists
  // under INVENTORY, never EQUIPPED. AddComponentAction adds this without
  // touching the base game's own tables (same real API combineActionBlock
  // already uses above).
  it('wires an EQUIPPED spellbook action once when at least one item has a spellbook (sampleProject already has testspellbook)', () => {
    expect(code).toContain('AddComponentAction("EQUIPPED", "spellbook", function(inst, doer, target, actions, right)')
    expect(code).toContain('if target == doer then')
    expect(code).toContain('table.insert(actions, ACTIONS.USESPELLBOOK)')
    expect(code).toContain('table.insert(actions, ACTIONS.CLOSESPELLBOOK)')
  })

  it('does not emit the EQUIPPED spellbook action twice even with two spellbook items', () => {
    const withTwoSpellbooks = {
      ...sampleProject,
      items: [
        ...sampleProject.items,
        {
          ...sampleProject.items[0],
          id: 'testspellbookitem2',
          spellbook: { source: 'static' as const, spells: [{ label: 'A', summonPrefab: 'x' }, { label: 'B', summonPrefab: 'y' }] },
        },
      ],
    }
    const spellbookCode = generateModMain(withTwoSpellbooks)
    expect(spellbookCode.split('AddComponentAction("EQUIPPED", "spellbook"').length - 1).toBe(1)
  })

  it('does not wire the EQUIPPED spellbook action when no item has a spellbook', () => {
    const noSpellbook = { ...sampleProject, items: sampleProject.items.filter((item) => item.spellbook === undefined) }
    expect(generateModMain(noSpellbook)).not.toContain('"spellbook"')
  })

  // Confirmed real APIs (docs/dst-knowledge/patterns.md#74): an item that's
  // both a container and a spellbook caster can't offer "open" and "cast"
  // through the same click — the real action picker only ever runs the
  // single highest-priority collected action, and USESPELLBOOK's priority
  // (2) always beats the real container action RUMMAGE's (-1). Alt+click
  // wins that race instead via a brand-new, higher-priority OPENCODEX action.
  it('wires an Alt+click OPENCODEX action once when at least one item is both a container and a spellbook', () => {
    const withCodex = {
      ...sampleProject,
      items: [
        {
          ...sampleProject.items[0],
          id: 'testcodexstaff',
          container: { source: 'own' as const, widget: { source: 'vanilla' as const, reusePrefab: 'treasurechest' }, sideWidget: false },
          spellbook: { source: 'linkedContainer' as const, containerItemId: 'testcodexstaff' },
        },
        ...sampleProject.items.slice(1),
      ],
    }
    const codexCode = generateModMain(withCodex)
    expect(codexCode).toContain('local OPENCODEX_ACTION = AddAction("OPENCODEX", "Open", function(act)')
    expect(codexCode).toContain('targ.components.container:Open(act.doer)')
    expect(codexCode).toContain('OPENCODEX_ACTION.priority = 3')
    expect(codexCode).toContain('AddComponentAction("INVENTORY", "container", function(inst, doer, actions, right)')
    expect(codexCode).toContain('if TheInput:IsKeyDown(KEY_ALT) then')
    expect(codexCode.split('AddAction("OPENCODEX"').length - 1).toBe(1)
  })

  it('does not wire the OPENCODEX action when no item is both a container and a spellbook', () => {
    expect(code).not.toContain('OPENCODEX')
  })

  // Confirmed real APIs (docs/dst-knowledge/patterns.md#73): mirrors the
  // real Vault Orb pair — STARTSPELLPORTAL is a normal right-click action
  // (needs AddComponentAction("SCENE", ...), since the portal is a placed
  // creature, not a carried item), while SPELLPORTAL_MAP is map_only = true
  // and only ever offered by the map screen itself once a bufferedmapaction
  // is pending, so it needs no componentaction/AddStategraphActionHandler
  // of its own.
  it('wires both portal actions once when at least one creature has mapPortal', () => {
    const withPortal = {
      ...projectWithCharacter,
      creatures: projectWithCharacter.creatures.map((creature, i) =>
        i === 0 ? { ...creature, behavior: 'passive' as const, mapPortal: true } : creature,
      ),
    }
    const portalCode = generateModMain(withPortal)
    expect(portalCode).toContain('AddAction("STARTSPELLPORTAL", "Open Map", function(act)')
    expect(portalCode).toContain('return act.target.components.spellportalteleporter:StartMapAction(act.doer)')
    expect(portalCode).toContain('AddAction("SPELLPORTAL_MAP", "Teleport", function(act)')
    expect(portalCode).toContain('return target.components.spellportalteleporter:Activate(act.doer, x, z)')
    expect(portalCode).toContain('SPELLPORTAL_MAP_ACTION.map_only = true')
    expect(portalCode).toContain('SPELLPORTAL_MAP_ACTION.closes_map = true')
    expect(portalCode).toContain('AddComponentAction("SCENE", "spellportalteleporter", function(inst, doer, actions, right)')
    expect(portalCode.split('AddAction("SPELLPORTAL_MAP"').length - 1).toBe(1)
    expect(portalCode.split('AddAction("STARTSPELLPORTAL"').length - 1).toBe(1)
  })

  it('does not wire the portal actions when no creature has mapPortal', () => {
    expect(code).not.toContain('SPELLPORTAL_MAP')
    expect(code).not.toContain('STARTSPELLPORTAL')
  })

  it('does not require the containers module when no item is a container (patterns.md#20)', () => {
    expect(code).not.toContain('require("containers")')
  })

  it('wires containers.params for a vanilla-widget container by cloning an existing container (patterns.md#20)', () => {
    const withContainer = {
      ...projectWithCharacter,
      items: [
        ...projectWithCharacter.items,
        {
          ...projectWithCharacter.items[0],
          id: 'testbag',
          container: { source: 'own' as const, widget: { source: 'vanilla' as const, reusePrefab: 'sacred_chest' }, sideWidget: true },
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
      ...projectWithCharacter,
      items: [
        ...projectWithCharacter.items,
        {
          ...projectWithCharacter.items[0],
          id: 'testcustombag',
          container: {
            source: 'own' as const,
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
      ...projectWithCharacter,
      items: [
        ...projectWithCharacter.items,
        {
          ...projectWithCharacter.items[0],
          id: 'testtoolbox',
          container: {
            source: 'own' as const,
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

  it('does not register containers.params for a pocketDimension container — its widget is already defined by the base game', () => {
    const withVoidBag = {
      ...projectWithCharacter,
      items: [
        ...projectWithCharacter.items,
        {
          ...projectWithCharacter.items[0],
          id: 'testvoidbag',
          container: { source: 'pocketDimension' as const, dimension: 'shadow' as const },
        },
      ],
    }
    const code = generateModMain(withVoidBag)
    expect(code).not.toContain('params.testvoidbag')
    expect(code).not.toContain('local containers = require("containers")')
  })

  describe('World events', () => {
    const duskAmbush = {
      id: 'testduskambush',
      displayName: 'Test Dusk Ambush',
      description: 'Spawns a mob group at dusk',
      trigger: { kind: 'phaseChange' as const, phase: 'dusk' as const },
      chance: 0.3,
      spawnRadius: 20,
      spawnGroup: [{ prefabId: 'testmob', count: { min: 2, max: 4 } }],
      loot: [{ prefab: 'monstermeat', chance: 0.5 }],
    }

    it('sets TUNING values (chance + radius) for a world event', () => {
      const code = generateModMain({ ...projectWithCharacter, worldEvents: [duskAmbush] })
      expect(code).toContain('GLOBAL.TUNING.TESTDUSKAMBUSH_CHANCE = 0.3')
      expect(code).toContain('GLOBAL.TUNING.TESTDUSKAMBUSH_RADIUS = 20')
    })

    it('wires PickRandomOnlinePlayer once when a world-scoped trigger is used, and not otherwise', () => {
      const code = generateModMain({ ...projectWithCharacter, worldEvents: [duskAmbush] })
      expect(code).toContain('local function PickRandomOnlinePlayer()')

      const noWorldEventsCode = generateModMain(projectWithCharacter)
      expect(noWorldEventsCode).not.toContain('PickRandomOnlinePlayer')
    })
  })
})
