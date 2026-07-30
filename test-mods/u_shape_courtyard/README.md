# U-Shape Courtyard

Este mod foi gerado pelo DST Mod Creator. Os scripts Lua estão prontos e usam a API
atual do Don't Starve Together (AddRecipe2, ismastersim, AddModCharacter, etc.).

## O que NÃO foi gerado (requer trabalho manual)

Esta ferramenta gera apenas código Lua. Assets visuais precisam ser produzidos
separadamente com as ferramentas de arte da Klei (Spriter/ktools) e colocados nos
caminhos abaixo, substituindo os placeholders:

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
