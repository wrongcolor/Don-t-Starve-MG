name = "Test Mod"
description = "A mod for testing"
author = "Tester"
version = "1.0.0"

api_version = 10

dont_starve_compatible = false
dst_compatible = true
reign_of_giants_compatible = false
shipwrecked_compatible = false
hamlet_compatible = false

all_clients_require_mod = true
client_only_mod = false

icon_atlas = "modicon.xml"
icon = "modicon.tex"

forumthread = ""
priority = 0

configuration_options =
{
    {
        name = "difficulty",
        label = "Difficulty",
        options =
        {
            { description = "Easy", data = "easy" },
            { description = "Hard", data = "hard" },
        },
        default = "easy",
    },
}
