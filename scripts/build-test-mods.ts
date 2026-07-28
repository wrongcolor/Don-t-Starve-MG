// Builds one or more sample ModProjects straight through the real generator
// (bypassing the browser UI) and writes each one out, unzipped, under
// test-mods/<slug>/ — ready to inspect the .lua directly or copy into
// Documents/Klei/DoNotStarveTogether/mods/ for manual in-game testing.
// Every generated .lua file is also parsed with luaparse, so a broken
// generator is caught here instead of only after a manual "Generate" click.
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'luaparse'
import { buildModFiles } from '../src/generators/zipBuilder'
import { sampleProject } from '../src/__tests__/fixtures'
import { advancedMechanicsProject } from './fixtures/advancedMechanicsProject'
import { alchemistIsland } from '../mods/alchemistIsland'
import { castawaysCove } from '../mods/castawaysCove'
import { eternalBlade } from '../mods/eternalBlade'
import { vex } from '../mods/vex'
import { adventurersToolkit } from '../mods/adventurersToolkit'
import { uShapeCourtyard } from '../mods/uShapeCourtyard'
import { bogLurker } from '../mods/bogLurker'
import { meadowHopper } from '../mods/meadowHopper'
import { portalIdolHelm } from '../mods/portalIdolHelm'
import { deerclopsAlarm } from '../mods/deerclopsAlarm'
import { duneStalker } from '../mods/duneStalker'
import { spikeRod } from '../mods/spikeRod'
import { viana } from '../mods/viana'
import { hideawayHut } from '../mods/hideawayHut'
import { teleportGate } from '../mods/teleportGate'
import { residentDen } from '../mods/residentDen'
import { campBedroll } from '../mods/campBedroll'
import { portableSupplyCrate } from '../mods/portableSupplyCrate'
import { trailRations } from '../mods/trailRations'
import { emberRod } from '../mods/emberRod'
import { calmingCenser } from '../mods/calmingCenser'
import { engravedPlaque } from '../mods/engravedPlaque'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputRoot = path.join(projectRoot, 'test-mods')

// Internal coverage fixtures (scripts/fixtures/) alongside the real, meaningful
// mods tracked in mods/README.md — both go through the same generate+validate pass.
const TEST_PROJECTS = {
  kitchen_sink: sampleProject,
  advanced_mechanics: advancedMechanicsProject,
  alchemist_island: alchemistIsland,
  castaways_cove: castawaysCove,
  eternal_blade: eternalBlade,
  vex,
  adventurers_toolkit: adventurersToolkit,
  u_shape_courtyard: uShapeCourtyard,
  bog_lurker: bogLurker,
  meadow_hopper: meadowHopper,
  portal_idol_helm: portalIdolHelm,
  deerclops_alarm: deerclopsAlarm,
  dune_stalker: duneStalker,
  spike_rod: spikeRod,
  viana,
  hideaway_hut: hideawayHut,
  teleport_gate: teleportGate,
  resident_den: residentDen,
  camp_bedroll: campBedroll,
  portable_supply_crate: portableSupplyCrate,
  trail_rations: trailRations,
  ember_rod: emberRod,
  calming_censer: calmingCenser,
  engraved_plaque: engravedPlaque,
}

async function writeModFiles(slug: string, files: Record<string, string>) {
  const modDir = path.join(outputRoot, slug)
  await rm(modDir, { recursive: true, force: true })

  const errors: string[] = []
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(modDir, relativePath)
    await mkdir(path.dirname(fullPath), { recursive: true })
    await writeFile(fullPath, content, 'utf8')

    if (relativePath.endsWith('.lua')) {
      try {
        parse(content, { luaVersion: '5.1' })
      } catch (e) {
        errors.push(`${relativePath}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }
  return { fileCount: Object.keys(files).length, errors }
}

async function main() {
  let hadErrors = false

  for (const [slug, project] of Object.entries(TEST_PROJECTS)) {
    try {
      const files = buildModFiles(project)
      const { fileCount, errors } = await writeModFiles(slug, files)

      console.log(`${slug}: ${fileCount} files written to test-mods/${slug}/`)
      if (errors.length > 0) {
        hadErrors = true
        console.log(`  ${errors.length} Lua file(s) failed to parse:`)
        for (const err of errors) console.log(`    - ${err}`)
      }
    } catch (e) {
      hadErrors = true
      console.log(`${slug}: failed to build - ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  if (hadErrors) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
