local states =
{
    State{
        name = "idle",
        tags = { "idle", "canrotate" },

        onenter = function(inst)
            inst.components.locomotor:Stop()
            inst.AnimState:PlayAnimation("idle_loop", true)
        end,
    },
}

return StateGraph("twinsteed", states, {}, "idle")
