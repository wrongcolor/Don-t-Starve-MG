# Pig Village

Este mod foi gerado pelo DST Mod Creator. Os scripts Lua estão prontos e usam a API
atual do Don't Starve Together (AddRecipe2, ismastersim, AddModCharacter, etc.).

## O que NÃO foi gerado (requer trabalho manual)

Esta ferramenta gera apenas código Lua. Assets visuais precisam ser produzidos
separadamente com as ferramentas de arte da Klei (Spriter/ktools) e colocados nos
caminhos abaixo, substituindo os placeholders:

- **Estruturas**: `images/inventoryimages/<id>.xml`/`.tex` (ícone de inventário, sempre necessário).
  - `villagerhouse`: reaproveita o build "pig_house" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `sawmill`: reaproveita o build "pig_house" do jogo base — nenhum `anim/*.zip` próprio é necessário.
    - Também precisa de `anim/ui_sawmill.zip` (arte de UI do contêiner, 6 slots).
  - `quarry`: reaproveita o build "pig_house" do jogo base — nenhum `anim/*.zip` próprio é necessário.
    - Também precisa de `anim/ui_quarry.zip` (arte de UI do contêiner, 6 slots).
  - `farmhouse`: reaproveita o build "pig_house" do jogo base — nenhum `anim/*.zip` próprio é necessário.
    - Também precisa de `anim/ui_farmhouse.zip` (arte de UI do contêiner, 6 slots).
  - `barracks`: reaproveita o build "pig_house" do jogo base — nenhum `anim/*.zip` próprio é necessário.
- **Criaturas**: por padrão reaproveitam o build "pigman" do jogo base — só precisam de `anim/<id>.zip` próprio se a animação for explicitamente marcada como personalizada.
  - `villager`: reaproveita o build "wildbore_build" do mod "Island Adventures - Shipwrecked" — confirme em-jogo que as animações "idle"/"walk"/"atk"/"hit"/"death" existem nesse build antes de publicar (não verificado por esta ferramenta).
  - `lumberjack`: reaproveita o build "wildbore_build" do mod "Island Adventures - Shipwrecked" — confirme em-jogo que as animações "idle"/"walk"/"atk"/"hit"/"death" existem nesse build antes de publicar (não verificado por esta ferramenta).
  - `miner`: reaproveita o build "wildbore_build" do mod "Island Adventures - Shipwrecked" — confirme em-jogo que as animações "idle"/"walk"/"atk"/"hit"/"death" existem nesse build antes de publicar (não verificado por esta ferramenta).
  - `farmer`: reaproveita o build "wildbore_build" do mod "Island Adventures - Shipwrecked" — confirme em-jogo que as animações "idle"/"walk"/"atk"/"hit"/"death" existem nesse build antes de publicar (não verificado por esta ferramenta).
  - `guard`: reaproveita o build "wildbore_build" do mod "Island Adventures - Shipwrecked" — confirme em-jogo que as animações "idle"/"walk"/"atk"/"hit"/"death" existem nesse build antes de publicar (não verificado por esta ferramenta).

Fala de personagem (`speech_<id>.lua`) usa fallback para `speech_wilson` — só as
falas customizadas no formulário foram sobrescritas; o resto herda do Wilson.

## Dependência obrigatória

Este mod reaproveita um build de criatura do mod publicado
**"Island Adventures - Shipwrecked"** (Workshop id `workshop-1467214795`,
já declarado em `mod_dependencies` no `modinfo.lua` gerado). Sem ele ativo,
essas criaturas vão carregar sem a arte correta.

## Como instalar

1. Inscreva-se e ative **"Island Adventures - Shipwrecked"** primeiro (ver "Dependência obrigatória" acima).
2. Copie esta pasta inteira para `Documents/Klei/DoNotStarveTogether/mods/`.
3. Abra o jogo, vá em "Mods" e ative este mod.
4. Reinicie o jogo se solicitado.

## Checklist de verificação manual

- [ ] O mod aparece na lista de mods sem erro (valida `modinfo.lua`/`api_version`).
- [ ] O mod ativa sem erro no console (F1) ao carregar um mundo.
- [ ] Para cada estrutura: craftar e posicionar no mundo, e martelar pra confirmar que ela sai (hammer-destroy).
- [ ] Para cada criatura: `c_spawn("<id>")` e observar se anda/ataca sem erro no log.
- [ ] Para cada criatura com build do Island Adventures: com "Island Adventures - Shipwrecked" ativo, `c_spawn("<id>")` e confirmar que a arte carrega sem erro no log.
