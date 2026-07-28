// Escapes a string for safe embedding inside a double-quoted Lua string literal.
export function escapeLuaString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/\t/g, '\\t')
}

export function luaString(value: string): string {
  return `"${escapeLuaString(value)}"`
}

export function luaStringArray(values: string[]): string {
  return `{ ${values.map(luaString).join(', ')} }`
}

// A `--` comment runs to end of line, so a newline in interpolated free text
// would end the comment early and turn the rest of the value into live Lua code.
export function sanitizeLuaComment(value: string): string {
  return value.replace(/[\r\n]/g, ' ')
}

export function toUpperSnake(id: string): string {
  return id.toUpperCase()
}

export function indent(code: string, level = 1): string {
  const pad = '    '.repeat(level)
  return code
    .split('\n')
    .map((line) => (line.length > 0 ? pad + line : line))
    .join('\n')
}
