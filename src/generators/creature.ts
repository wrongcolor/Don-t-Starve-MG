import type { CreatureDef } from '../types/modProject'
import { luaString, sanitizeLuaComment, toUpperSnake } from './luaUtils'
import { generateStategraph } from './stategraph'
import { generateBrain } from './brain'
import { resolveCreatureAnimation, isVanillaCreatureAnimation, isIslandAdventuresShipwreckedAnimation } from './creatureAnimation'
import { groundAttackFunctionBlock } from './groundAttack'

function needsHerd(creature: CreatureDef): boolean {
  return creature.herd !== undefined
}

// Confirmed in a real published Workshop mod ("Seafellow", see
// docs/dst-knowledge/patterns.md#27) — a "herd" is a separate, non-networked
// manager entity (no AddNetwork/SetPristine, exactly like the source mod)
// that periodically spawns new members up to a max size.
export function generateHerdPrefab(creature: CreatureDef): string {
  const upper = toUpperSnake(creature.id)
  const lines: string[] = []

  lines.push(`local prefabs = { ${luaString(creature.id)} }`)
  lines.push('')
  lines.push('local function CanSpawn(inst)')
  lines.push('    return inst.components.herd ~= nil and not inst.components.herd:IsFull()')
  lines.push('end')
  lines.push('')
  lines.push('local function OnSpawned(inst, newent)')
  lines.push('    if inst.components.herd ~= nil then')
  lines.push('        inst.components.herd:AddMember(newent)')
  lines.push('    end')
  lines.push('end')
  lines.push('')
  lines.push('local function fn()')
  lines.push('    local inst = CreateEntity()')
  lines.push('')
  lines.push('    inst.entity:AddTransform()')
  lines.push('')
  lines.push('    inst:AddTag("herd")')
  lines.push('    inst:AddTag("NOBLOCK")')
  lines.push('    inst:AddTag("NOCLICK")')
  lines.push('')
  lines.push('    inst:AddComponent("herd")')
  lines.push(`    inst.components.herd:SetMemberTag(${luaString(creature.id)})`)
  lines.push(`    inst.components.herd:SetMaxSize(TUNING.${upper}HERD_MAX_SIZE)`)
  lines.push(`    inst.components.herd:SetGatherRange(TUNING.${upper}HERD_GATHER_RANGE)`)
  lines.push(`    inst.components.herd:SetUpdateRange(TUNING.${upper}HERD_GATHER_RANGE)`)
  lines.push('    inst.components.herd:SetOnEmptyFn(inst.Remove)')
  lines.push('    inst.components.herd.nomerging = true')
  lines.push('')
  lines.push('    inst:AddComponent("periodicspawner")')
  lines.push(`    inst.components.periodicspawner:SetRandomTimes(TUNING.${upper}HERD_SPAWN_MIN, TUNING.${upper}HERD_SPAWN_MAX)`)
  lines.push(`    inst.components.periodicspawner:SetPrefab(${luaString(creature.id)})`)
  lines.push('    inst.components.periodicspawner:SetOnSpawnFn(OnSpawned)')
  lines.push('    inst.components.periodicspawner:SetSpawnTestFn(CanSpawn)')
  lines.push('    inst.components.periodicspawner:SetOnlySpawnOffscreen(true)')
  lines.push('    inst.components.periodicspawner:Start()')
  lines.push('')
  lines.push('    return inst')
  lines.push('end')
  lines.push('')
  lines.push(`return Prefab(${luaString(creature.id + 'herd')}, fn, nil, prefabs)`)

  return lines.join('\n') + '\n'
}

function needsFollowerTracking(creature: CreatureDef): boolean {
  return creature.companion?.defendLeader === true || creature.companion?.orbit !== undefined
}

function defendLeaderFunctionBlock(): string[] {
  return [
    'local function TryDefendLeader(inst)',
    '    local leader = FindClosestPlayerToInst(inst, 30, true)',
    '    if leader ~= nil and inst.components.follower:GetLeader() ~= leader then',
    '        inst.components.follower:SetLeader(leader)',
    '    end',
    'end',
    '',
  ]
}

const ORBIT_CONTACT_RADIUS = 1.5
const ORBIT_TICK_PERIOD = 0.1

function needsOrbitContactDamage(creature: CreatureDef): boolean {
  return creature.companion?.orbit?.contactDamage !== undefined
}

function orbitLeaderFunctionBlock(creature: CreatureDef): string[] {
  const orbit = creature.companion!.orbit!
  const radiansPerTick = orbit.degreesPerSecond * (Math.PI / 180) * ORBIT_TICK_PERIOD
  const lines: string[] = []
  if (orbit.contactDamage !== undefined) {
    lines.push('local ORBIT_CONTACT_TAGS = { "hostile" }', '')
  }
  lines.push(
    'local function OrbitLeader(inst)',
    '    if inst.components.combat ~= nil and inst.components.combat:HasTarget() then',
    '        return',
    '    end',
    '    local leader = inst.components.follower ~= nil and inst.components.follower:GetLeader() or nil',
    '    if leader == nil or not leader:IsValid() then',
    '        return',
    '    end',
    `    inst._orbitangle = (inst._orbitangle or 0) + ${radiansPerTick}`,
    '    local x, y, z = leader.Transform:GetWorldPosition()',
    `    local orbitx = x + ${orbit.radius} * math.cos(inst._orbitangle)`,
    `    local orbitz = z + ${orbit.radius} * math.sin(inst._orbitangle)`,
    '    inst.Transform:SetPosition(orbitx, 0, orbitz)',
  )
  if (orbit.contactDamage !== undefined) {
    lines.push(
      '',
      '    if inst.components.combat ~= nil and not inst.components.combat:InCooldown() then',
      `        local victims = TheSim:FindEntities(orbitx, 0, orbitz, ${ORBIT_CONTACT_RADIUS}, ORBIT_CONTACT_TAGS)`,
      '        for _, victim in ipairs(victims) do',
      '            if victim ~= inst and victim.components.health ~= nil and not victim.components.health:IsDead() then',
      '                inst.components.combat:StartAttack()',
      '                inst.components.combat:DoAttack(victim)',
      '                break',
      '            end',
      '        end',
      '    end',
    )
  }
  lines.push('end', '')
  return lines
}

function orbitPhaseDamageFunctionBlock(creature: CreatureDef): string[] {
  const damage = creature.companion!.orbit!.contactDamage!
  return [
    'local function OnOrbitPhaseChanged(inst, phase)',
    '    if phase == "day" then',
    `        inst.components.combat:SetDefaultDamage(${damage.day})`,
    '    elseif phase == "dusk" then',
    `        inst.components.combat:SetDefaultDamage(${damage.dusk})`,
    '    else',
    `        inst.components.combat:SetDefaultDamage(${damage.night})`,
    '    end',
    'end',
    '',
  ]
}

const SENTRY_TICK_PERIOD = 0.2

// Confirmed in prefabs/eyeturret.lua (docs/dst-knowledge/patterns.md#70): a
// stationary attacker's OWN periodic scan decides who to hit, entirely
// outside the brain — reuses the exact same "hostile"-tag proximity search
// + direct StartAttack/DoAttack technique orbitLeaderFunctionBlock above
// already uses for contact damage, just centered on the sentry's own fixed
// position instead of an orbit path.
function sentryFunctionBlock(creature: CreatureDef): string[] {
  const radius = creature.sentry!.radius
  return [
    'local SENTRY_TAGS = { "hostile" }',
    '',
    'local function SentryTick(inst)',
    '    if inst.components.combat == nil or inst.components.combat:InCooldown() then',
    '        return',
    '    end',
    '    local x, y, z = inst.Transform:GetWorldPosition()',
    `    local victims = TheSim:FindEntities(x, y, z, ${radius}, SENTRY_TAGS)`,
    '    for _, victim in ipairs(victims) do',
    '        if victim ~= inst and victim.components.health ~= nil and not victim.components.health:IsDead() then',
    '            inst.components.combat:StartAttack()',
    '            inst.components.combat:DoAttack(victim)',
    '            break',
    '        end',
    '    end',
    'end',
    '',
  ]
}

export function needsMapActionCreature(creature: CreatureDef): boolean {
  return creature.mapPortal === true
}

// Confirmed against the real game scripts (components/vaultorbteleporter.lua,
// ACTIONS.VAULTORBTELEPORT_MAP/STARTVAULTORBTELEPORT in scripts/actions.lua,
// prefabs/bufferedmapaction.lua, PlayerController:PullUpMap — see
// docs/dst-knowledge/patterns.md#73): StartMapAction spawns the base game's
// own "bufferedmapaction" prefab and hands it to the target (this creature
// itself), which is what makes PullUpMap open the map automatically for
// that player — no UI code needed on our side. Activate then runs once the
// player actually clicks a point (see portalActionBlock in modmain.ts). No
// mana check here — unlike a spell that casts instantly, this creature was
// already paid for when the aimed spell that summoned it (see
// spellbookSpellSchema.aimed/summonPrefab) was cast.
function generateSpellPortalTeleporterComponent(): string {
  return [
    'local SpellPortalTeleporter = Class(function(self, inst)',
    '    self.inst = inst',
    '    self.bufferedmapaction = nil',
    '    self._onbufferedmapactionremoved = function()',
    '        self.bufferedmapaction = nil',
    '    end',
    'end)',
    '',
    'function SpellPortalTeleporter:OnRemoveFromEntity()',
    '    self:CancelMapAction()',
    'end',
    '',
    'function SpellPortalTeleporter:OnRemoveEntity()',
    '    self:CancelMapAction()',
    'end',
    '',
    'function SpellPortalTeleporter:StartMapAction(doer)',
    '    if self.bufferedmapaction ~= nil then',
    '        return false',
    '    end',
    '',
    '    self.bufferedmapaction = SpawnPrefab("bufferedmapaction")',
    '    self.inst:ListenForEvent("onremove", self._onbufferedmapactionremoved, self.bufferedmapaction)',
    '    self.bufferedmapaction:SetupMapAction(ACTIONS.SPELLPORTAL_MAP, self.inst, doer)',
    '    return true',
    'end',
    '',
    'function SpellPortalTeleporter:CancelMapAction()',
    '    if self.bufferedmapaction ~= nil then',
    '        self.bufferedmapaction:Remove()',
    '        self.bufferedmapaction = nil',
    '    end',
    'end',
    '',
    'function SpellPortalTeleporter:Activate(doer, x, z)',
    '    self:CancelMapAction()',
    '',
    '    if doer.Physics ~= nil then',
    '        doer.Physics:Teleport(x, 0, z)',
    '    else',
    '        doer.Transform:SetPosition(x, 0, z)',
    '    end',
    '',
    '    if doer.SoundEmitter ~= nil then',
    '        doer.SoundEmitter:PlaySound("dontstarve/common/teleportworm/swallow")',
    '    end',
    '',
    '    if doer.SnapCamera ~= nil then',
    '        doer:SnapCamera()',
    '    end',
    '',
    '    return true',
    'end',
    '',
    'return SpellPortalTeleporter',
    '',
  ].join('\n')
}

function squadAlertFunctionBlock(creature: CreatureDef): string[] {
  const upper = toUpperSnake(creature.id)
  return [
    `local SQUAD_ALERT_TAGS = { ${luaString(creature.id)} }`,
    '',
    'local function OnAttacked(inst, data)',
    '    inst.components.combat:SetTarget(data.attacker)',
    '',
    '    local x, y, z = inst.Transform:GetWorldPosition()',
    `    local allies = TheSim:FindEntities(x, y, z, TUNING.${upper}_SQUADALERT_RANGE, SQUAD_ALERT_TAGS)`,
    '    for _, ally in ipairs(allies) do',
    '        if ally ~= inst and ally.components.combat ~= nil then',
    '            ally.components.combat:SuggestTarget(data.attacker)',
    '        end',
    '    end',
    'end',
    '',
  ]
}

function depositAtHomeFunctionBlock(): string[] {
  return [
    'local function TryDepositAtHome(inst)',
    '    local home = inst.components.homeseeker ~= nil and inst.components.homeseeker.home or nil',
    '    if home == nil or home.components.container == nil or inst.components.inventory == nil then',
    '        return',
    '    end',
    '    if inst:GetDistanceSqToInst(home) > 16 then',
    '        return',
    '    end',
    '',
    '    local items = {}',
    '    inst.components.inventory:ForEachItem(function(item) table.insert(items, item) end)',
    '    for _, item in ipairs(items) do',
    '        if home.components.container:IsFull() then',
    '            break',
    '        end',
    '        local removed = inst.components.inventory:RemoveItem(item, true)',
    '        if removed ~= nil then',
    '            home.components.container:GiveItem(removed)',
    '        end',
    '    end',
    'end',
    '',
  ]
}

function lootBlock(creature: CreatureDef): string[] {
  if (creature.loot.length === 0) return []
  const lines = ['', '    inst:AddComponent("lootdropper")']
  for (const drop of creature.loot) {
    lines.push(`    inst.components.lootdropper:AddChancedLoot(${luaString(drop.prefab)}, ${drop.chance})`)
  }
  return lines
}

// Assets: when the creature reuses a vanilla build (creature.animation.source === 'vanilla'),
// no Asset("ANIM", ...) is declared — that animation data is already loaded by the base
// game. Otherwise this is a PLACEHOLDER: the user must supply anim/<id>.zip themselves
// (see README) before this prefab will load without a missing-build error.
export function generateCreaturePrefab(creature: CreatureDef): string {
  const upper = toUpperSnake(creature.id)
  const { bank, build, clips } = resolveCreatureAnimation(creature)
  const lines: string[] = []

  lines.push('local assets =')
  lines.push('{')
  if (isIslandAdventuresShipwreckedAnimation(creature)) {
    lines.push(`    -- Build "${sanitizeLuaComment(build)}" reaproveitado do mod "Island Adventures - Shipwrecked", sem asset próprio necessário.`)
  } else if (isVanillaCreatureAnimation(creature)) {
    lines.push(`    -- Build "${sanitizeLuaComment(build)}" reaproveitado do jogo base, sem asset próprio necessário.`)
  } else {
    lines.push(`    Asset("ANIM", "anim/${creature.id}.zip"), -- PLACEHOLDER: substitua pelo build real (ver README)`)
  }
  lines.push('}')
  lines.push('')
  // "bufferedmapaction" is the base game's own prefab, spawned by
  // spellportalteleporter's StartMapAction — see needsMapActionCreature.
  lines.push(needsMapActionCreature(creature) ? 'local prefabs = { "bufferedmapaction" }' : 'local prefabs = {}')
  lines.push('')
  if (creature.groundAttack !== undefined) {
    lines.push(...groundAttackFunctionBlock(creature.id, creature.groundAttack))
    lines.push(
      'local function TryGroundAttack(inst)',
      '    if inst.components.combat:HasTarget() then',
      '        local x, y, z = inst.Transform:GetWorldPosition()',
      '        dogroundattack(Vector3(x, y, z))',
      '    end',
      'end',
      '',
    )
  }
  if (needsFollowerTracking(creature)) {
    lines.push(...defendLeaderFunctionBlock())
  }
  if (creature.companion?.orbit !== undefined) {
    lines.push(...orbitLeaderFunctionBlock(creature))
  }
  if (needsOrbitContactDamage(creature)) {
    lines.push(...orbitPhaseDamageFunctionBlock(creature))
  }
  if (creature.work !== undefined) {
    lines.push(...depositAtHomeFunctionBlock())
  }
  if (creature.squadAlert !== undefined) {
    lines.push(...squadAlertFunctionBlock(creature))
  }
  if (creature.sentry !== undefined) {
    lines.push(...sentryFunctionBlock(creature))
  }
  lines.push('local function fn()')
  lines.push('    local inst = CreateEntity()')
  lines.push('')
  lines.push('    inst.entity:AddTransform()')
  lines.push('    inst.entity:AddAnimState()')
  lines.push('    inst.entity:AddSoundEmitter()')
  if (creature.light !== undefined) lines.push('    inst.entity:AddLight()')
  lines.push('    inst.entity:AddNetwork()')
  lines.push('')
  lines.push('    MakeCharacterPhysics(inst, 50, .5)')
  lines.push('')
  lines.push(`    inst.AnimState:SetBank(${luaString(bank)})`)
  lines.push(`    inst.AnimState:SetBuild(${luaString(build)})`)
  lines.push(`    inst.AnimState:PlayAnimation(${luaString(clips.idle)})`)
  lines.push('')
  if (creature.light !== undefined) {
    lines.push(`    inst.Light:SetRadius(TUNING.${upper}_LIGHT_RADIUS)`)
    lines.push(`    inst.Light:SetFalloff(TUNING.${upper}_LIGHT_FALLOFF)`)
    lines.push(`    inst.Light:SetIntensity(TUNING.${upper}_LIGHT_INTENSITY)`)
    lines.push(`    inst.Light:SetColour(TUNING.${upper}_LIGHT_COLOUR_R, TUNING.${upper}_LIGHT_COLOUR_G, TUNING.${upper}_LIGHT_COLOUR_B)`)
    lines.push('    inst.Light:Enable(true)')
    lines.push('')
  }
  lines.push(`    inst:AddTag("${creature.behavior === 'hostile' ? 'monster' : 'animal'}")`)
  if (creature.behavior === 'hostile') lines.push('    inst:AddTag("hostile")')
  for (const tag of creature.tags) lines.push(`    inst:AddTag(${luaString(tag)})`)
  if (needsHerd(creature) || creature.squadAlert !== undefined) lines.push(`    inst:AddTag(${luaString(creature.id)})`)
  lines.push('')
  lines.push('    inst.entity:SetPristine()')
  lines.push('    if not TheWorld.ismastersim then')
  lines.push('        return inst')
  lines.push('    end')
  lines.push('')
  lines.push('    inst:AddComponent("locomotor")')
  lines.push(`    inst.components.locomotor.walkspeed = TUNING.${upper}_WALKSPEED`)
  lines.push('')
  lines.push('    inst:AddComponent("health")')
  lines.push(`    inst.components.health:SetMaxHealth(TUNING.${upper}_HEALTH)`)
  if (creature.invincible) {
    lines.push('    inst.components.health:SetInvincible(true)')
  }
  lines.push('')
  lines.push('    inst:AddComponent("combat")')
  lines.push(`    inst.components.combat:SetDefaultDamage(TUNING.${upper}_DAMAGE)`)
  lines.push(`    inst.components.combat:SetAttackPeriod(TUNING.${upper}_ATTACK_PERIOD)`)
  if (creature.stats.attackRange !== undefined) {
    lines.push(`    inst.components.combat:SetRange(TUNING.${upper}_ATTACK_RANGE)`)
  } else {
    lines.push('    inst.components.combat:SetRange(2)')
  }
  if (creature.groundAttack !== undefined) {
    lines.push(`    inst:DoPeriodicTask(TUNING.${upper}_GROUNDATTACK_COOLDOWN, TryGroundAttack)`)
  }
  if (creature.squadAlert !== undefined) {
    lines.push('    inst:ListenForEvent("attacked", OnAttacked)')
  }
  if (creature.sentry !== undefined) {
    lines.push(`    inst:DoPeriodicTask(${SENTRY_TICK_PERIOD}, SentryTick)`)
  }
  if (needsMapActionCreature(creature)) {
    lines.push('', '    inst:AddComponent("spellportalteleporter")')
  }
  lines.push(...lootBlock(creature))

  if (creature.sanityAura !== undefined) {
    lines.push('')
    lines.push('    inst:AddComponent("sanityaura")')
    lines.push(`    inst.components.sanityaura.aura = TUNING.${upper}_SANITYAURA`)
  }

  if (creature.heatAura !== undefined) {
    lines.push('')
    lines.push('    inst:AddComponent("heater")')
    lines.push(`    inst.components.heater.heat = TUNING.${upper}_HEATAURA`)
  }

  if (creature.flammable) {
    lines.push('')
    lines.push('    -- "body" é o símbolo mais comum pro efeito de fogo — ajuste se o build usar outro nome.')
    lines.push('    MakeMediumBurnableCharacter(inst, "body")')
  }

  if (creature.freezable) {
    lines.push('')
    lines.push('    -- "body" é o símbolo mais comum pro efeito de gelo — ajuste se o build usar outro nome.')
    lines.push('    MakeMediumFreezableCharacter(inst, "body")')
  }

  if (creature.cookable) {
    lines.push('')
    lines.push('    inst:AddComponent("cookable")')
    lines.push(`    inst.components.cookable.product = ${luaString(creature.cookable.product)}`)
  }

  if (needsHerd(creature)) {
    lines.push('')
    lines.push('    inst:AddComponent("herdmember")')
    lines.push(`    inst.components.herdmember:SetHerdPrefab(${luaString(creature.id + 'herd')})`)
  }

  if (creature.panicCauses.includes('haunted')) {
    lines.push('')
    lines.push('    inst:AddComponent("hauntable")')
  }

  const needsChop = creature.companion?.tasks.includes('chopTrees') || creature.work?.tasks.includes('chopTrees')
  const needsMine = creature.work?.tasks.includes('mineRocks')
  const needsWorkAutoCollect = creature.work?.tasks.includes('chopTrees') || creature.work?.tasks.includes('mineRocks')
  const needsInventory =
    creature.companion?.tasks.includes('collectItems') || creature.work?.tasks.includes('harvestFarm') || needsWorkAutoCollect

  if (needsInventory) {
    lines.push('')
    lines.push('    inst:AddComponent("inventory")')
  }

  if (needsChop || needsMine) {
    lines.push('')
    lines.push('    inst:AddComponent("worker")')
    if (needsChop) lines.push('    inst.components.worker:SetAction(ACTIONS.CHOP, 1)')
    if (needsMine) lines.push('    inst.components.worker:SetAction(ACTIONS.MINE, 1)')
  }

  if (needsFollowerTracking(creature)) {
    lines.push('')
    lines.push('    inst:AddComponent("follower")')
    lines.push('    inst:DoPeriodicTask(2, TryDefendLeader)')
  }

  if (creature.companion?.orbit !== undefined) {
    lines.push(`    inst:DoPeriodicTask(${ORBIT_TICK_PERIOD}, OrbitLeader)`)
  }

  if (needsOrbitContactDamage(creature)) {
    lines.push('    inst:ListenForEvent("phasechanged", function(src, phase) OnOrbitPhaseChanged(inst, phase) end, TheWorld)')
    lines.push('    OnOrbitPhaseChanged(inst, TheWorld.state.phase)')
  }

  if (creature.work !== undefined) {
    lines.push('')
    lines.push('    inst:DoPeriodicTask(3, TryDepositAtHome)')
  }

  lines.push('')
  lines.push('    inst:AddComponent("inspectable")')
  lines.push('')
  lines.push(`    inst:SetStateGraph("SG${creature.id}")`)
  lines.push(`    inst:SetBrain(require("brains/${creature.id}brain"))`)
  lines.push('')
  lines.push('    return inst')
  lines.push('end')
  lines.push('')
  lines.push(`return Prefab("${creature.id}", fn, assets, prefabs)`)

  return lines.join('\n') + '\n'
}

export function generateCreatureFiles(creature: CreatureDef): Record<string, string> {
  const files: Record<string, string> = {
    [`scripts/prefabs/${creature.id}.lua`]: generateCreaturePrefab(creature),
    [`scripts/stategraphs/SG${creature.id}.lua`]: generateStategraph(creature),
    [`scripts/brains/${creature.id}brain.lua`]: generateBrain(creature),
  }
  if (needsHerd(creature)) {
    files[`scripts/prefabs/${creature.id}herd.lua`] = generateHerdPrefab(creature)
  }
  if (needsMapActionCreature(creature)) {
    files['scripts/components/spellportalteleporter.lua'] = generateSpellPortalTeleporterComponent()
  }
  return files
}
