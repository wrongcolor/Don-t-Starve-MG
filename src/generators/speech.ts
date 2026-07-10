import type { CharacterDef } from '../types/modProject'
import { luaString } from './luaUtils'

// speech_wilson.lua has thousands of entries (ANNOUNCE_*, DESCRIBE.<prefab> for every
// vanilla prefab) — generating it from scratch is out of scope and would leave the
// character mute/erroring on anything not covered. Instead we fall back to Wilson's
// speech via metatable and only override the top-level keys the user customized.
// NOTE: nested keys (e.g. DESCRIBE.<prefab>) are intentionally not supported here —
// mutating them would write through the metatable into the shared wilson_speech table.
export function generateSpeechFile(character: CharacterDef): string {
  const lines: string[] = []
  lines.push('local wilson_speech = require("speech_wilson")')
  lines.push('')
  lines.push('local speech = setmetatable({}, { __index = wilson_speech })')

  const overrideEntries = Object.entries(character.speechOverrides)
  if (overrideEntries.length > 0) {
    lines.push('')
    lines.push('-- Overrides customizados')
    for (const [key, value] of overrideEntries) {
      lines.push(`speech[${luaString(key)}] = ${luaString(value)}`)
    }
  }

  lines.push('')
  lines.push('return speech')

  return lines.join('\n') + '\n'
}
