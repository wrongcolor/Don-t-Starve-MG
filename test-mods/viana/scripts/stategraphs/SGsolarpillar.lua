local states =
{
    State{
        name = "idle",
        tags = { "idle", "canrotate" },
        onenter = function(inst)
            inst.components.locomotor:StopMoving()
            inst.AnimState:PlayAnimation("idle_loop", true)
        end,
    },

    State{
        name = "moving",
        tags = { "moving", "running", "canrotate" },
        onenter = function(inst)
            inst.AnimState:PlayAnimation("idle_loop", true)
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
            inst.AnimState:PlayAnimation("idle_loop")
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

    State{
        name = "spawn",
        tags = { "busy" },
        onenter = function(inst)
            inst.components.locomotor:StopMoving()
            inst.AnimState:PlayAnimation("spawn")
        end,
        events =
        {
            EventHandler("animover", function(inst) inst.sg:GoToState("idle") end),
        },
    },

    State{
        name = "vanish",
        tags = { "busy", "nointerrupt" },
        onenter = function(inst)
            inst.components.locomotor:StopMoving()
            inst.persists = false
            inst:AddTag("NOCLICK")
            inst.AnimState:PlayAnimation("death")
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
}

local events =
{
    EventHandler("attacked", function(inst)
        if not inst.components.health:IsDead() and not inst.sg:HasStateTag("nointerrupt") then
            inst.sg:GoToState("hit")
        end
    end),
    EventHandler("death", function(inst)
        inst.sg:GoToState("death")
    end),
    EventHandler("locomote", function(inst)
        if inst.sg:HasStateTag("busy") then
            return
        end
        local is_moving = inst.sg:HasStateTag("moving")
        local wants_to_move = inst.components.locomotor:WantsToMoveForward()
        if not is_moving and wants_to_move then
            inst.sg:GoToState("moving")
        elseif is_moving and not wants_to_move then
            inst.sg:GoToState("idle")
        end
    end),
}

return StateGraph("SGsolarpillar", states, events, "spawn")
