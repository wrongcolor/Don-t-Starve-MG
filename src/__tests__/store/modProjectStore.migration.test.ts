import { describe, expect, it, beforeEach, vi } from 'vitest'

describe('modProjectStore persisted-state migration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
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

  it('backfills armor.condition on items saved before that field existed', async () => {
    localStorage.setItem(
      'dst-mod-creator-project',
      JSON.stringify({
        state: {
          project: {
            meta: { name: 'Old Mod', description: 'x', author: 'x', version: '1.0.0', allClientsRequireMod: true, configOptions: [] },
            items: [
              {
                id: 'oldarmor',
                displayName: 'Old Armor',
                description: 'x',
                category: 'armor',
                armor: { absorption: 0.8 },
                recipe: { ingredients: [{ prefab: 'log', amount: 1 }], techLevel: 'NONE', filters: ['ARMOUR'], placer: false },
              },
            ],
            characters: [],
            creatures: [],
          },
        },
        version: 0,
      }),
    )

    const { useModProjectStore } = await import('../../store/modProjectStore')
    const project = useModProjectStore.getState().project

    expect(project.items[0].armor).toEqual({ absorption: 0.8, condition: 100 })
  })
})
