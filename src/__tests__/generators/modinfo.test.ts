import { describe, it, expect } from 'vitest'
import { generateModInfo } from '../../generators/modinfo'
import { sampleProject } from '../fixtures'

describe('generateModInfo', () => {
  const code = generateModInfo(sampleProject)

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

  it('does not declare mod_dependencies when no structure has an interior', () => {
    expect(code).not.toContain('mod_dependencies')
  })

  // A structure's interior needs "Above the Clouds"'s real interiorspawner
  // component at runtime (docs/dst-knowledge/patterns.md's interior section)
  // — derived automatically from usage, not a separate meta toggle.
  it('declares a dependency on "Above the Clouds" when a structure has an interior', () => {
    const withInterior = {
      ...sampleProject,
      structures: [{ ...sampleProject.structures[0], interior: { size: 'tiny' as const } }],
    }
    const withInteriorCode = generateModInfo(withInterior)
    expect(withInteriorCode).toContain('mod_dependencies =')
    expect(withInteriorCode).toContain('workshop = "workshop-3322803908"')
  })
})
