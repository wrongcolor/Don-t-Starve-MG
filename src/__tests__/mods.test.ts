import { describe, it, expect } from 'vitest'
import { parse } from 'luaparse'
import { buildModFiles } from '../generators/zipBuilder'
import type { ModProject } from '../types/modProject'
import { alchemistIsland } from '../../mods/alchemistIsland'
import { castawaysCove } from '../../mods/castawaysCove'
import { eternalBlade } from '../../mods/eternalBlade'
import { vex } from '../../mods/vex'
import { adventurersToolkit } from '../../mods/adventurersToolkit'
import { uShapeCourtyard } from '../../mods/uShapeCourtyard'
import { bogLurker } from '../../mods/bogLurker'
import { meadowHopper } from '../../mods/meadowHopper'
import { portalIdolHelm } from '../../mods/portalIdolHelm'
import { deerclopsAlarm } from '../../mods/deerclopsAlarm'
import { duneStalker } from '../../mods/duneStalker'
import { spikeRod } from '../../mods/spikeRod'
import { viana } from '../../mods/viana'
import { hideawayHut } from '../../mods/hideawayHut'
import { teleportGate } from '../../mods/teleportGate'
import { residentDen } from '../../mods/residentDen'
import { campBedroll } from '../../mods/campBedroll'
import { portableSupplyCrate } from '../../mods/portableSupplyCrate'
import { trailRations } from '../../mods/trailRations'
import { emberRod } from '../../mods/emberRod'
import { calmingCenser } from '../../mods/calmingCenser'
import { engravedPlaque } from '../../mods/engravedPlaque'
import { wrongcolor } from '../../mods/wrongcolor'

const REAL_MODS: Record<string, ModProject> = {
  alchemistIsland,
  castawaysCove,
  eternalBlade,
  vex,
  adventurersToolkit,
  uShapeCourtyard,
  bogLurker,
  meadowHopper,
  portalIdolHelm,
  deerclopsAlarm,
  duneStalker,
  spikeRod,
  viana,
  hideawayHut,
  teleportGate,
  residentDen,
  campBedroll,
  portableSupplyCrate,
  trailRations,
  emberRod,
  calmingCenser,
  engravedPlaque,
  wrongcolor,
}

describe('mods/*.ts (mods/README.md) build to syntactically valid Lua', () => {
  for (const [name, project] of Object.entries(REAL_MODS)) {
    describe(name, () => {
      const files = buildModFiles(project)
      const luaFiles = Object.entries(files).filter(([path]) => path.endsWith('.lua'))

      it('includes modinfo.lua, modmain.lua and README.md', () => {
        expect(files['modinfo.lua']).toBeTruthy()
        expect(files['modmain.lua']).toBeTruthy()
        expect(files['README.md']).toBeTruthy()
      })

      it('produces at least one .lua file', () => {
        expect(luaFiles.length).toBeGreaterThan(0)
      })

      for (const [path, content] of luaFiles) {
        it(`parses without syntax errors: ${path}`, () => {
          expect(() => parse(content, { luaVersion: '5.1' })).not.toThrow()
        })
      }
    })
  }
})
