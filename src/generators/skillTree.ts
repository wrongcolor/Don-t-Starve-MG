import type { CharacterDef, SkillTreeNode } from '../types/modProject'
import { luaString, luaStringArray } from './luaUtils'

const BRANCH_X_STEP = 150
const NODE_Y_STEP = 38
const ROOT_Y = 176

function skillKey(characterId: string, nodeId: string): string {
  return `${characterId}_${nodeId}`
}

interface GraphEntry {
  key: string
  kind: 'skill' | 'lock'
  pos: [number, number]
  group: string
  node?: SkillTreeNode
  isRoot: boolean
  isDefaultFocus: boolean
  gateCount?: number
  connectsTo: string[]
}

// Threads each branch into a linked chain of skill nodes, splicing in a
// synthetic lock node wherever a node declares `gatedAfterBranchSkills` — the
// same shape as skilltree_wilson.lua's own torch/beard lock nodes.
function buildGraph(character: CharacterDef): GraphEntry[] {
  const entries: GraphEntry[] = []
  let defaultFocusAssigned = false

  character.skillTree!.branches.forEach((branch, branchIndex) => {
    const x = branchIndex * BRANCH_X_STEP
    let y = ROOT_Y
    let prevEntry: GraphEntry | null = null

    const link = (entry: GraphEntry) => {
      if (prevEntry) prevEntry.connectsTo.push(entry.key)
      entries.push(entry)
      prevEntry = entry
      y -= NODE_Y_STEP
    }

    branch.nodes.forEach((node, nodeIndex) => {
      const key = skillKey(character.id, node.id)

      if (node.gatedAfterBranchSkills !== undefined && nodeIndex > 0) {
        link({
          key: `${key}_lock`,
          kind: 'lock',
          pos: [x, y],
          group: branch.name,
          isRoot: false,
          isDefaultFocus: false,
          gateCount: node.gatedAfterBranchSkills,
          connectsTo: [],
        })
      }

      const isDefaultFocus = !defaultFocusAssigned && branchIndex === 0 && nodeIndex === 0
      if (isDefaultFocus) defaultFocusAssigned = true

      link({
        key,
        kind: 'skill',
        pos: [x, y],
        group: branch.name,
        node,
        isRoot: nodeIndex === 0,
        isDefaultFocus,
        connectsTo: [],
      })
    })
  })

  return entries
}

function emitEntry(entry: GraphEntry): string[] {
  const lines: string[] = []
  lines.push(`        ${entry.key} = {`)
  if (entry.kind === 'skill') {
    lines.push(`            title = ${luaString(entry.node!.title)},`)
    lines.push(`            desc = ${luaString(entry.node!.desc)},`)
  } else {
    lines.push(`            desc = ${luaString(`Requires ${entry.gateCount} earlier skills in this branch.`)},`)
  }
  lines.push(`            pos = {${entry.pos[0]}, ${entry.pos[1]}},`)
  lines.push(`            group = ${luaString(entry.group)},`)
  const tags = entry.kind === 'lock' ? [entry.group, 'lock'] : [entry.group]
  lines.push(`            tags = ${luaStringArray(tags)},`)
  if (entry.isRoot) lines.push('            root = true,')
  if (entry.isDefaultFocus) lines.push('            defaultfocus = true,')
  if (entry.connectsTo.length > 0) {
    lines.push(`            connects = ${luaStringArray(entry.connectsTo)},`)
  }
  if (entry.kind === 'lock') {
    lines.push('            lock_open = function(prefabname, activatedskills, readonly)')
    lines.push(
      `                return SkillTreeFns.CountTags(prefabname, ${luaString(entry.group)}, activatedskills) >= ${entry.gateCount}`,
    )
    lines.push('            end,')
  }
  if (entry.kind === 'skill' && entry.node!.addsTag) {
    const tag = luaString(entry.node!.addsTag)
    lines.push('            onactivate = function(inst, fromload)')
    lines.push(`                inst:AddTag(${tag})`)
    lines.push('            end,')
    lines.push('            ondeactivate = function(inst, fromload)')
    lines.push(`                inst:RemoveTag(${tag})`)
    lines.push('            end,')
  }
  lines.push('        },')
  return lines
}

// PLACEHOLDER icons: real skill nodes need an `icon` field plus a matching
// RegisterSkilltreeIconsAtlas call in modmain.lua (see docs/dst-knowledge/
// patterns.md#28) — omitted here since this tool has no art pipeline. Nodes
// still work without one, just rendered with no icon graphic.
export function generateSkillTreeFile(character: CharacterDef): string {
  const tree = character.skillTree!
  const entries = buildGraph(character)
  const lines: string[] = []

  lines.push('-- PLACEHOLDER icons: add an `icon = "..."` field per node once you have')
  lines.push('-- matching art under images/skilltree/, then register each atlas from')
  lines.push('-- modmain.lua with RegisterSkilltreeIconsAtlas (see README).')
  lines.push('')
  lines.push('local ORDERS = {')
  tree.branches.forEach((branch, i) => {
    lines.push(`    {${luaString(branch.name)}, {${i * BRANCH_X_STEP}, 0}},`)
  })
  lines.push('}')
  lines.push('')
  lines.push('local function BuildSkillsData(SkillTreeFns)')
  lines.push('    local skills = {')
  for (const entry of entries) {
    lines.push(...emitEntry(entry))
  }
  lines.push('    }')
  lines.push('')
  lines.push('    return {')
  lines.push('        SKILLS = skills,')
  lines.push('        ORDERS = ORDERS,')
  lines.push('    }')
  lines.push('end')
  lines.push('')
  lines.push('return BuildSkillsData')

  return lines.join('\n') + '\n'
}
