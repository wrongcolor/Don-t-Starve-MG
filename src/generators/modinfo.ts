import type { ModProject } from '../types/modProject'
import { luaString } from './luaUtils'

// Confirmed in real published Workshop mods that depend on "Above the Clouds"
// (its own addons declare `mod_dependencies = {{ workshop = "workshop-3322803908" }}`
// — see docs/dst-knowledge/patterns.md's interior section). Any structure with
// `.interior` set needs that mod's real interiorspawner component at runtime.
const ABOVE_THE_CLOUDS_WORKSHOP_ID = 'workshop-3322803908'

// api_version = 10 and dst_compatible = true are required for the mod to be picked up
// by DST at all — see plan notes. dont_starve_compatible / shipwrecked / hamlet are left
// false since this generator only targets DST.
export function generateModInfo(project: ModProject): string {
  const meta = project.meta
  const lines: string[] = []

  lines.push(`name = ${luaString(meta.name)}`)
  lines.push(`description = ${luaString(meta.description)}`)
  lines.push(`author = ${luaString(meta.author)}`)
  lines.push(`version = ${luaString(meta.version)}`)
  lines.push('')
  lines.push('api_version = 10')
  lines.push('')
  lines.push('dont_starve_compatible = false')
  lines.push('dst_compatible = true')
  lines.push('reign_of_giants_compatible = false')
  lines.push('shipwrecked_compatible = false')
  lines.push('hamlet_compatible = false')
  lines.push('')
  lines.push(`all_clients_require_mod = ${meta.allClientsRequireMod}`)
  lines.push('client_only_mod = false')
  lines.push('')
  lines.push('icon_atlas = "modicon.xml"')
  lines.push('icon = "modicon.tex"')
  lines.push('')
  lines.push('forumthread = ""')
  lines.push('priority = 0')

  // Derived from usage, not a separate toggle — an interior structure needs
  // the real dependency mod's interiorspawner component at runtime, so this
  // can never drift out of sync with whether the feature is actually used.
  if (project.structures.some((s) => s.interior)) {
    lines.push('')
    lines.push('mod_dependencies =')
    lines.push('{')
    lines.push(`    { workshop = ${luaString(ABOVE_THE_CLOUDS_WORKSHOP_ID)} }, -- Above the Clouds (interiorspawner)`)
    lines.push('}')
  }

  if (meta.configOptions.length > 0) {
    lines.push('')
    lines.push('configuration_options =')
    lines.push('{')
    for (const opt of meta.configOptions) {
      lines.push(`    {`)
      lines.push(`        name = ${luaString(opt.name)},`)
      lines.push(`        label = ${luaString(opt.label)},`)
      lines.push(`        options =`)
      lines.push(`        {`)
      for (const o of opt.options) {
        const data = typeof o.data === 'string' ? luaString(o.data) : String(o.data)
        lines.push(`            { description = ${luaString(o.description)}, data = ${data} },`)
      }
      lines.push(`        },`)
      const defaultData = opt.options[opt.defaultIndex]?.data
      const defaultLiteral =
        typeof defaultData === 'string' ? luaString(defaultData) : String(defaultData ?? 'nil')
      lines.push(`        default = ${defaultLiteral},`)
      lines.push(`    },`)
    }
    lines.push('}')
  }

  return lines.join('\n') + '\n'
}
