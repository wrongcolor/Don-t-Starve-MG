-- PLACEHOLDER icons: add an `icon = "..."` field per node once you have
-- matching art under images/skilltree/, then register each atlas from
-- modmain.lua with RegisterSkilltreeIconsAtlas (see README).

local ORDERS = {
    {"pyromancy", {0, 0}},
    {"spirit", {150, 0}},
}

local function BuildSkillsData(SkillTreeFns)
    local skills = {
        vex_pyro_1 = {
            title = "Ember Touch",
            desc = "Her hands radiate warmth.",
            pos = {0, 176},
            group = "pyromancy",
            tags = { "pyromancy" },
            root = true,
            defaultfocus = true,
            connects = { "vex_pyro_2_lock" },
            onactivate = function(inst, fromload)
                inst:AddTag("firestarter")
            end,
            ondeactivate = function(inst, fromload)
                inst:RemoveTag("firestarter")
            end,
        },
        vex_pyro_2_lock = {
            desc = "Requires 1 earlier skills in this branch.",
            pos = {0, 138},
            group = "pyromancy",
            tags = { "pyromancy", "lock" },
            connects = { "vex_pyro_2" },
            lock_open = function(prefabname, activatedskills, readonly)
                return SkillTreeFns.CountTags(prefabname, "pyromancy", activatedskills) >= 1
            end,
        },
        vex_pyro_2 = {
            title = "Inferno Within",
            desc = "No longer bothered by overheating.",
            pos = {0, 100},
            group = "pyromancy",
            tags = { "pyromancy" },
        },
        vex_spirit_1 = {
            title = "Calm Mind",
            desc = "Reduced sanity loss from the dark.",
            pos = {150, 176},
            group = "spirit",
            tags = { "spirit" },
            root = true,
        },
    }

    return {
        SKILLS = skills,
        ORDERS = ORDERS,
    }
end

return BuildSkillsData
