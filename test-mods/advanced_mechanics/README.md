# Advanced Mechanics Test Mod

Este mod foi gerado pelo DST Mod Creator. Os scripts Lua estão prontos e usam a API
atual do Don't Starve Together (AddRecipe2, ismastersim, AddModCharacter, etc.).

## O que NÃO foi gerado (requer trabalho manual)

Esta ferramenta gera apenas código Lua. Assets visuais precisam ser produzidos
separadamente com as ferramentas de arte da Klei (Spriter/ktools) e colocados nos
caminhos abaixo, substituindo os placeholders:

- **Itens**: `images/inventoryimages/<id>.xml`/`.tex` (ícone de inventário, sempre necessário).
  - `moonwand`: precisa de `anim/moonwand.zip` (build/bank "moonwand", animação "idle").
    - Por ser empunhável, também precisa de `anim/swap_moonwand.zip` (aparência na mão do personagem).
  - `coldbox`: precisa de `anim/coldbox.zip` (build/bank "coldbox", animação "idle").
  - `namedplaque`: precisa de `anim/namedplaque.zip` (build/bank "namedplaque", animação "idle").
  - `sharpaxe`: precisa de `anim/sharpaxe.zip` (build/bank "sharpaxe", animação "idle").
    - Por ser empunhável, também precisa de `anim/swap_sharpaxe.zip` (aparência na mão do personagem).
- **Estruturas**: `images/inventoryimages/<id>.xml`/`.tex` (ícone de inventário, sempre necessário).
  - `wormholegate`: precisa de `anim/wormholegate.zip` (build/bank "wormholegate", animação "idle").
- **Personagens**: builds em `anim/`, ícone de seleção e ícone de minimapa.
  - `skillmaster`: precisa de `anim/skillmaster.zip` (build/bank próprio) e `anim/ghost_skillmaster_build.zip` (build de fantasma).
- **Criaturas**: por padrão reaproveitam o build "pigman" do jogo base — só precisam de `anim/<id>.zip` próprio se a animação for explicitamente marcada como personalizada.
  - `packwolf`: reaproveita o build "pigman" do jogo base — confirme em-jogo que as animações "idle"/"walk"/"atk"/"hit"/"death" existem nesse build antes de publicar (não verificado por esta ferramenta).
  - `skitterling`: reaproveita o build "pigman" do jogo base — confirme em-jogo que as animações "idle"/"walk"/"atk"/"hit"/"death" existem nesse build antes de publicar (não verificado por esta ferramenta).

Fala de personagem (`speech_<id>.lua`) usa fallback para `speech_wilson` — só as
falas customizadas no formulário foram sobrescritas; o resto herda do Wilson.

## Como instalar

1. Copie esta pasta inteira para `Documents/Klei/DoNotStarveTogether/mods/`.
2. Abra o jogo, vá em "Mods" e ative o mod.
3. Reinicie o jogo se solicitado.

## Checklist de verificação manual

- [ ] O mod aparece na lista de mods sem erro (valida `modinfo.lua`/`api_version`).
- [ ] O mod ativa sem erro no console (F1) ao carregar um mundo.
- [ ] Para cada item: `c_give("<id>")` no console e verificar se craft aparece na aba certa.
- [ ] Para cada estrutura: craftar e posicionar no mundo, e martelar pra confirmar que ela sai (hammer-destroy).
- [ ] Para cada personagem: aparece na tela de seleção e carrega sem crash.
- [ ] Para cada item renomeável: verifique se a pena de pluma (`featherpencil`) consegue abrir a caixa de texto nele — não é automático (ver docs/dst-knowledge/patterns.md#24); pode ser preciso registrar o item manualmente como alvo válido em `AddPrefabPostInit("featherpencil", ...)`.
- [ ] Para cada criatura: `c_spawn("<id>")` e observar se anda/ataca sem erro no log.
