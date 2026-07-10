import type { CreatureDef } from '../types/modProject'

// Minimal but complete stategraph: idle/moving/attack/hit/death, driven by the
// standard "locomote"/"attacked"/"death" events every creature with a locomotor +
// combat + health component emits.
export function generateStategraph(creature: CreatureDef): string {
  const name = `SG${creature.id}`

  return `local states =
{
    State{
        name = "idle",
        tags = { "idle", "canrotate" },
        onenter = function(inst)
            inst.components.locomotor:StopMoving()
            inst.AnimState:PlayAnimation("idle", true)
        end,
    },

    State{
        name = "moving",
        tags = { "moving", "running", "canrotate" },
        onenter = function(inst)
            inst.AnimState:PlayAnimation("walk", true)
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
            inst.AnimState:PlayAnimation("atk")
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
            inst.AnimState:PlayAnimation("hit")
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
            inst.AnimState:PlayAnimation("death")
            RemovePhysicsColliders(inst)
        end,
    },
}

local events =
{
    EventHandler("attacked", function(inst)
        if not inst.components.health:IsDead() then
            inst.sg:GoToState("hit")
        end
    end),
    EventHandler("death", function(inst)
        inst.sg:GoToState("death")
    end),
    EventHandler("locomote", function(inst)
        local is_moving = inst.sg:HasStateTag("moving")
        local wants_to_move = inst.components.locomotor:WantsToMoveForward()
        if not is_moving and wants_to_move then
            inst.sg:GoToState("moving")
        elseif is_moving and not wants_to_move then
            inst.sg:GoToState("idle")
        end
    end),
}

return StateGraph("${name}", states, events, "idle")
`
}
