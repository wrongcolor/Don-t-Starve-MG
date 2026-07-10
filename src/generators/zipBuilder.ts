import JSZip from 'jszip'
import type { ModProject } from '../types/modProject'
import { generateModInfo } from './modinfo'
import { generateModMain } from './modmain'
import { generateItemFiles } from './item'
import { generateCharacterFiles } from './character'
import { generateSpeechFile } from './speech'
import { generateCreatureFiles } from './creature'

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
    lines.push('- **Itens**: `anim/<id>.zip` (build/bank do item) e `images/inventoryimages/<id>.xml`/`.tex`.')
    for (const item of project.items) {
      lines.push(`  - \`${item.id}\`: build/bank "${item.id}", animação "idle".`)
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
    lines.push('- **Criaturas**: `anim/<id>.zip` — sem um build próprio o prefab não carrega (sem fallback seguro possível).')
    for (const creature of project.creatures) {
      lines.push(`  - \`${creature.id}\`: precisa de build/bank "${creature.id}" com pelo menos as animações idle/walk/atk/hit/death.`)
    }
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
