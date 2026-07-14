import { describe, it, expect } from 'vitest'
import { generateWorldContentFiles } from '../../generators/worldContent'
import { sampleProject } from '../fixtures'

describe('generateWorldContentFiles', () => {
  const [room] = sampleProject.rooms
  const [task] = sampleProject.tasks

  it('generates a single rooms.lua and tasks.lua file when rooms/tasks exist', () => {
    const files = generateWorldContentFiles(sampleProject)
    expect(Object.keys(files).sort()).toEqual(['scripts/map/rooms.lua', 'scripts/map/tasks.lua'].sort())
  })

  it('generates no world content files when there are no rooms/tasks', () => {
    const files = generateWorldContentFiles({ ...sampleProject, rooms: [], tasks: [] })
    expect(files).toEqual({})
  })

  it('wires a Room with terrain, tags, fixed prefabs, and scatter decoration', () => {
    const files = generateWorldContentFiles(sampleProject)
    const code = files['scripts/map/rooms.lua']
    expect(code).toContain('AddRoom("TestGrove", {')
    expect(code).toContain('value = WORLD_TILES.FOREST')
    expect(code).toContain('tags = { "Town" }')
    expect(code).toContain('["pighouse"] = function() return 1 + math.random(3) end')
    expect(code).toContain('distributepercent = 0.1')
    expect(code).toContain('["grass"] = 0.05')
  })

  it('wires a Task with locks, keys_given, room_choices, and region_id', () => {
    const files = generateWorldContentFiles(sampleProject)
    const code = files['scripts/map/tasks.lua']
    expect(code).toContain('AddTask("Test Island Shard", {')
    expect(code).toContain('locks = { LOCKS.NONE }')
    expect(code).toContain('keys_given = { KEYS.TIER1 }')
    expect(code).toContain('["TestGrove"] = function() return 0 + math.random(3) end')
    expect(code).toContain('room_bg = WORLD_TILES.FOREST')
    expect(code).toContain('region_id = "testisland1"')
  })

  it('escapes room/task ids and prefab names with quotes so they cannot break out of the Lua string', () => {
    const malicious = {
      ...sampleProject,
      rooms: [
        {
          ...room,
          id: 'Evil" ) end -- Room',
          fixedPrefabs: [{ prefab: 'x") end --', count: { min: 1, max: 1 } }],
        },
      ],
      tasks: [],
    }
    const code = generateWorldContentFiles(malicious)['scripts/map/rooms.lua']
    expect(code).toContain('AddRoom("Evil\\" ) end -- Room", {')
    expect(code).toContain('["x\\") end --"] = 1')
  })

  it('emits a fixed count with no min/max function when a room_choices count is exact', () => {
    const exact = {
      ...sampleProject,
      tasks: [{ ...task, roomChoices: [{ roomId: 'TestGrove', count: { min: 2, max: 2 } }] }],
    }
    const code = generateWorldContentFiles(exact)['scripts/map/tasks.lua']
    expect(code).toContain('["TestGrove"] = 2,')
    expect(code).not.toContain('math.random')
  })
})
