import { describe, expect, it, beforeEach } from 'vitest'

describe('modProjectStore persisted-state migration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults rooms/tasks to [] when loading a project saved before that feature existed', async () => {
    localStorage.setItem(
      'dst-mod-creator-project',
      JSON.stringify({
        state: {
          project: {
            meta: { name: 'Old Mod', description: 'x', author: 'x', version: '1.0.0', allClientsRequireMod: true, configOptions: [] },
            items: [],
            characters: [],
            creatures: [],
          },
        },
        version: 0,
      }),
    )

    const { useModProjectStore } = await import('../../store/modProjectStore')
    const project = useModProjectStore.getState().project

    expect(project.rooms).toEqual([])
    expect(project.tasks).toEqual([])
    expect(project.meta.name).toBe('Old Mod')
  })
})
