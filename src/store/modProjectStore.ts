import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModMeta, ModProject, ItemDef, CharacterDef, CreatureDef } from '../types/modProject'
import { createEmptyModProject } from '../types/modProject'
import type { RoomDef, TaskDef } from '../types/worldContent'

interface ModProjectState {
  project: ModProject
  setMeta: (meta: ModMeta) => void
  upsertItem: (item: ItemDef) => void
  removeItem: (id: string) => void
  upsertCharacter: (character: CharacterDef) => void
  removeCharacter: (id: string) => void
  upsertCreature: (creature: CreatureDef) => void
  removeCreature: (id: string) => void
  upsertRoom: (room: RoomDef) => void
  removeRoom: (id: string) => void
  upsertTask: (task: TaskDef) => void
  removeTask: (id: string) => void
  resetProject: () => void
}

function upsertById<T extends { id: string }>(list: T[], entry: T): T[] {
  const index = list.findIndex((e) => e.id === entry.id)
  if (index === -1) return [...list, entry]
  const copy = [...list]
  copy[index] = entry
  return copy
}

// Bumped whenever a REQUIRED field is added to an entity that previously didn't need
// it (e.g. armor.condition) — `merge` below only backfills missing TOP-LEVEL project
// keys (whole arrays like rooms/tasks), not fields inside an already-persisted entity.
// A project saved before such a field existed would otherwise fail schema validation
// (or crash a generator reading it as undefined) the moment the user hits "Generate".
const PROJECT_SCHEMA_VERSION = 1

function migrateProject(persistedState: unknown, version: number): unknown {
  if (persistedState === null || typeof persistedState !== 'object' || !('project' in persistedState)) {
    return persistedState
  }
  const state = persistedState as { project?: { items?: unknown[] } }
  if (version < 1 && Array.isArray(state.project?.items)) {
    state.project.items = state.project.items.map((item) => {
      if (item === null || typeof item !== 'object' || !('armor' in item)) return item
      const armor = (item as { armor?: unknown }).armor
      if (armor === null || typeof armor !== 'object' || 'condition' in armor) return item
      return { ...item, armor: { ...armor, condition: 100 } }
    })
  }
  return state
}

export const useModProjectStore = create<ModProjectState>()(
  persist(
    (set) => ({
      project: createEmptyModProject(),
      setMeta: (meta) => set((state) => ({ project: { ...state.project, meta } })),
      upsertItem: (item) =>
        set((state) => ({ project: { ...state.project, items: upsertById(state.project.items, item) } })),
      removeItem: (id) =>
        set((state) => ({
          project: { ...state.project, items: state.project.items.filter((i) => i.id !== id) },
        })),
      upsertCharacter: (character) =>
        set((state) => ({
          project: { ...state.project, characters: upsertById(state.project.characters, character) },
        })),
      removeCharacter: (id) =>
        set((state) => ({
          project: { ...state.project, characters: state.project.characters.filter((c) => c.id !== id) },
        })),
      upsertCreature: (creature) =>
        set((state) => ({
          project: { ...state.project, creatures: upsertById(state.project.creatures, creature) },
        })),
      removeCreature: (id) =>
        set((state) => ({
          project: { ...state.project, creatures: state.project.creatures.filter((c) => c.id !== id) },
        })),
      upsertRoom: (room) =>
        set((state) => ({ project: { ...state.project, rooms: upsertById(state.project.rooms, room) } })),
      removeRoom: (id) =>
        set((state) => ({
          project: { ...state.project, rooms: state.project.rooms.filter((r) => r.id !== id) },
        })),
      upsertTask: (task) =>
        set((state) => ({ project: { ...state.project, tasks: upsertById(state.project.tasks, task) } })),
      removeTask: (id) =>
        set((state) => ({
          project: { ...state.project, tasks: state.project.tasks.filter((t) => t.id !== id) },
        })),
      resetProject: () => set({ project: createEmptyModProject() }),
    }),
    {
      name: 'dst-mod-creator-project',
      version: PROJECT_SCHEMA_VERSION,
      migrate: migrateProject,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<ModProjectState> | undefined),
        project: { ...createEmptyModProject(), ...(persistedState as Partial<ModProjectState> | undefined)?.project },
      }),
    },
  ),
)
