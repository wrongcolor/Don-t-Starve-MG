import { describe, it, expect } from 'vitest'
import { generateModInfo } from '../../generators/modinfo'
import { sampleProject } from '../fixtures'

describe('generateModInfo', () => {
  const code = generateModInfo(sampleProject.meta)

  it('sets api_version = 10 as an integer, not a string', () => {
    expect(code).toMatch(/\bapi_version = 10\b/)
    expect(code).not.toMatch(/api_version = "10"/)
  })

  it('marks the mod as dst_compatible', () => {
    expect(code).toMatch(/dst_compatible = true/)
  })

  it('includes name/description/author/version', () => {
    expect(code).toContain('name = "Test Mod"')
    expect(code).toContain('description = "A mod for testing"')
    expect(code).toContain('author = "Tester"')
    expect(code).toContain('version = "1.0.0"')
  })

  it('emits configuration_options with default matching defaultIndex', () => {
    expect(code).toContain('configuration_options')
    expect(code).toContain('name = "difficulty"')
    expect(code).toContain('default = "easy"')
  })
})
