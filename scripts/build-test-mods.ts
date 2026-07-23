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
    const files = buildModFiles(project)
    const { fileCount, errors } = await writeModFiles(slug, files)

    console.log(`${slug}: ${fileCount} files written to test-mods/${slug}/`)
    if (errors.length > 0) {
      hadErrors = true
      console.log(`  ${errors.length} Lua file(s) failed to parse:`)
      for (const err of errors) console.log(`    - ${err}`)
    }
  }

  if (hadErrors) process.exit(1)
}

main()
