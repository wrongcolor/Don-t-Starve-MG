import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { generateSkillTreeFile } from '../../generators/skillTree'
import { generateCharacterFiles } from '../../generators/character'
import { generateModMain } from '../../generators/modmain'
import { sampleProject } from '../fixtures'
import { characterDefSchema, type CharacterDef } from '../../types/modProject'

const characterWithSkillTree: CharacterDef = {
  ...sampleProject.characters[0],
  skillTree: {
    branches: [
      {
        name: 'alchemy',
        nodes: [
          { id: 'alchemy_1', title: 'Alchemy I', desc: 'The first step.' },
          { id: 'alchemy_2', title: 'Alchemy II', desc: 'The second step.', addsTag: 'fast_alchemy' },
          { id: 'alchemy_3', title: 'Alchemy III', desc: 'Locked behind the branch.', gatedAfterBranchSkills: 2 },
        ],
      },
    ],
  },
}

describe('generateSkillTreeFile', () => {
  const code = generateSkillTreeFile(characterWithSkillTree)

  it('parses as valid Lua', () => {
    expect(() => parse(code, { luaVersion: '5.1' })).not.toThrow()
  })

  it('returns a BuildSkillsData function, matching the vanilla file shape', () => {
    expect(code).toContain('local function BuildSkillsData(SkillTreeFns)')
    expect(code).toContain('return BuildSkillsData')
  })

  it('marks the first node of the first branch as root and default focus', () => {
    expect(code).toContain('testchar_alchemy_1 = {')
    expect(code).toContain('root = true')
    expect(code).toContain('defaultfocus = true')
  })

  it('chains nodes together with connects', () => {
    expect(code).toContain('connects = { "testchar_alchemy_2" }')
  })

  it('emits AddTag/RemoveTag for a node with addsTag', () => {
    expect(code).toContain('inst:AddTag("fast_alchemy")')
    expect(code).toContain('inst:RemoveTag("fast_alchemy")')
  })

  it('splices in a lock node using SkillTreeFns.CountTags for a gated skill', () => {
    expect(code).toContain('testchar_alchemy_3_lock = {')
    expect(code).toContain('tags = { "alchemy", "lock" }')
    expect(code).toContain('return SkillTreeFns.CountTags(prefabname, "alchemy", activatedskills) >= 2')
    expect(code).toContain('connects = { "testchar_alchemy_3" }')
  })
})

describe('skillTreeSchema uniqueness', () => {
  // generateSkillTreeFile keys each Lua table entry as `${characterId}_${node.id}`
  // with no branch component in that key — two nodes sharing an id (even across
  // different branches) would otherwise collide into one Lua table entry, silently
  // dropping one skill from the generated mod with no build-time error.
  it('rejects two skill nodes sharing an id across different branches', () => {
    const withDuplicateId: CharacterDef = {
      ...sampleProject.characters[0],
      skillTree: {
        branches: [
          { name: 'alchemy', nodes: [{ id: 'skill_1', title: 'Alchemy I', desc: 'a' }] },
          { name: 'combat', nodes: [{ id: 'skill_1', title: 'Combat I', desc: 'b' }] },
        ],
      },
    }

    expect(characterDefSchema.safeParse(withDuplicateId).success).toBe(false)
  })
})

describe('generateCharacterFiles with a skill tree', () => {
  it('adds a skilltree_<id>.lua file only when the character has one', () => {
    const withoutTree = generateCharacterFiles(sampleProject.characters[0], '')
    expect(Object.keys(withoutTree)).not.toContain('scripts/prefabs/skilltree_testchar.lua')

    const withTree = generateCharacterFiles(characterWithSkillTree, '')
    expect(Object.keys(withTree)).toContain('scripts/prefabs/skilltree_testchar.lua')
  })
})

describe('generateModMain with a skill tree (patterns.md#28)', () => {
  const withSkillTree = { ...sampleProject, characters: [characterWithSkillTree] }
  const code = generateModMain(withSkillTree)

  it('lists the skilltree prefab file', () => {
    expect(code).toContain('"skilltree_testchar"')
  })

  it('requires skilltree_defs and registers the tree', () => {
    expect(code).toContain('local skilltree_defs = require("prefabs/skilltree_defs")')
    expect(code).toContain('local testchar_skilltree_data = require("prefabs/skilltree_testchar")(skilltree_defs.FN)')
    expect(code).toContain('skilltree_defs.CreateSkillTreeFor("testchar", testchar_skilltree_data.SKILLS)')
    expect(code).toContain('skilltree_defs.SKILLTREE_ORDERS["testchar"] = testchar_skilltree_data.ORDERS')
  })

  it('does not require skilltree_defs when no character has a skill tree', () => {
    const plainCode = generateModMain(sampleProject)
    expect(plainCode).not.toContain('skilltree_defs')
  })
})
