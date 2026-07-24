import type { GroundAttackConfig } from '../types/modProject'
import { toUpperSnake } from './luaUtils'

// Confirmed against Original/stategraphs/stategraphs/SGantlion_angry.lua's
// SpawnSpikes/SpawnBlocks — reuses the real vanilla sandspike_short/med/tall
// and sandblock hazard prefabs directly (already-loaded assets, no art
// needed) instead of replicating Antlion's own frame-perfect CanSpawnSpikeAt
// spacing checks. Scatter is simplified to a random angle+distance within a
// radius via FindWalkableOffset — the same "scatter within a range" idiom
// already used by daySpawner in structure.ts. Shared by item.ts (thrown at a
// reticule point) and creature.ts (fired around the creature itself), so this
// is written once instead of duplicated per entity.
export function groundAttackFunctionBlock(id: string, config: GroundAttackConfig): string[] {
  const upper = toUpperSnake(id)
  const lines = ['local function dogroundattack(pos)']

  lines.push(
    '    local SPIKE_SIZES = { "short", "med", "tall" }',
    `    for i = 1, TUNING.${upper}_SPIKE_COUNT do`,
    `        local offset = FindWalkableOffset(pos, math.random() * TWOPI, math.random() * TUNING.${upper}_RADIUS, 4, true, false)`,
    '        if offset ~= nil then',
    '            SpawnPrefab("sandspike_" .. SPIKE_SIZES[math.random(#SPIKE_SIZES)]).Transform:SetPosition(pos.x + offset.x, 0, pos.z + offset.z)',
    '        end',
    '    end',
  )

  if (config.wallCount > 0) {
    lines.push(
      `    for i = 1, TUNING.${upper}_WALL_COUNT do`,
      `        local offset = FindWalkableOffset(pos, math.random() * TWOPI, math.random() * TUNING.${upper}_RADIUS, 4, true, false)`,
      '        if offset ~= nil then',
      '            SpawnPrefab("sandblock").Transform:SetPosition(pos.x + offset.x, 0, pos.z + offset.z)',
      '        end',
      '    end',
    )
  }

  lines.push('end', '')
  return lines
}
