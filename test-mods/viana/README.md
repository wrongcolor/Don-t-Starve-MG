# Viana, the Sunwitch

Este mod foi gerado pelo DST Mod Creator. Os scripts Lua estão prontos e usam a API
atual do Don't Starve Together (AddRecipe2, ismastersim, AddModCharacter, etc.).

## O que NÃO foi gerado (requer trabalho manual)

Esta ferramenta gera apenas código Lua. Assets visuais precisam ser produzidos
separadamente com as ferramentas de arte da Klei (Spriter/ktools) e colocados nos
caminhos abaixo, substituindo os placeholders:

- **Itens**: `images/inventoryimages/<id>.xml`/`.tex` (ícone de inventário, sempre necessário).
  - `solarlantern`: reaproveita o build "lantern" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `suncodex`: reaproveita o build "books" do jogo base — nenhum `anim/*.zip` próprio é necessário.
    - ATENÇÃO: é um item empunhável (ferramenta/arma) usando build vanilla — confirme se `swap_books` existe no jogo base antes de publicar.
  - `emberwispspell`: reaproveita o build "papyrus" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `solsticeblessingspell`: reaproveita o build "papyrus" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `sunfedspell`: reaproveita o build "papyrus" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `sunwispspell`: reaproveita o build "papyrus" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `solargatespell`: reaproveita o build "papyrus" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `solarbeamspell`: reaproveita o build "papyrus" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `refractionspell`: reaproveita o build "papyrus" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `solarnovaspell`: reaproveita o build "papyrus" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `flashbangspell`: reaproveita o build "papyrus" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `solarcagespell`: reaproveita o build "papyrus" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `desintegrationspell`: reaproveita o build "papyrus" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `lightpillarspell`: reaproveita o build "papyrus" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `suntotem`: reaproveita o build "moonrock_idol" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `solarprism`: reaproveita o build "gems" do jogo base — nenhum `anim/*.zip` próprio é necessário.
  - `solarchakram`: reaproveita o build "boomerang" do jogo base — nenhum `anim/*.zip` próprio é necessário.
    - ATENÇÃO: é um item empunhável (ferramenta/arma) usando build vanilla — confirme se `swap_boomerang` existe no jogo base antes de publicar.
- **Personagens**: builds em `anim/`, ícone de seleção e ícone de minimapa.
  - `viana`: reaproveita o build "wendy" do jogo base como placeholder visual — nenhum `anim/*.zip` próprio é necessário, mas a aparência final ainda será a desse personagem vanilla até você trocar por um build real.
- **Criaturas**: por padrão reaproveitam o build "pigman" do jogo base — só precisam de `anim/<id>.zip` próprio se a animação for explicitamente marcada como personalizada.
  - `sunorb`: reaproveita o build "flameball_fx" do jogo base — confirme em-jogo que as animações "idle_loop"/"idle_loop"/"idle_loop"/"idle_loop"/"post" existem nesse build antes de publicar (não verificado por esta ferramenta).
  - `sunwisp`: reaproveita o build "flameball_fx" do jogo base — confirme em-jogo que as animações "idle_loop"/"idle_loop"/"idle_loop"/"idle_loop"/"post" existem nesse build antes de publicar (não verificado por esta ferramenta).
  - `lightpillar`: reaproveita o build "flameball_fx" do jogo base — confirme em-jogo que as animações "idle_loop"/"idle_loop"/"idle_loop"/"idle_loop"/"post" existem nesse build antes de publicar (não verificado por esta ferramenta).
  - `sunportal`: reaproveita o build "teleporter_worm_build" do jogo base — confirme em-jogo que as animações "idle_loop"/"idle_loop"/"idle_loop"/"idle_loop"/"idle_loop" existem nesse build antes de publicar (não verificado por esta ferramenta).

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
- [ ] Para cada personagem: aparece na tela de seleção e carrega sem crash.
- [ ] Para cada criatura: `c_spawn("<id>")` e observar se anda/ataca sem erro no log.
