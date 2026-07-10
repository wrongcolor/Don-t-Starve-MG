import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { buildModFiles } from '../../generators/zipBuilder'
import { sampleProject } from '../fixtures'

// Catches escaping/comma/paren mistakes that string-match tests wouldn't: every
// generated .lua file must be syntactically valid Lua on its own.
describe('generated .lua files are syntactically valid', () => {
  const files = buildModFiles(sampleProject)
  const luaFiles = Object.entries(files).filter(([path]) => path.endsWith('.lua'))

  it('found at least one .lua file to check', () => {
    expect(luaFiles.length).toBeGreaterThan(0)
  })

  for (const [path, content] of luaFiles) {
    it(`parses without syntax errors: ${path}`, () => {
      expect(() => parse(content, { luaVersion: '5.1' })).not.toThrow()
    })
  }
})
