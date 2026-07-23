import { describe, it, expect } from 'vitest'
import { generateWorldContentFiles } from '../../generators/worldContent'
import { sampleProject } from '../fixtures'

describe('generateWorldContentFiles', () => {
  const [room] = sampleProject.rooms
  const [task] = sampleProject.tasks

  it('generates modworldgenmain.lua plus one file per static layout (patterns.md#22, #55)', () => {
    const files = generateWorldContentFiles(sampleProject)
    expect(Object.keys(files).sort()).toEqual(['modworldgenmain.lua', 'scripts/map/static_layouts/TestGraveyard.lua'])
  })

  it('generates no world content files when there are no rooms/tasks/static layouts', () => {
    const files = generateWorldContentFiles({ ...sampleProject, rooms: [], tasks: [], staticLayouts: [] })
    expect(files).toEqual({})
  })

  it('wires a Room with terrain, tags, fixed prefabs, and scatter decoration', () => {
    const code = generateWorldContentFiles(sampleProject)['modworldgenmain.lua']
    expect(code).toContain('AddRoom("TestGrove", {')
    expect(code).toContain('value = WORLD_TILES.FOREST')
    expect(code).toContain('tags = { "Town" }')
    expect(code).toContain('["pighouse"] = function() return 1 + math.random(3) end')
    expect(code).toContain('distributepercent = 0.1')
    expect(code).toContain('["grass"] = 0.05')
  })

  it('wires a Room referencing a static layout via countstaticlayouts (patterns.md#55)', () => {
    const code = generateWorldContentFiles(sampleProject)['modworldgenmain.lua']
    expect(code).toContain('countstaticlayouts = {')
    expect(code).toContain('["TestGraveyard"] = 1,')
  })

  it('wires a Task with locks, keys_given, room_choices, and region_id', () => {
    const code = generateWorldContentFiles(sampleProject)['modworldgenmain.lua']
    expect(code).toContain('AddTask("Test Island Shard", {')
    expect(code).toContain('locks = { LOCKS.NONE }')
    expect(code).toContain('keys_given = { KEYS.TIER1 }')
    expect(code).toContain('["TestGrove"] = function() return 0 + math.random(3) end')
    expect(code).toContain('room_bg = WORLD_TILES.FOREST')
    expect(code).toContain('region_id = "testisland1"')
  })

  it('registers every Task into matching TaskSets via AddTaskSetPreInitAny (patterns.md#22)', () => {
    const code = generateWorldContentFiles(sampleProject)['modworldgenmain.lua']
    expect(code).toContain('AddTaskSetPreInitAny(function(self)')
    expect(code).toContain('if self.location == "forest" then')
    expect(code).toContain('table.insert(self.tasks, "Test Island Shard")')
  })

  it('groups tasks by location instead of repeating the same self.location check', () => {
    const twoTasks = {
      ...sampleProject,
      tasks: [
        { ...task, id: 'Task A', locations: ['forest' as const] },
        { ...task, id: 'Task B', locations: ['forest' as const] },
        { ...task, id: 'Task C', locations: ['cave' as const] },
      ],
    }
    const code = generateWorldContentFiles(twoTasks)['modworldgenmain.lua']
    expect(code.split('if self.location == "forest"').length - 1).toBe(1)
    expect(code).toContain('table.insert(self.tasks, "Task A")')
    expect(code).toContain('table.insert(self.tasks, "Task B")')
    expect(code).toContain('if self.location == "cave" then')
    expect(code).toContain('table.insert(self.tasks, "Task C")')
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
    const code = generateWorldContentFiles(malicious)['modworldgenmain.lua']
    expect(code).toContain('AddRoom("Evil\\" ) end -- Room", {')
    expect(code).toContain('["x\\") end --"] = 1')
  })

  it('emits a fixed count with no min/max function when a room_choices count is exact', () => {
    const exact = {
      ...sampleProject,
      rooms: [],
      tasks: [{ ...task, roomChoices: [{ roomId: 'TestGrove', count: { min: 2, max: 2 } }] }],
    }
    const code = generateWorldContentFiles(exact)['modworldgenmain.lua']
    expect(code).toContain('["TestGrove"] = 2,')
    expect(code).not.toContain('math.random')
  })
})
