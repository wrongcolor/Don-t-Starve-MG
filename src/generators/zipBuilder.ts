import JSZip from 'jszip'
import type { ModProject } from '../types/modProject'
import { generateModInfo } from './modinfo'
import { generateModMain } from './modmain'
import { generateItemFiles, isHandheld } from './item'
import { generateStructureFiles } from './structure'
import { generateCharacterFiles } from './character'
import { generateSpeechFile } from './speech'
import { generateCreatureFiles } from './creature'
import { resolveCreatureAnimation, isVanillaCreatureAnimation } from './creatureAnimation'
import { generateWorldContentFiles } from './worldContent'
import { generateManaComponentFile, generateManaBadgeWidgetFile } from './mana'

function generateReadme(project: ModProject): string {
  const lines: string[] = []
  lines.push(`# ${project.meta.name}`)
  lines.push('')
  lines.push('Este mod foi gerado pelo DST Mod Creator. Os scripts Lua estão prontos e usam a API')
  lines.push('atual do Don\'t Starve Together (AddRecipe2, ismastersim, AddModCharacter, etc.).')
  lines.push('')
  lines.push('## O que NÃO foi gerado (requer trabalho manual)')
  lines.push('')
  lines.push('Esta ferramenta gera apenas código Lua. Assets visuais precisam ser produzidos')
  lines.push('separadamente com as ferramentas de arte da Klei (Spriter/ktools) e colocados nos')
  lines.push('caminhos abaixo, substituindo os placeholders:')
  lines.push('')

  if (project.items.length > 0) {
    lines.push('- **Itens**: `images/inventoryimages/<id>.xml`/`.tex` (ícone de inventário, sempre necessário).')
    for (const item of project.items) {
      const handheld = isHandheld(item)
      if (item.animation?.source === 'vanilla') {
        lines.push(
          `  - \`${item.id}\`: reaproveita o build "${item.animation.build}" do jogo base — nenhum \`anim/*.zip\` próprio é necessário.`,
        )
        if (handheld) {
          lines.push(
            `    - ATENÇÃO: é um item empunhável (ferramenta/arma) usando build vanilla — confirme se \`swap_${item.animation.build}\` existe no jogo base antes de publicar.`,
          )
        }
      } else {
        lines.push(`  - \`${item.id}\`: precisa de \`anim/${item.id}.zip\` (build/bank "${item.id}", animação "idle").`)
        if (handheld) {
          lines.push(
            `    - Por ser empunhável, também precisa de \`anim/swap_${item.id}.zip\` (aparência na mão do personagem).`,
          )
        }
      }
    }
  }
  if (project.structures.length > 0) {
    lines.push('- **Estruturas**: `images/inventoryimages/<id>.xml`/`.tex` (ícone de inventário, sempre necessário).')
    for (const structure of project.structures) {
      if (structure.animation?.source === 'vanilla') {
        lines.push(
          `  - \`${structure.id}\`: reaproveita o build "${structure.animation.build}" do jogo base — nenhum \`anim/*.zip\` próprio é necessário.`,
        )
      } else {
        lines.push(`  - \`${structure.id}\`: precisa de \`anim/${structure.id}.zip\` (build/bank "${structure.id}", animação "idle").`)
      }
    }
  }
  if (project.characters.length > 0) {
    lines.push('- **Personagens**: builds em `anim/`, ícone de seleção e ícone de minimapa.')
    for (const character of project.characters) {
      if (character.animation?.source === 'vanilla') {
        lines.push(
          `  - \`${character.id}\`: reaproveita o build "${character.animation.build}" do jogo base como placeholder visual — nenhum \`anim/*.zip\` próprio é necessário, mas a aparência final ainda será a desse personagem vanilla até você trocar por um build real.`,
        )
      } else {
        lines.push(
          `  - \`${character.id}\`: precisa de \`anim/${character.id}.zip\` (build/bank próprio) e \`anim/ghost_${character.id}_build.zip\` (build de fantasma).`,
        )
      }
    }
  }
  if (project.creatures.length > 0) {
    lines.push('- **Criaturas**: por padrão reaproveitam o build "pigman" do jogo base — só precisam de `anim/<id>.zip` próprio se a animação for explicitamente marcada como personalizada.')
    for (const creature of project.creatures) {
      if (isVanillaCreatureAnimation(creature)) {
        const { build, clips } = resolveCreatureAnimation(creature)
        lines.push(
          `  - \`${creature.id}\`: reaproveita o build "${build}" do jogo base — confirme em-jogo que as animações "${clips.idle}"/"${clips.walk}"/"${clips.atk}"/"${clips.hit}"/"${clips.death}" existem nesse build antes de publicar (não verificado por esta ferramenta).`,
        )
      } else {
        lines.push(`  - \`${creature.id}\`: precisa de build/bank "${creature.id}" com pelo menos as animações idle/walk/atk/hit/death.`)
      }
    }
  }

  if (project.rooms.length > 0 || project.tasks.length > 0) {
    lines.push('- **Mundo (Rooms/Tasks)**: gerados em `modworldgenmain.lua`, na raiz do mod — o jogo carrega')
    lines.push('  esse arquivo automaticamente durante a geração de mundo, sem precisar de nenhum registro')
    lines.push('  extra (confirmado lendo um mod real publicado, ver docs/dst-knowledge/patterns.md#22).')
    lines.push('  Cada Task também é inserida via `AddTaskSetPreInitAny` nas localizações (superfície/')
    lines.push('  cavernas) marcadas no formulário — sem isso a Task nunca apareceria em nenhum mundo gerado.')
  }

  lines.push('')
  lines.push('Fala de personagem (`speech_<id>.lua`) usa fallback para `speech_wilson` — só as')
  lines.push('falas customizadas no formulário foram sobrescritas; o resto herda do Wilson.')
  lines.push('')
  lines.push('## Como instalar')
  lines.push('')
  lines.push('1. Copie esta pasta inteira para `Documents/Klei/DoNotStarveTogether/mods/`.')
  lines.push('2. Abra o jogo, vá em "Mods" e ative o mod.')
  lines.push('3. Reinicie o jogo se solicitado.')
  lines.push('')
  lines.push('## Checklist de verificação manual')
  lines.push('')
  lines.push('- [ ] O mod aparece na lista de mods sem erro (valida `modinfo.lua`/`api_version`).')
  lines.push('- [ ] O mod ativa sem erro no console (F1) ao carregar um mundo.')
  if (project.items.length > 0) {
    lines.push('- [ ] Para cada item: `c_give("<id>")` no console e verificar se craft aparece na aba certa.')
  }
  if (project.structures.length > 0) {
    lines.push('- [ ] Para cada estrutura: craftar e posicionar no mundo, e martelar pra confirmar que ela sai (hammer-destroy).')
  }
  if (project.characters.length > 0) {
    lines.push('- [ ] Para cada personagem: aparece na tela de seleção e carrega sem crash.')
  }
  if (project.items.some((i) => i.nameable)) {
    lines.push(
      '- [ ] Para cada item renomeável: verifique se a pena de pluma (`featherpencil`) consegue abrir a caixa de ' +
        'texto nele — não é automático (ver docs/dst-knowledge/patterns.md#24); pode ser preciso registrar o item ' +
        'manualmente como alvo válido em `AddPrefabPostInit("featherpencil", ...)`.',
    )
  }
  if (project.creatures.length > 0) {
    lines.push('- [ ] Para cada criatura: `c_spawn("<id>")` e observar se anda/ataca sem erro no log.')
  }
  lines.push('')

  return lines.join('\n')
}

// Items, characters, and creatures all write their prefab to the SAME
// scripts/prefabs/<id>.lua path — an id reused across two of those categories
// silently drops one file from the zip (Object.assign just overwrites it),
// with no error shown anywhere. Checked up front so it surfaces as a clear
// message instead of a mysteriously missing prefab in the published mod.
function findDuplicatePrefabId(project: ModProject): string | undefined {
  const seen = new Set<string>()
  for (const id of [
    ...project.items.map((i) => i.id),
    ...project.structures.map((s) => s.id),
    ...project.characters.map((c) => c.id),
    ...project.creatures.map((c) => c.id),
  ]) {
    if (seen.has(id)) return id
    seen.add(id)
  }
  return undefined
}

// A 'linkedContainer' spellbook (item.ts) reads its spells at runtime from
// another item's container contents by prefab id — a single item's own zod
// schema can't see its siblings, so this cross-item reference is only
// checkable once the whole project is in hand, same reasoning as
// findDuplicatePrefabId above. "spell" is a fixed convention (spellDef items
// always get AddTag("spell"), see item.ts) — the referenced container must
// actually accept them, or every codex silently rejects every spell.
function findBrokenSpellbookContainerLink(project: ModProject): string | undefined {
  for (const item of project.items) {
    if (item.spellbook?.source !== 'linkedContainer') continue

    const containerItemId = item.spellbook.containerItemId
    const target = project.items.find((i) => i.id === containerItemId)
    if (target === undefined) {
      return `Item "${item.id}"'s spellbook points to container item "${containerItemId}", but no item with that id exists in this mod.`
    }
    if (target.container === undefined) {
      return `Item "${item.id}"'s spellbook points to "${containerItemId}", but that item has no container set up.`
    }
    if (target.container.acceptsTag !== 'spell') {
      return `Item "${item.id}"'s spellbook points to "${containerItemId}"'s container, but that container's "accepts tag" isn't set to "spell" — it would reject every spell item placed in it.`
    }
  }
  return undefined
}

export function buildModFiles(project: ModProject): Record<string, string> {
  const duplicateId = findDuplicatePrefabId(project)
  if (duplicateId) {
    throw new Error(
      `The id "${duplicateId}" is used by more than one item/character/creature — each needs a unique id, since they all generate scripts/prefabs/${duplicateId}.lua.`,
    )
  }

  const brokenSpellbookLink = findBrokenSpellbookContainerLink(project)
  if (brokenSpellbookLink) {
    throw new Error(brokenSpellbookLink)
  }

  const files: Record<string, string> = {
    'modinfo.lua': generateModInfo(project.meta),
    'modmain.lua': generateModMain(project),
    'README.md': generateReadme(project),
  }

  for (const item of project.items) {
    Object.assign(files, generateItemFiles(item))
  }
  for (const structure of project.structures) {
    Object.assign(files, generateStructureFiles(structure))
  }
  for (const character of project.characters) {
    const speech = generateSpeechFile(character)
    Object.assign(files, generateCharacterFiles(character, speech))
  }
  for (const creature of project.creatures) {
    Object.assign(files, generateCreatureFiles(creature))
  }
  Object.assign(files, generateWorldContentFiles(project))

  // Shared by every character with .mana set (see character.ts/modmain.ts) —
  // generated once regardless of how many characters use it, same as the
  // Combine action/container params being wired once in modmain.ts.
  if (project.characters.some((c) => c.mana)) {
    files['scripts/components/mana.lua'] = generateManaComponentFile()
    files['scripts/widgets/manabadge.lua'] = generateManaBadgeWidgetFile()
  }

  return files
}

export async function buildModZip(project: ModProject): Promise<Blob> {
  const zip = new JSZip()
  const files = buildModFiles(project)
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content)
  }
  return zip.generateAsync({ type: 'blob' })
}
