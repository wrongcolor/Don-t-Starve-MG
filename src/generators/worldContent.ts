import type { ModProject } from '../types/modProject'
import type { RoomDef, TaskDef } from '../types/worldContent'
import { luaString } from './luaUtils'
import { generateStaticLayoutLua, generateStaticLayoutRegistration } from './staticLayout'

// Room/Task ids and prefab names are arbitrary user strings (the real game uses ids
// like "Make a pick"), so every Lua table key derived from them uses bracket+string
// syntax ([luaString(x)] = ...) instead of a bare identifier — safe regardless of
// spaces/quotes, matching the pattern the vanilla game itself uses for non-trivial names.

// Confirmed in rooms/forest/pigs.lua: a fixed range like "3 + math.random(2)" means
// min=4,max=5 (Lua's math.random(n) returns 1..n inclusive) — so a uniform [min,max]
// range is (min-1) + math.random(max-min+1). A single fixed value skips the function.
function countExpr(min: number, max: number): string {
  if (min === max) return String(min)
  return `function() return ${min - 1} + math.random(${max - min + 1}) end`
}

function generateRoomLua(room: RoomDef): string {
  const lines: string[] = []
  lines.push(`AddRoom(${luaString(room.id)}, {`)
  lines.push(`    value = WORLD_TILES.${room.terrain},`)
  if (room.tags.length > 0) {
    lines.push(`    tags = { ${room.tags.map(luaString).join(', ')} },`)
  }
  if (room.requiredPrefabs.length > 0) {
    lines.push(`    required_prefabs = { ${room.requiredPrefabs.map(luaString).join(', ')} },`)
  }
  lines.push('    contents = {')
  if (room.fixedPrefabs.length > 0) {
    lines.push('        countprefabs = {')
    for (const fp of room.fixedPrefabs) {
      lines.push(`            [${luaString(fp.prefab)}] = ${countExpr(fp.count.min, fp.count.max)},`)
    }
    lines.push('        },')
  }
  if (room.scatter) {
    lines.push(`        distributepercent = ${room.scatter.percent},`)
    lines.push('        distributeprefabs = {')
    for (const sp of room.scatter.prefabs) {
      lines.push(`            [${luaString(sp.prefab)}] = ${sp.weight},`)
    }
    lines.push('        },')
  }
  if (room.staticLayouts.length > 0) {
    lines.push('        countstaticlayouts = {')
    for (const sl of room.staticLayouts) {
      lines.push(`            [${luaString(sl.layoutId)}] = ${countExpr(sl.count.min, sl.count.max)},`)
    }
    lines.push('        },')
  }
  lines.push('    },')
  lines.push('})')
  return lines.join('\n') + '\n'
}

function generateTaskLua(task: TaskDef): string {
  const lines: string[] = []
  lines.push(`AddTask(${luaString(task.id)}, {`)
  lines.push(`    locks = { ${task.locks.map((l) => `LOCKS.${l}`).join(', ')} },`)
  lines.push(`    keys_given = { ${task.keysGiven.map((k) => `KEYS.${k}`).join(', ')} },`)
  lines.push('    room_choices = {')
  for (const rc of task.roomChoices) {
    lines.push(`        [${luaString(rc.roomId)}] = ${countExpr(rc.count.min, rc.count.max)},`)
  }
  lines.push('    },')
  lines.push(`    room_bg = WORLD_TILES.${task.backgroundTerrain},`)
  lines.push(`    colour = { r = ${task.colour.r}, g = ${task.colour.g}, b = ${task.colour.b}, a = ${task.colour.a} },`)
  if (task.backgroundRoom) {
    lines.push(`    background_room = ${luaString(task.backgroundRoom)},`)
  }
  if (task.regionId) {
    lines.push(`    region_id = ${luaString(task.regionId)}, -- agrupa com outras Tasks do mesmo region_id numa ilha só (ver README)`)
  }
  lines.push('})')
  return lines.join('\n') + '\n'
}

// Confirmed in a real published Workshop mod ("Graveyard Island", see
// docs/dst-knowledge/patterns.md#22): AddRoom/AddTask calls go directly in a
// file named "modworldgenmain.lua" at the MOD ROOT (a sibling of modmain.lua,
// not under scripts/map/) — the game loads it automatically during world
// generation, no PrefabFiles-style registration needed. This resolves the
// wiring uncertainty patterns.md#16/#17 previously flagged as unconfirmed.
function taskRegistrationBlock(project: ModProject): string[] {
  const taskIdsByLocation = new Map<string, string[]>()
  for (const task of project.tasks) {
    for (const location of task.locations) {
      const ids = taskIdsByLocation.get(location) ?? []
      ids.push(task.id)
      taskIdsByLocation.set(location, ids)
    }
  }
  if (taskIdsByLocation.size === 0) return []

  const lines = ['AddTaskSetPreInitAny(function(self)']
  for (const [location, taskIds] of taskIdsByLocation) {
    lines.push(`    if self.location == ${luaString(location)} then`)
    for (const id of taskIds) {
      lines.push(`        table.insert(self.tasks, ${luaString(id)})`)
    }
    lines.push('    end')
  }
  lines.push('end)')
  return lines
}

export function generateWorldContentFiles(project: ModProject): Record<string, string> {
  if (project.rooms.length === 0 && project.tasks.length === 0 && project.staticLayouts.length === 0) return {}

  const sections: string[] = []
  for (const room of project.rooms) {
    sections.push(generateRoomLua(room))
  }
  for (const task of project.tasks) {
    sections.push(generateTaskLua(task))
  }
  const registration = taskRegistrationBlock(project)
  if (registration.length > 0) {
    sections.push(registration.join('\n') + '\n')
  }
  for (const layout of project.staticLayouts) {
    sections.push(generateStaticLayoutRegistration(layout))
  }

  const files: Record<string, string> = { 'modworldgenmain.lua': sections.join('\n') }
  for (const layout of project.staticLayouts) {
    files[`scripts/map/static_layouts/${layout.id}.lua`] = generateStaticLayoutLua(layout)
  }
  return files
}
