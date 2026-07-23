import { describe, it, expect } from 'vitest'
import { generateStaticLayoutLua, generateStaticLayoutRegistration } from '../../generators/staticLayout'
import { sampleProject } from '../fixtures'

describe('generateStaticLayoutLua/generateStaticLayoutRegistration', () => {
  const [layout] = sampleProject.staticLayouts

  it('flattens the tile grid row-major, matching a flat width*height array (patterns.md#55)', () => {
    const code = generateStaticLayoutLua(layout)
    expect(code).toContain('width = 4')
    expect(code).toContain('height = 4')
    expect(code).toContain('data = { 0, 0, 0, 0, 0, 7, 7, 0, 0, 7, 7, 0, 0, 0, 0, 0 }')
  })

  it('always writes tilewidth/tileheight=64 so the engine loader treats data as unshuffled (tilefactor=1)', () => {
    const code = generateStaticLayoutLua(layout)
    expect(code).toContain('tilewidth = 64')
    expect(code).toContain('tileheight = 64')
  })

  it('centers a placed object in its grid cell using col*64+32/row*64+32', () => {
    const code = generateStaticLayoutLua(layout)
    // object at col=1, row=1 -> x=1*64+32=96, y=1*64+32=96
    expect(code).toContain('type = "gravestone"')
    expect(code).toContain('x = 96')
    expect(code).toContain('y = 96')
  })

  it('writes object properties as a dotted-key Lua table', () => {
    const code = generateStaticLayoutLua(layout)
    expect(code).toContain('["data.setepitaph"] = "Bryce"')
  })

  it('emits an empty properties table when an object has none', () => {
    const bare = { ...layout, objects: [{ prefab: 'marblepillar', col: 0, row: 0, properties: [] }] }
    const code = generateStaticLayoutLua(bare)
    expect(code).toContain('properties = {}')
  })

  it('generates a registration snippet using the confirmed real API (patterns.md#22, #55)', () => {
    const code = generateStaticLayoutRegistration(layout)
    expect(code).toContain('require("map/layouts").Layouts["TestGraveyard"] =')
    expect(code).toContain('require("map/static_layout").Get("map/static_layouts/TestGraveyard"')
    expect(code).toContain('type = LAYOUT.STATIC')
    expect(code).toContain('layout_position = LAYOUT_POSITION.CENTER')
    expect(code).toContain('start_mask = PLACE_MASK.IGNORE_IMPASSABLE_BARREN_RESERVED')
    expect(code).toContain('fill_mask = PLACE_MASK.IGNORE_IMPASSABLE_BARREN_RESERVED')
  })
})
