-- PLACEHOLDER icons: add an `icon = "..."` field per node once you have
-- matching art under images/skilltree/, then register each atlas from
-- modmain.lua with RegisterSkilltreeIconsAtlas (see README).

local ORDERS = {
    {"alchemy", {0, 0}},
    {"combat", {150, 0}},
}

local function BuildSkillsData(SkillTreeFns)
    local skills = {
        skillmaster_alchemy_1 = {
            title = "Alchemy I",
            desc = "The first step.",
            pos = {0, 176},
            group = "alchemy",
            tags = { "alchemy" },
            root = true,
            defaultfocus = true,
            connects = { "skillmaster_alchemy_2_lock" },
            onactivate = function(inst, fromload)
                inst:AddTag("fast_alchemy")
            end,
            ondeactivate = function(inst, fromload)
                inst:RemoveTag("fast_alchemy")
            end,
        },
        skillmaster_alchemy_2_lock = {
            desc = "Requires 1 earlier skills in this branch.",
            pos = {0, 138},
            group = "alchemy",
            tags = { "alchemy", "lock" },
            connects = { "skillmaster_alchemy_2" },
            lock_open = function(prefabname, activatedskills, readonly)
                return SkillTreeFns.CountTags(prefabname, "alchemy", activatedskills) >= 1
            end,
        },
        skillmaster_alchemy_2 = {
            title = "Alchemy II",
            desc = "Locked behind the first.",
            pos = {0, 100},
            group = "alchemy",
            tags = { "alchemy" },
        },
        skillmaster_combat_1 = {
            title = "Combat I",
            desc = "A combat skill.",
            pos = {150, 176},
            group = "combat",
            tags = { "combat" },
            root = true,
        },
    }

    return {
        SKILLS = skills,
        ORDERS = ORDERS,
    }
end

return BuildSkillsData
