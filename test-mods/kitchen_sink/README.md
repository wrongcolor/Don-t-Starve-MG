# Test Mod

Este mod foi gerado pelo DST Mod Creator. Os scripts Lua estão prontos e usam a API
atual do Don't Starve Together (AddRecipe2, ismastersim, AddModCharacter, etc.).

## O que NÃO foi gerado (requer trabalho manual)

Esta ferramenta gera apenas código Lua. Assets visuais precisam ser produzidos
separadamente com as ferramentas de arte da Klei (Spriter/ktools) e colocados nos
caminhos abaixo, substituindo os placeholders:

- **Itens**: `images/inventoryimages/<id>.xml`/`.tex` (ícone de inventário, sempre necessário).
  - `testsword`: reaproveita o build "flint" do jogo base — nenhum `anim/*.zip` próprio é necessário.
    - ATENÇÃO: é um item empunhável (ferramenta/arma) usando build vanilla — confirme se `swap_flint` existe no jogo base antes de publicar.
  - `testtrinket`: reaproveita o build "trinket_1" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `testaxe`: reaproveita o build "rocks" do jogo base — nenhum `anim/*.zip` próprio é necessário.
    - ATENÇÃO: é um item empunhável (ferramenta/arma) usando build vanilla — confirme se `swap_rocks` existe no jogo base antes de publicar.
  - `testfirestaff`: reaproveita o build "nightmarefuel" do jogo base — nenhum `anim/*.zip` próprio é necessário.
    - ATENÇÃO: é um item empunhável (ferramenta/arma) usando build vanilla — confirme se `swap_nightmarefuel` existe no jogo base antes de publicar.
  - `testarmor`: reaproveita o build "log" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `testfood`: reaproveita o build "cutgrass" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `testspellbook`: reaproveita o build "goldnugget" do jogo base — nenhum `anim/*.zip` próprio é necessário.
- **Estruturas**: `images/inventoryimages/<id>.xml`/`.tex` (ícone de inventário, sempre necessário).
  - `teststructure`: reaproveita o build "treasurechest" do jogo base — nenhum `anim/*.zip` próprio é necessário.
- **Criaturas**: por padrão reaproveitam o build "pigman" do jogo base — só precisam de `anim/<id>.zip` próprio se a animação for explicitamente marcada como personalizada.
  - `testmob`: reaproveita o build "spider" do jogo base — confirme em-jogo que as animações "idle"/"walk"/"atk"/"hit"/"death" existem nesse build antes de publicar (não verificado por esta ferramenta).
  - `testspidermob`: reaproveita o build "spider" do jogo base — confirme em-jogo que as animações "idle"/"walk"/"atk"/"hit"/"death" existem nesse build antes de publicar (não verificado por esta ferramenta).
  - `testhound`: reaproveita o build "hound" do jogo base — confirme em-jogo que as animações "idle"/"walk"/"atk"/"hit"/"death" existem nesse build antes de publicar (não verificado por esta ferramenta).
- **Mundo (Rooms/Tasks)**: gerados em `modworldgenmain.lua`, na raiz do mod — o jogo carrega
  esse arquivo automaticamente durante a geração de mundo, sem precisar de nenhum registro
  extra (confirmado lendo um mod real publicado, ver docs/dst-knowledge/patterns.md#22).
  Cada Task também é inserida via `AddTaskSetPreInitAny` nas localizações (superfície/
  cavernas) marcadas no formulário — sem isso a Task nunca apareceria em nenhum mundo gerado.

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
- [ ] Para cada criatura: `c_spawn("<id>")` e observar se anda/ataca sem erro no log.
