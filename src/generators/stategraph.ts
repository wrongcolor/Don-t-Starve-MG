import type { CreatureDef } from '../types/modProject'
import { luaString } from './luaUtils'
import { resolveCreatureAnimation } from './creatureAnimation'
import { hasVanishState } from './creature'

// Minimal but complete stategraph: idle/moving/attack/hit/death, driven by the
// standard "locomote"/"attacked"/"death" events every creature with a locomotor +
// combat + health component emits. The animation clip names (as opposed to the SG
// state names, which are always "idle"/"moving"/"attack"/"hit"/"death") come from
// resolveCreatureAnimation — user-editable when reusing a vanilla build, since this
// tool can't verify clip names against the actual game files.
// Extra one-shot states, only emitted when the creature actually uses them:
// "spawn" (clips.spawn, the being-born clip it starts in), "release"
// (childSpawner — the child appears on releaseFrame, via the prefab's own
// inst.SpawnChild, see creature.ts) and "vanish" (vanishAtDawn — the death
// clip without dying, then removed). All three are "busy", so the locomote
// handler leaves them alone until they finish.
function extraStates(creature: CreatureDef, clips: { idle: string; death: string; spawn?: string }): string {
  const states: string[] = []
  if (clips.spawn !== undefined) {
    states.push(`    State{
        name = "spawn",
        tags = { "busy" },
        onenter = function(inst)
            inst.components.locomotor:StopMoving()
            inst.AnimState:PlayAnimation(${luaString(clips.spawn)})
        end,
        events =
        {
            EventHandler("animover", function(inst) inst.sg:GoToState("idle") end),
        },
    },
`)
  }
  if (creature.childSpawner !== undefined) {
    const releaseClip = creature.childSpawner.releaseClip ?? clips.idle
    const releaseFrame = creature.childSpawner.releaseFrame ?? 0
    states.push(`    State{
        name = "release",
        tags = { "busy" },
        onenter = function(inst)
            inst.AnimState:PlayAnimation(${luaString(releaseClip)})
        end,
        timeline =
        {
            TimeEvent(${releaseFrame} * FRAMES, function(inst)
                if inst.SpawnChild ~= nil then
                    inst:SpawnChild()
                end
            end),
        },
        events =
        {
            EventHandler("animover", function(inst) inst.sg:GoToState("idle") end),
        },
    },
`)
  }
  if (hasVanishState(creature)) {
    states.push(`    State{
        name = "vanish",
        tags = { "busy", "nointerrupt" },
        onenter = function(inst)
            inst.components.locomotor:StopMoving()
            inst.persists = false
            inst:AddTag("NOCLICK")
            inst.AnimState:PlayAnimation(${luaString(clips.death)})
            -- "animover" never fires while asleep (no player nearby), and
            -- neither does the stategraph's own timeout (reproduced on a
            -- headless server), so a plain scheduler task removes it
            -- regardless.
            inst:DoTaskInTime(5, inst.Remove)
        end,
        events =
        {
            EventHandler("animover", function(inst) inst:Remove() end),
        },
    },
`)
  }
  return states.map((state) => '\n' + state).join('')
}

export function generateStategraph(creature: CreatureDef): string {
  const name = `SG${creature.id}`
  const { clips } = resolveCreatureAnimation(creature)
  const extra = extraStates(creature, clips)
  // Only guard locomote when there's a busy one-shot state worth protecting —
  // keeps every existing creature's output unchanged.
  // "vanish" is a one-time chance per day (vanishAtDawn) — a hit must not
  // knock it back to idle, or the creature lingers the whole next day.
  const attackedGuard = hasVanishState(creature) ? ' and not inst.sg:HasStateTag("nointerrupt")' : ''
  const busyGuard =
    extra !== ''
      ? `        if inst.sg:HasStateTag("busy") then
            return
        end
`
      : ''

  return `local states =
{
    State{
        name = "idle",
        tags = { "idle", "canrotate" },
        onenter = function(inst)
            inst.components.locomotor:StopMoving()
            inst.AnimState:PlayAnimation(${luaString(clips.idle)}, true)
        end,
    },

    State{
        name = "moving",
        tags = { "moving", "running", "canrotate" },
        onenter = function(inst)
            inst.AnimState:PlayAnimation(${luaString(clips.walk)}, true)
        end,
        onupdate = function(inst)
            if not inst.components.locomotor:WantsToMoveForward() then
                inst.sg:GoToState("idle")
            end
        end,
    },

    State{
        name = "attack",
        tags = { "attack", "busy" },
        onenter = function(inst)
            inst.components.locomotor:StopMoving()
            inst.AnimState:PlayAnimation(${luaString(clips.atk)})
        end,
        timeline =
        {
            TimeEvent(10 * FRAMES, function(inst)
                if inst.components.combat ~= nil then
                    inst.components.combat:DoAttack()
                end
            end),
        },
        events =
        {
            EventHandler("animover", function(inst) inst.sg:GoToState("idle") end),
        },
    },

    State{
        name = "hit",
        tags = { "hit", "busy" },
        onenter = function(inst)
            inst.components.locomotor:StopMoving()
            inst.AnimState:PlayAnimation(${luaString(clips.hit)})
        end,
        events =
        {
            EventHandler("animover", function(inst) inst.sg:GoToState("idle") end),
        },
    },

    State{
        name = "death",
        tags = { "busy" },
        onenter = function(inst)
            inst.components.locomotor:StopMoving()
            inst:RemoveComponent("locomotor")
            inst.AnimState:PlayAnimation(${luaString(clips.death)})
            RemovePhysicsColliders(inst)
        end,
    },
${extra}}

local events =
{
    EventHandler("attacked", function(inst)
        if not inst.components.health:IsDead()${attackedGuard} then
            inst.sg:GoToState("hit")
        end
    end),
    EventHandler("death", function(inst)
        inst.sg:GoToState("death")
    end),
    EventHandler("locomote", function(inst)
${busyGuard}        local is_moving = inst.sg:HasStateTag("moving")
        local wants_to_move = inst.components.locomotor:WantsToMoveForward()
        if not is_moving and wants_to_move then
            inst.sg:GoToState("moving")
        elseif is_moving and not wants_to_move then
            inst.sg:GoToState("idle")
        end
    end),
}

return StateGraph("${name}", states, events, ${luaString(clips.spawn !== undefined ? 'spawn' : 'idle')})
`
}
