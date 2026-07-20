import JSZip from 'jszip'
import type { ModProject } from '../types/modProject'
import { generateModInfo } from './modinfo'
import { generateModMain } from './modmain'
import { generateItemFiles, isHandheld } from './item'
import { generateCharacterFiles } from './character'
import { generateSpeechFile } from './speech'
import { generateCreatureFiles } from './creature'
import { generateWorldContentFiles } from './worldContent'

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
  if (project.characters.length > 0) {
    lines.push('- **Personagens**: builds em `anim/`, ícone de seleção e ícone de minimapa.')
    for (const character of project.characters) {
      lines.push(
        `  - \`${character.id}\`: por padrão usa o build do Wilson como placeholder (arquivo carrega, mas com a aparência do Wilson) — troque \`anim/player_wilson*.zip\` no prefab por um build próprio.`,
      )
    }
  }
  if (project.creatures.length > 0) {
    lines.push('- **Criaturas**: build próprio em `anim/<id>.zip`, a menos que a criatura reaproveite um build do jogo base.')
    for (const creature of project.creatures) {
      if (creature.animation?.source === 'vanilla') {
        const { build, clips } = creature.animation
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

export function buildModFiles(project: ModProject): Record<string, string> {
  const files: Record<string, string> = {
    'modinfo.lua': generateModInfo(project.meta),
    'modmain.lua': generateModMain(project),
    'README.md': generateReadme(project),
  }

  for (const item of project.items) {
    Object.assign(files, generateItemFiles(item))
  }
  for (const character of project.characters) {
    const speech = generateSpeechFile(character)
    Object.assign(files, generateCharacterFiles(character, speech))
  }
  for (const creature of project.creatures) {
    Object.assign(files, generateCreatureFiles(creature))
  }
  Object.assign(files, generateWorldContentFiles(project))

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
