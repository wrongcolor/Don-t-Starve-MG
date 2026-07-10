import { parse } from 'luaparse'

export interface ParsedRecipe {
  name: string
  ingredients: { prefab: string; amount: number }[]
  tech: string | null
  filters: string[]
  placer: string | null
}

export interface ParsedCharacter {
  id: string
  gender: string
}

export interface FileParseError {
  path: string
  message: string
}

export interface ParsedModSummary {
  meta: Record<string, string | number | boolean>
  prefabFiles: string[]
  recipes: ParsedRecipe[]
  characters: ParsedCharacter[]
  names: Record<string, string>
  tuning: Record<string, string | number | boolean>
  fileErrors: FileParseError[]
  filesParsed: number
}

const MODINFO_FIELDS = new Set([
  'name',
  'description',
  'author',
  'version',
  'api_version',
  'dst_compatible',
  'dont_starve_compatible',
  'reign_of_giants_compatible',
  'shipwrecked_compatible',
  'hamlet_compatible',
  'all_clients_require_mod',
  'client_only_mod',
  'icon_atlas',
  'icon',
  'forumthread',
  'priority',
  'folder_name',
])

function createEmptySummary(): ParsedModSummary {
  return {
    meta: {},
    prefabFiles: [],
    recipes: [],
    characters: [],
    names: {},
    tuning: {},
    fileErrors: [],
    filesParsed: 0,
  }
}

// Generic AST walk — visits every node in the tree regardless of type. Real-world
// mods wrap calls/assignments in varying structures (if-blocks, local functions,
// etc.), so we don't assume a fixed shape; we just look for the call/assignment
// patterns anywhere in the file.
function walk(node: unknown, visit: (node: Record<string, unknown>) => void): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit)
    return
  }
  const obj = node as Record<string, unknown>
  if (typeof obj.type === 'string') visit(obj)
  for (const key of Object.keys(obj)) {
    if (key === 'type' || key === 'loc') continue
    const value = obj[key]
    if (value && typeof value === 'object') walk(value, visit)
  }
}

function memberPath(expr: unknown): string[] | null {
  if (!expr || typeof expr !== 'object') return null
  const node = expr as Record<string, unknown>
  if (node.type === 'Identifier') return [node.name as string]
  if (node.type === 'MemberExpression' && node.indexer === '.') {
    const basePath = memberPath(node.base)
    if (!basePath) return null
    const identifier = node.identifier as Record<string, unknown>
    return [...basePath, identifier.name as string]
  }
  return null
}

function literalValue(expr: unknown): string | number | boolean | null {
  if (!expr || typeof expr !== 'object') return null
  const node = expr as Record<string, unknown>
  switch (node.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
      return node.value as string | number | boolean
    default:
      return null
  }
}

function baseIdentifierName(expr: unknown): string | null {
  if (!expr || typeof expr !== 'object') return null
  const node = expr as Record<string, unknown>
  return node.type === 'Identifier' ? (node.name as string) : null
}

function handleAssignment(node: Record<string, unknown>, summary: ParsedModSummary) {
  const variables = node.variables as unknown[]
  const init = node.init as unknown[]

  variables.forEach((varNode, i) => {
    const value = init[i]
    if (value === undefined) return

    const varObj = varNode as Record<string, unknown>
    const path = varObj.type === 'Identifier' ? [varObj.name as string] : memberPath(varNode)
    if (!path || path.length === 0) return

    const last = path[path.length - 1]
    const secondLast = path.length >= 2 ? path[path.length - 2] : null

    if (path.length === 1 && MODINFO_FIELDS.has(last)) {
      const v = literalValue(value)
      if (v !== null) summary.meta[last] = v
    }

    if (path.length === 1 && last === 'PrefabFiles') {
      const tableNode = value as Record<string, unknown>
      if (tableNode.type === 'TableConstructorExpression') {
        for (const field of tableNode.fields as Record<string, unknown>[]) {
          if (field.type === 'TableValue') {
            const v = literalValue(field.value)
            if (typeof v === 'string') summary.prefabFiles.push(v)
          }
        }
      }
    }

    if (secondLast === 'NAMES') {
      const v = literalValue(value)
      if (typeof v === 'string') summary.names[last] = v
    }

    if (secondLast === 'TUNING') {
      const v = literalValue(value)
      if (v !== null) summary.tuning[last] = v
    }
  })
}

function handleCall(node: Record<string, unknown>, summary: ParsedModSummary) {
  const baseName = baseIdentifierName(node.base)
  const args = (node.arguments as unknown[]) ?? []

  if (baseName === 'AddRecipe2') {
    const [nameArg, ingredientsArg, techArg, configArg, filtersArg] = args
    const name = literalValue(nameArg)
    if (typeof name !== 'string') return

    const ingredients: { prefab: string; amount: number }[] = []
    const ingredientsNode = ingredientsArg as Record<string, unknown> | undefined
    if (ingredientsNode?.type === 'TableConstructorExpression') {
      for (const field of ingredientsNode.fields as Record<string, unknown>[]) {
        if (field.type !== 'TableValue') continue
        const call = field.value as Record<string, unknown>
        if (call.type !== 'CallExpression') continue
        if (baseIdentifierName(call.base) !== 'Ingredient') continue
        const callArgs = call.arguments as unknown[]
        const prefab = literalValue(callArgs[0])
        const amount = literalValue(callArgs[1])
        if (typeof prefab === 'string') {
          ingredients.push({ prefab, amount: typeof amount === 'number' ? amount : 1 })
        }
      }
    }

    const techPath = memberPath(techArg)
    const tech = techPath ? techPath[techPath.length - 1] : null

    let placer: string | null = null
    const configNode = configArg as Record<string, unknown> | undefined
    if (configNode?.type === 'TableConstructorExpression') {
      for (const field of configNode.fields as Record<string, unknown>[]) {
        if (field.type === 'TableKeyString') {
          const key = field.key as Record<string, unknown>
          if (key.name === 'placer') {
            const v = literalValue(field.value)
            if (typeof v === 'string') placer = v
          }
        }
      }
    }

    const filters: string[] = []
    const filtersNode = filtersArg as Record<string, unknown> | undefined
    if (filtersNode?.type === 'TableConstructorExpression') {
      for (const field of filtersNode.fields as Record<string, unknown>[]) {
        if (field.type === 'TableValue') {
          const v = literalValue(field.value)
          if (typeof v === 'string') filters.push(v)
        }
      }
    }

    summary.recipes.push({ name, ingredients, tech, filters, placer })
  }

  if (baseName === 'AddModCharacter') {
    const [idArg, genderArg] = args
    const id = literalValue(idArg)
    const gender = literalValue(genderArg)
    if (typeof id === 'string') {
      summary.characters.push({ id, gender: typeof gender === 'string' ? gender : 'DESCONHECIDO' })
    }
  }
}

export function parseModFiles(files: Record<string, string>): ParsedModSummary {
  const summary = createEmptySummary()

  for (const [path, content] of Object.entries(files)) {
    if (!path.toLowerCase().endsWith('.lua')) continue

    let chunk
    try {
      // encodingMode is required for luaparse to populate StringLiteral.value —
      // without it every string literal's value comes back as null (only `raw` is set).
      chunk = parse(content, { luaVersion: '5.1', encodingMode: 'pseudo-latin1' })
    } catch (e) {
      summary.fileErrors.push({ path, message: e instanceof Error ? e.message : String(e) })
      continue
    }

    summary.filesParsed += 1
    walk(chunk, (node) => {
      if (node.type === 'AssignmentStatement' || node.type === 'LocalStatement') {
        handleAssignment(node, summary)
      }
      if (node.type === 'CallExpression') {
        handleCall(node, summary)
      }
    })
  }

  return summary
}
