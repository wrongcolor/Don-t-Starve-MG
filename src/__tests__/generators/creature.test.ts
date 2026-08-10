import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { generateCreatureFiles, generateCreaturePrefab } from '../../generators/creature'
import { generateStategraph } from '../../generators/stategraph'
import { sampleProject } from '../fixtures'
import type { CreatureDef } from '../../types/modProject'

describe('generateCreatureFiles', () => {
  const [creature, spiderMob, hound] = sampleProject.creatures

  it('produces prefab, stategraph and brain files with matching require paths', () => {
    const files = generateCreatureFiles(creature)
    expect(Object.keys(files).sort()).toEqual(
      ['scripts/prefabs/testmob.lua', 'scripts/stategraphs/SGtestmob.lua', 'scripts/brains/testmobbrain.lua'].sort(),
    )
    const prefab = files['scripts/prefabs/testmob.lua']
    expect(prefab).toContain('inst:SetStateGraph("SGtestmob")')
    expect(prefab).toContain('inst:SetBrain(require("brains/testmobbrain"))')
  })

  it('checks TheWorld.ismastersim before adding server components', () => {
    const code = generateCreaturePrefab(creature)
    const ismastersimIdx = code.indexOf('if not TheWorld.ismastersim then')
    const healthIdx = code.indexOf('inst:AddComponent("health")')
    expect(ismastersimIdx).toBeGreaterThan(-1)
    expect(healthIdx).toBeGreaterThan(ismastersimIdx)
  })

  it('tags hostile creatures as monster+hostile', () => {
    const code = generateCreaturePrefab(creature)
    expect(code).toContain('inst:AddTag("monster")')
    expect(code).toContain('inst:AddTag("hostile")')
  })

  it('adds chanced loot drops', () => {
    const code = generateCreaturePrefab(creature)
    expect(code).toContain('inst.components.lootdropper:AddChancedLoot("monstermeat", 1)')
  })

  it('escapes quotes in loot prefabs and tags so they cannot break out of the Lua string', () => {
    const malicious = {
      ...creature,
      tags: ['a" ) end -- '],
      loot: [{ prefab: 'x") end --', chance: 1 }],
    }
    const code = generateCreaturePrefab(malicious)
    expect(code).toContain('inst:AddTag("a\\" ) end -- ")')
    expect(code).toContain('inst.components.lootdropper:AddChancedLoot("x\\") end --", 1)')
    expect(code).not.toContain('inst:AddTag("a" ) end -- ")')
  })

  it('builds a custom build named after the creature id when animation is explicitly custom', () => {
    const customBuildCreature: CreatureDef = { ...creature, animation: { source: 'custom' } }
    const code = generateCreaturePrefab(customBuildCreature)
    expect(code).toContain('Asset("ANIM", "anim/testmob.zip")')
    expect(code).toContain('inst.AnimState:SetBank("testmob")')
    expect(code).toContain('inst.AnimState:SetBuild("testmob")')
    expect(code).toContain('inst.AnimState:PlayAnimation("idle")')
  })

  it('defaults to the vanilla pigman build (no Asset needed) when no animation is chosen at all', () => {
    const noAnimation: CreatureDef = { ...creature, animation: undefined }
    const code = generateCreaturePrefab(noAnimation)
    expect(code).not.toContain('Asset("ANIM"')
    expect(code).toContain('inst.AnimState:SetBank("pigman")')
    expect(code).toContain('inst.AnimState:SetBuild("pigman")')
  })

  it('reuses a vanilla build without declaring an ANIM asset when animation.source is vanilla', () => {
    const code = generateCreaturePrefab(spiderMob)
    expect(code).not.toContain('Asset("ANIM"')
    expect(code).toContain('inst.AnimState:SetBank("spider")')
    expect(code).toContain('inst.AnimState:SetBuild("spider")')
  })

  it('reuses an Island Adventures - Shipwrecked build without declaring an ANIM asset, and labels it correctly in a comment', () => {
    const withIslandAdventures: CreatureDef = {
      ...spiderMob,
      animation: {
        source: 'islandAdventuresShipwrecked',
        build: 'wildbore_build',
        clips: { idle: 'idle_loop', walk: 'walk_loop', atk: 'atk', hit: 'hit', death: 'death' },
      },
    }
    const code = generateCreaturePrefab(withIslandAdventures)
    expect(code).not.toContain('Asset("ANIM"')
    expect(code).toContain('inst.AnimState:SetBank("wildbore_build")')
    expect(code).toContain('inst.AnimState:SetBuild("wildbore_build")')
    expect(code).toContain('Build "wildbore_build" reaproveitado do mod "Island Adventures - Shipwrecked"')
  })

  it('uses a separate bank (animation skeleton) from the build (visual skin) when bank is set', () => {
    const withSeparateBank: CreatureDef = {
      ...spiderMob,
      animation: {
        source: 'islandAdventuresShipwrecked',
        build: 'wildbore_build',
        bank: 'pigman',
        clips: { idle: 'idle', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' },
      },
    }
    const code = generateCreaturePrefab(withSeparateBank)
    expect(code).toContain('inst.AnimState:SetBank("pigman")')
    expect(code).toContain('inst.AnimState:SetBuild("wildbore_build")')
  })

  it('threads the same vanilla clip names into the generated stategraph', () => {
    const withCustomClips = {
      ...spiderMob,
      animation: {
        source: 'vanilla' as const,
        build: 'spider',
        clips: { idle: 'idle', walk: 'walk', atk: 'atk_pre', hit: 'hit', death: 'death' },
      },
    }
    const sg = generateStategraph(withCustomClips)
    expect(sg).toContain('inst.AnimState:PlayAnimation("atk_pre")')
    expect(sg).not.toContain('inst.AnimState:PlayAnimation("atk")')
  })

  it('escapes quotes in custom animation clip names', () => {
    const malicious = {
      ...spiderMob,
      animation: {
        source: 'vanilla' as const,
        build: 'spider',
        clips: { idle: 'idle" ) end -- ', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' },
      },
    }
    const code = generateCreaturePrefab(malicious)
    expect(code).toContain('inst.AnimState:PlayAnimation("idle\\" ) end -- ")')
  })

  it('defaults attack range to 2 unless attackRange is set', () => {
    expect(generateCreaturePrefab(creature)).toContain('inst.components.combat:SetRange(2)')

    const code = generateCreaturePrefab(hound)
    expect(code).toContain('inst.components.combat:SetRange(TUNING.TESTHOUND_ATTACK_RANGE)')
    expect(code).not.toContain('SetRange(2)')
  })

  it('wires a sanity aura when sanityAura is set', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('sanityaura')

    const code = generateCreaturePrefab(hound)
    expect(code).toContain('inst:AddComponent("sanityaura")')
    expect(code).toContain('inst.components.sanityaura.aura = TUNING.TESTHOUND_SANITYAURA')
  })

  it('wires flammable/freezable susceptibility when set', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('MakeMediumBurnableCharacter')

    const code = generateCreaturePrefab(hound)
    expect(code).toContain('MakeMediumBurnableCharacter(inst, "body")')
    expect(code).toContain('MakeMediumFreezableCharacter(inst, "body")')
  })

  it('wires the cookable component when set', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('cookable')

    const code = generateCreaturePrefab(hound)
    expect(code).toContain('inst:AddComponent("cookable")')
    expect(code).toContain('inst.components.cookable.product = "cookedsmallmeat"')
  })

  it('wires herdmember + generates a second herd manager prefab when herd is set (patterns.md#27)', () => {
    const herdCreature: CreatureDef = {
      ...creature,
      herd: { maxSize: 8, gatherRange: 40, spawnIntervalDays: { min: 4, max: 6 } },
    }
    expect(generateCreatureFiles(creature)['scripts/prefabs/testmobherd.lua']).toBeUndefined()

    const files = generateCreatureFiles(herdCreature)
    expect(Object.keys(files).sort()).toEqual(
      [
        'scripts/prefabs/testmob.lua',
        'scripts/prefabs/testmobherd.lua',
        'scripts/stategraphs/SGtestmob.lua',
        'scripts/brains/testmobbrain.lua',
      ].sort(),
    )

    const mainCode = files['scripts/prefabs/testmob.lua']
    expect(mainCode).toContain('inst:AddComponent("herdmember")')
    expect(mainCode).toContain('inst.components.herdmember:SetHerdPrefab("testmobherd")')
    expect(mainCode).toContain('inst:AddTag("testmob")')

    const herdCode = files['scripts/prefabs/testmobherd.lua']
    expect(herdCode).toContain('inst:AddComponent("herd")')
    expect(herdCode).toContain('inst.components.herd:SetMemberTag("testmob")')
    expect(herdCode).toContain('inst.components.herd:SetMaxSize(TUNING.TESTMOBHERD_MAX_SIZE)')
    expect(herdCode).toContain('inst.components.herd:SetOnEmptyFn(inst.Remove)')
    expect(herdCode).toContain('inst:AddComponent("periodicspawner")')
    expect(herdCode).toContain('inst.components.periodicspawner:SetPrefab("testmob")')
    expect(herdCode).not.toContain('AddNetwork')
    expect(herdCode).not.toContain('ismastersim')

    expect(() => parse(herdCode, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires the hauntable component when "haunted" is a panic cause (patterns.md#46-51)', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('hauntable')

    const hauntableCreature: CreatureDef = { ...creature, panicCauses: ['haunted'] }
    expect(generateCreaturePrefab(hauntableCreature)).toContain('inst:AddComponent("hauntable")')
  })

  it('wires worker/inventory components for a companion creature\'s chopTrees/collectItems tasks', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('worker')
    expect(generateCreaturePrefab(creature)).not.toContain('inventory')

    const chopper: CreatureDef = { ...creature, companion: { followDistance: 5, tasks: ['chopTrees'] } }
    const chopCode = generateCreaturePrefab(chopper)
    expect(chopCode).toContain('inst:AddComponent("worker")')
    expect(chopCode).toContain('inst.components.worker:SetAction(ACTIONS.CHOP, 1)')
    expect(chopCode).not.toContain('inst:AddComponent("inventory")')

    const collector: CreatureDef = { ...creature, companion: { followDistance: 5, tasks: ['collectItems'] } }
    const collectCode = generateCreaturePrefab(collector)
    expect(collectCode).toContain('inst:AddComponent("inventory")')
    expect(collectCode).not.toContain('inst:AddComponent("worker")')
  })

  it('wires worker/inventory components for a resident worker\'s chopTrees/mineRocks/harvestFarm jobs', () => {
    const miner: CreatureDef = { ...creature, work: { tasks: ['mineRocks'] } }
    const minerCode = generateCreaturePrefab(miner)
    expect(minerCode).toContain('inst:AddComponent("worker")')
    expect(minerCode).toContain('inst.components.worker:SetAction(ACTIONS.MINE, 1)')
    expect(minerCode).toContain('inst:AddComponent("inventory")')

    const farmer: CreatureDef = { ...creature, work: { tasks: ['harvestFarm'] } }
    const farmerCode = generateCreaturePrefab(farmer)
    expect(farmerCode).toContain('inst:AddComponent("inventory")')
    expect(farmerCode).not.toContain('inst:AddComponent("worker")')

    const lumberjack: CreatureDef = { ...creature, work: { tasks: ['chopTrees'] } }
    const lumberjackCode = generateCreaturePrefab(lumberjack)
    expect(lumberjackCode).toContain('inst.components.worker:SetAction(ACTIONS.CHOP, 1)')
    expect(lumberjackCode).toContain('inst:AddComponent("inventory")')
  })

  it('wires a periodic TryDepositAtHome task that hands off inventory items to the home structure\'s container, for any resident worker', () => {
    const lumberjack: CreatureDef = { ...creature, work: { tasks: ['chopTrees'] } }
    const code = generateCreaturePrefab(lumberjack)
    expect(code).toContain('local function TryDepositAtHome(inst)')
    expect(code).toContain('local home = inst.components.homeseeker ~= nil and inst.components.homeseeker.home or nil')
    expect(code).toContain('home.components.container:GiveItem(removed)')
    expect(code).toContain('inst:DoPeriodicTask(3, TryDepositAtHome)')
  })

  it('does not wire TryDepositAtHome for a companion (only resident workers have a home to deposit at)', () => {
    const chopper: CreatureDef = { ...creature, companion: { followDistance: 5, tasks: ['chopTrees'] } }
    expect(generateCreaturePrefab(chopper)).not.toContain('TryDepositAtHome')
  })

  it('wires a follower component and a periodic leader-assignment task when companion.defendLeader is set', () => {
    const guard: CreatureDef = {
      ...creature,
      behavior: 'neutral',
      companion: { followDistance: 5, tasks: [], defendLeader: true },
    }
    const code = generateCreaturePrefab(guard)
    expect(code).toContain('local function TryDefendLeader(inst)')
    expect(code).toContain('local leader = FindClosestPlayerToInst(inst, 30, true)')
    expect(code).toContain('inst.components.follower:SetLeader(leader)')
    expect(code).toContain('inst:AddComponent("follower")')
    expect(code).toContain('inst:DoPeriodicTask(2, TryDefendLeader)')
  })

  it('sets the creature invincible via the real health component flag when invincible is set', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('SetInvincible')

    const orb: CreatureDef = { ...creature, invincible: true }
    const code = generateCreaturePrefab(orb)
    expect(code).toContain('inst.components.health:SetInvincible(true)')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('wires a heater component when heatAura is set', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('heater')

    const warm: CreatureDef = { ...creature, heatAura: 40 }
    const code = generateCreaturePrefab(warm)
    expect(code).toContain('inst:AddComponent("heater")')
    expect(code).toContain('inst.components.heater.heat = TUNING.TESTMOB_HEATAURA')
  })

  it('wires a follower component and its own OrbitLeader periodic task when companion.orbit is set, even without defendLeader', () => {
    const orbiter: CreatureDef = {
      ...creature,
      behavior: 'neutral',
      companion: { followDistance: 5, tasks: [], orbit: { radius: 3, degreesPerSecond: 45 } },
    }
    const code = generateCreaturePrefab(orbiter)
    expect(code).toContain('inst:AddComponent("follower")')
    expect(code).toContain('inst:DoPeriodicTask(2, TryDefendLeader)')
    expect(code).toContain('local function OrbitLeader(inst)')
    expect(code).toContain('if inst.components.combat ~= nil and inst.components.combat:HasTarget() then')
    expect(code).toContain('local orbitx = x + 3 * math.cos(inst._orbitangle)')
    expect(code).toContain('local orbitz = z + 3 * math.sin(inst._orbitangle)')
    expect(code).toContain('inst.Transform:SetPosition(orbitx, 0, orbitz)')
    expect(code).toContain('inst:DoPeriodicTask(0.1, OrbitLeader)')
    expect(code).not.toContain('ORBIT_CONTACT_TAGS')
    expect(code).not.toContain('OnOrbitPhaseChanged')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('deals contact damage to nearby hostiles while orbiting, varying by time of day via a real "phasechanged" listener', () => {
    const orbiter: CreatureDef = {
      ...creature,
      behavior: 'neutral',
      companion: {
        followDistance: 5,
        tasks: [],
        orbit: { radius: 3, degreesPerSecond: 45, contactDamage: { day: 25, dusk: 15, night: 10 } },
      },
    }
    const code = generateCreaturePrefab(orbiter)
    expect(code).toContain('local ORBIT_CONTACT_TAGS = { "hostile" }')
    expect(code).toContain('if inst.components.combat ~= nil and not inst.components.combat:InCooldown() then')
    expect(code).toContain('local victims = TheSim:FindEntities(orbitx, 0, orbitz, 1.5, ORBIT_CONTACT_TAGS)')
    expect(code).toContain('inst.components.combat:StartAttack()')
    expect(code).toContain('inst.components.combat:DoAttack(victim)')
    expect(code).toContain('local function OnOrbitPhaseChanged(inst, phase)')
    expect(code).toContain('inst.components.combat:SetDefaultDamage(25)')
    expect(code).toContain('inst.components.combat:SetDefaultDamage(15)')
    expect(code).toContain('inst.components.combat:SetDefaultDamage(10)')
    expect(code).toContain('inst:ListenForEvent("phasechanged", function(src, phase) OnOrbitPhaseChanged(inst, phase) end, TheWorld)')
    expect(code).toContain('OnOrbitPhaseChanged(inst, TheWorld.state.phase)')
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  // Confirmed against Original/stategraphs/stategraphs/SGantlion_angry.lua's
  // SpawnSpikes/SpawnBlocks — reuses the real sandspike_*/sandblock hazard
  // prefabs, fired periodically (not frame-perfect stategraph timing like the
  // real Antlion) while the creature has a combat target.
  it('wires a periodic ground attack (sandspike/sandblock) while the creature has a combat target', () => {
    const spiky: CreatureDef = { ...creature, groundAttack: { spikeCount: 5, wallCount: 2, radius: 6, cooldownSeconds: 20 } }
    const code = generateCreaturePrefab(spiky)
    expect(code).toContain('local function dogroundattack(pos)')
    expect(code).toContain('for i = 1, TUNING.TESTMOB_SPIKE_COUNT do')
    expect(code).toContain('SpawnPrefab("sandspike_" .. SPIKE_SIZES[math.random(#SPIKE_SIZES)]).Transform:SetPosition(pos.x + offset.x, 0, pos.z + offset.z)')
    expect(code).toContain('for i = 1, TUNING.TESTMOB_WALL_COUNT do')
    expect(code).toContain('SpawnPrefab("sandblock").Transform:SetPosition(pos.x + offset.x, 0, pos.z + offset.z)')
    expect(code).toContain('local function TryGroundAttack(inst)')
    expect(code).toContain('if inst.components.combat:HasTarget() then')
    expect(code).toContain('dogroundattack(Vector3(x, y, z))')
    expect(code).toContain('inst:DoPeriodicTask(TUNING.TESTMOB_GROUNDATTACK_COOLDOWN, TryGroundAttack)')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('omits the wall loop entirely when wallCount is 0', () => {
    const spikesOnly: CreatureDef = { ...creature, groundAttack: { spikeCount: 5, wallCount: 0, radius: 6, cooldownSeconds: 20 } }
    const code = generateCreaturePrefab(spikesOnly)
    expect(code).not.toContain('sandblock')
    expect(code).not.toContain('WALL_COUNT')
  })

  it('does not wire a ground attack when it is not set', () => {
    const code = generateCreaturePrefab(creature)
    expect(code).not.toContain('dogroundattack')
    expect(code).not.toContain('TryGroundAttack')
  })

  // Confirmed against Original/prefabs/prefabs/primemate.lua's OnAttacked (the
  // pirate monkey crew): getting hit calls combat:SuggestTarget(attacker) on
  // nearby creatures sharing this prefab's own id as a tag.
  it('wires a squad alert that pulls in nearby idle allies when this creature is attacked', () => {
    const alerter: CreatureDef = { ...creature, squadAlert: { range: 30 } }
    const code = generateCreaturePrefab(alerter)
    expect(code).toContain('local SQUAD_ALERT_TAGS = { "testmob" }')
    expect(code).toContain('local function OnAttacked(inst, data)')
    expect(code).toContain('inst.components.combat:SetTarget(data.attacker)')
    expect(code).toContain('local allies = TheSim:FindEntities(x, y, z, TUNING.TESTMOB_SQUADALERT_RANGE, SQUAD_ALERT_TAGS)')
    expect(code).toContain('ally.components.combat:SuggestTarget(data.attacker)')
    expect(code).toContain('inst:ListenForEvent("attacked", OnAttacked)')
    expect(code).toContain('inst:AddTag("testmob")')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('does not wire a squad alert when it is not set', () => {
    const code = generateCreaturePrefab(creature)
    expect(code).not.toContain('SQUAD_ALERT_TAGS')
    expect(code).not.toContain('OnAttacked')
  })

  // Confirmed in Original/prefabs/prefabs/eyeturret.lua (docs/dst-knowledge/
  // patterns.md#70): a stationary attacker periodically scans a radius
  // around its own fixed position and fights whatever's "hostile"-tagged in
  // it — reusing the exact same proximity-scan + direct StartAttack/DoAttack
  // technique the orbit contact damage above already uses.
  it('wires a sentry that periodically scans and attacks nearby hostile creatures without moving', () => {
    const sentryCreature: CreatureDef = { ...creature, behavior: 'neutral', sentry: { radius: 6 } }
    const code = generateCreaturePrefab(sentryCreature)
    expect(code).toContain('local SENTRY_TAGS = { "hostile" }')
    expect(code).toContain('local function SentryTick(inst)')
    expect(code).toContain('if inst.components.combat == nil or inst.components.combat:InCooldown() then')
    expect(code).toContain('local victims = TheSim:FindEntities(x, y, z, 6, SENTRY_TAGS)')
    expect(code).toContain('inst.components.combat:StartAttack()')
    expect(code).toContain('inst.components.combat:DoAttack(victim)')
    expect(code).toContain('inst:DoPeriodicTask(0.2, SentryTick)')

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('does not wire a sentry when it is not set', () => {
    const code = generateCreaturePrefab(creature)
    expect(code).not.toContain('SENTRY_TAGS')
    expect(code).not.toContain('SentryTick')
  })

  it('wires a real Light component when light is set, but not otherwise (patterns.md#65)', () => {
    expect(generateCreaturePrefab(creature)).not.toContain('AddLight')
    expect(generateCreaturePrefab(creature)).not.toContain('inst.Light')

    const glowing: CreatureDef = { ...creature, light: { radius: 12, intensity: 0.8, falloff: 0.8, colour: { r: 250, g: 149, b: 18 } } }
    const code = generateCreaturePrefab(glowing)
    expect(code).toContain('inst.entity:AddLight()')
    expect(code).toContain('inst.Light:SetRadius(TUNING.TESTMOB_LIGHT_RADIUS)')
    expect(code).toContain('inst.Light:SetFalloff(TUNING.TESTMOB_LIGHT_FALLOFF)')
    expect(code).toContain('inst.Light:SetIntensity(TUNING.TESTMOB_LIGHT_INTENSITY)')
    expect(code).toContain('inst.Light:SetColour(TUNING.TESTMOB_LIGHT_COLOUR_R, TUNING.TESTMOB_LIGHT_COLOUR_G, TUNING.TESTMOB_LIGHT_COLOUR_B)')
    expect(code).toContain('inst.Light:Enable(true)')

    const addLightIdx = code.indexOf('inst.entity:AddLight()')
    const addNetworkIdx = code.indexOf('inst.entity:AddNetwork()')
    const pristineIdx = code.indexOf('inst.entity:SetPristine()')
    expect(addLightIdx).toBeGreaterThan(-1)
    expect(addLightIdx).toBeLessThan(addNetworkIdx)
    expect(code.indexOf('inst.Light:Enable(true)')).toBeLessThan(pristineIdx)

    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })
})
