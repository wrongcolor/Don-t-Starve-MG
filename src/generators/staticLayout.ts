import type { StaticLayoutDef } from '../types/worldContent'
import { luaString } from './luaUtils'

// Confirmed by reading a real published mod ("Graveyard Island") end-to-end plus the
// actual engine loader (Original/map/map/static_layout.lua) — see patterns.md#55.
// Generating with tilewidth=tileheight=64 makes the loader's tilefactor (=ceil(64/tw))
// equal 1, which collapses tile-data parsing to a plain flat row-major width*height
// array and makes object placement trivial: a prefab centered in grid cell (col,row)
// is x=col*64+32, y=row*64+32 in the raw Tiled coordinates this file stores.
const TILE_SIZE = 64

function generateTileData(layout: StaticLayoutDef): string {
  const flat = layout.tiles.flat()
  return flat.join(', ')
}

function generateObjectProperties(properties: StaticLayoutDef['objects'][number]['properties']): string {
  if (properties.length === 0) return 'properties = {}'
  const lines = properties.map((p) => `                    [${luaString(p.key)}] = ${luaString(p.value)},`)
  return `properties = {\n${lines.join('\n')}\n                }`
}

function generateObject(obj: StaticLayoutDef['objects'][number]): string {
  const x = obj.col * TILE_SIZE + TILE_SIZE / 2
  const y = obj.row * TILE_SIZE + TILE_SIZE / 2
  return `                {
                    name = "",
                    type = ${luaString(obj.prefab)},
                    shape = "rectangle",
                    x = ${x},
                    y = ${y},
                    width = 0,
                    height = 0,
                    visible = true,
                    ${generateObjectProperties(obj.properties)}
                }`
}

// Emits scripts/map/static_layouts/<id>.lua — shaped exactly like a Tiled JSON export,
// since that's the format Original/map/map/static_layout.lua's loader expects.
export function generateStaticLayoutLua(layout: StaticLayoutDef): string {
  const objects = layout.objects.map(generateObject).join(',\n')
  return `return {
    version = "1.1",
    luaversion = "5.1",
    orientation = "orthogonal",
    width = ${layout.width},
    height = ${layout.height},
    tilewidth = ${TILE_SIZE},
    tileheight = ${TILE_SIZE},
    properties = {},
    tilesets = {
        {
            name = "tiles",
            firstgid = 1,
            tilewidth = ${TILE_SIZE},
            tileheight = ${TILE_SIZE},
            spacing = 0,
            margin = 0,
            image = "../../../../tools/tiled/dont_starve/tiles.png",
            imagewidth = 512,
            imageheight = 384,
            properties = {},
            tiles = {}
        }
    },
    layers = {
        {
            type = "tilelayer",
            name = "BG_TILES",
            x = 0,
            y = 0,
            width = ${layout.width},
            height = ${layout.height},
            visible = true,
            opacity = 1,
            properties = {},
            encoding = "lua",
            data = { ${generateTileData(layout)} }
        },
        {
            type = "objectgroup",
            name = "FG_OBJECTS",
            visible = true,
            opacity = 1,
            properties = {},
            objects = {
${objects}
            }
        }
    }
}
`
}

// Confirmed in the same real mod: registration is a separate call in modworldgenmain.lua,
// distinct from the Room that references the layout via contents.countstaticlayouts.
export function generateStaticLayoutRegistration(layout: StaticLayoutDef): string {
  return `require("map/layouts").Layouts[${luaString(layout.id)}] =
require("map/static_layout").Get(${luaString('map/static_layouts/' + layout.id)}, {
    type = LAYOUT.STATIC,
    layout_position = LAYOUT_POSITION.${layout.layoutPosition},
    start_mask = PLACE_MASK.${layout.startMask},
    fill_mask = PLACE_MASK.${layout.fillMask},
})
`
}
