import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { buildModFiles, buildModZip } from '../../generators/zipBuilder'
import { sampleProject } from '../fixtures'

describe('buildModFiles', () => {
  const files = buildModFiles(sampleProject)

  it('places modinfo.lua, modmain.lua and README.md at the zip root', () => {
    expect(files['modinfo.lua']).toBeTruthy()
    expect(files['modmain.lua']).toBeTruthy()
    expect(files['README.md']).toBeTruthy()
  })

  it('places every prefab script under scripts/prefabs/', () => {
    expect(files['scripts/prefabs/testsword.lua']).toBeTruthy()
    expect(files['scripts/prefabs/teststructure.lua']).toBeTruthy()
    expect(files['scripts/prefabs/teststructure_placer.lua']).toBeTruthy()
    expect(files['scripts/prefabs/testchar.lua']).toBeTruthy()
    expect(files['scripts/prefabs/testmob.lua']).toBeTruthy()
  })

  it('places speech, stategraph and brain files at their expected paths', () => {
    expect(files['scripts/speech_testchar.lua']).toBeTruthy()
    expect(files['scripts/stategraphs/SGtestmob.lua']).toBeTruthy()
    expect(files['scripts/brains/testmobbrain.lua']).toBeTruthy()
  })

  it('documents unbuildable art assets in the README for every content type', () => {
    const readme = files['README.md']
    expect(readme).toContain('testsword')
    expect(readme).toContain('testchar')
    expect(readme).toContain('testmob')
  })

  // A custom container widget always needs its own UI skin (patterns.md#20)
  // regardless of whether the item's own BODY reuses a vanilla build (e.g. a
  // book) — the README used to only ever mention the body art, silently
  // dropping the container art requirement whenever the body was vanilla.
  it('mentions the container UI art requirement even when the item body reuses a vanilla build', () => {
    const codex = {
      ...sampleProject.items[1],
      id: 'testcodex',
      container: { widget: { source: 'custom' as const, slots: 3, columns: 3 }, sideWidget: true },
    }
    const project = { ...sampleProject, items: [...sampleProject.items, codex] }
    const readme = buildModFiles(project)['README.md']
    expect(readme).toContain('anim/ui_testcodex.zip')
  })

  it('tells apart vanilla-build items (no anim.zip needed) from custom-build items in the README', () => {
    const readme = files['README.md']
    expect(readme).toContain('precisa de `anim/testsword.zip`')
    expect(readme).toContain('reaproveita o build "trinket_1" do jogo base')
    expect(readme).not.toContain('precisa de `anim/testtrinket.zip`')
  })

  it('tells apart vanilla-build creatures from custom-build creatures in the README', () => {
    const readme = files['README.md']
    expect(readme).toContain('build/bank "testmob" com pelo menos as animações idle/walk/atk/hit/death')
    expect(readme).toContain('reaproveita o build "spider" do jogo base')
    expect(readme).toContain('confirme em-jogo')
  })

  it('documents a custom-build character needing its own anim/ghost zips in the README, not a hardcoded Wilson placeholder', () => {
    const readme = files['README.md']
    expect(readme).toContain('precisa de `anim/testchar.zip` (build/bank próprio) e `anim/ghost_testchar_build.zip`')
    expect(readme).not.toContain('player_wilson')
    expect(readme).not.toContain('build do Wilson')
  })

  it('tells apart a vanilla-build character (no anim.zip needed) from a custom-build one in the README', () => {
    const vanillaCharProject = {
      ...sampleProject,
      characters: [
        { ...sampleProject.characters[0], animation: { source: 'vanilla' as const, build: 'wendy' } },
      ],
    }
    const readme = buildModFiles(vanillaCharProject)['README.md']
    expect(readme).toContain('reaproveita o build "wendy" do jogo base como placeholder visual')
    expect(readme).not.toContain('anim/testchar.zip')
  })

  it('does not include the shared mana component/widget files when no character has mana', () => {
    expect(files['scripts/components/mana.lua']).toBeUndefined()
    expect(files['scripts/widgets/manabadge.lua']).toBeUndefined()
  })

  it('includes the shared mana component/widget files once when a character has mana', () => {
    const mageProject = {
      ...sampleProject,
      characters: [{ ...sampleProject.characters[0], mana: { max: 100 } }],
    }
    const mageFiles = buildModFiles(mageProject)
    expect(mageFiles['scripts/components/mana.lua']).toBeTruthy()
    expect(mageFiles['scripts/widgets/manabadge.lua']).toBeTruthy()
  })

  it('rejects a project where an item and a character share the same id (they would overwrite the same prefab file)', () => {
    const colliding = {
      ...sampleProject,
      characters: [{ ...sampleProject.characters[0], id: sampleProject.items[0].id }],
    }
    expect(() => buildModFiles(colliding)).toThrow(sampleProject.items[0].id)
  })

  // A linkedContainer spellbook (item.ts) reads its spells from another
  // item's container at runtime by prefab id — none of that is checkable by
  // a single item's own zod schema, so it's validated once here across the
  // whole project, same as the duplicate-id check above.
  describe('linkedContainer spellbook cross-item validation', () => {
    const trinket = sampleProject.items[1]
    const staff = { ...trinket, id: 'teststaff', spellbook: { source: 'linkedContainer' as const, containerItemId: 'testcodex' } }

    it('rejects a spellbook pointing at an item id that does not exist in the project', () => {
      const project = { ...sampleProject, items: [...sampleProject.items, staff] }
      expect(() => buildModFiles(project)).toThrow('testcodex')
    })

    it('rejects a spellbook pointing at an item with no container', () => {
      const codexWithoutContainer = { ...trinket, id: 'testcodex' }
      const project = { ...sampleProject, items: [...sampleProject.items, staff, codexWithoutContainer] }
      expect(() => buildModFiles(project)).toThrow('no container')
    })

    it('rejects a spellbook pointing at a container whose acceptsTag is not "spell"', () => {
      const codexWithWrongTag = {
        ...trinket,
        id: 'testcodex',
        container: { widget: { source: 'custom' as const, slots: 3, columns: 3 }, sideWidget: true, acceptsTag: 'trinket' },
      }
      const project = { ...sampleProject, items: [...sampleProject.items, staff, codexWithWrongTag] }
      expect(() => buildModFiles(project)).toThrow('spell')
    })

    it('accepts a correctly wired spellbook + linked container pair', () => {
      const codex = {
        ...trinket,
        id: 'testcodex',
        container: { widget: { source: 'custom' as const, slots: 3, columns: 3 }, sideWidget: true, acceptsTag: 'spell' },
      }
      const project = { ...sampleProject, items: [...sampleProject.items, staff, codex] }
      expect(() => buildModFiles(project)).not.toThrow()
    })
  })
})

describe('buildModZip round-trip', () => {
  it('reopens with the exact same file tree it was built with', async () => {
    const expectedPaths = Object.keys(buildModFiles(sampleProject)).sort()

    const blob = await buildModZip(sampleProject)
    const reopened = await JSZip.loadAsync(blob)
    const actualPaths = Object.keys(reopened.files)
      .filter((p) => !reopened.files[p].dir)
      .sort()

    expect(actualPaths).toEqual(expectedPaths)
  })

  it('round-trips file content byte-for-byte', async () => {
    const expected = buildModFiles(sampleProject)
    const blob = await buildModZip(sampleProject)
    const reopened = await JSZip.loadAsync(blob)

    for (const [path, content] of Object.entries(expected)) {
      const actual = await reopened.file(path)!.async('string')
      expect(actual).toBe(content)
    }
  })
})
