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
    { name: 'dst-mod-creator-project' },
  ),
)
