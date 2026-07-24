# Lista de mods

Cada entrada é um `ModProject` real em `mods/<nome>.ts`, gerado e validado via
`npm run build-test-mods` (saída em `test-mods/<nome>/`, pronta pra copiar em
`Documents/Klei/DoNotStarveTogether/mods/`).

| # | Nome | Descrição | Status |
|---|------|-----------|--------|
| 1 | `alchemistIsland` | Ilha pequena separada do continente, piso de grama, com Prestihatitator e baú | Gerado |
| 2 | `eternalBlade` | Arma corpo a corpo sem durabilidade, alcance 3, 45 de dano | Gerado |
| 3 | `vex` | Personagem jogável completo: skill tree, multiplicadores, perks, fala customizada | Gerado |
| 4 | `adventurersToolkit` | 2 itens combináveis + 2 contêineres (vanilla e custom) no mesmo mod | Gerado |
| 5 | `castawaysCove` | Ilha pequena de naufrágio, separada do continente, piso de praia de seixos, com pedras, baú e ouro/gemas espalhados | Gerado |
| 6 | `uShapeCourtyard` | Ilha pequena separada do continente, com uma praça em formato de U desenhada à mão (static layout) — fogueira no meio, luminárias nas pontas | Gerado |
| 7 | `bogLurker` | Criatura hostil completa: build "hound" reaproveitado, aggroRange customizado, hit-and-run (kiting) e cadeia de pânico (fogo/assombração) | Gerado |
| 8 | `meadowHopper` | Criatura amigável (companion): build "pigman" padrão (sem arte própria), segue o jogador, corta árvores e coleta itens perto de si, além de manada e aura de sanidade positiva | Gerado |
| 9 | `portalIdolHelm` | Capacete (armadura de cabeça, `EQUIPSLOTS.HEAD`, reaproveita o build vanilla "football helmet") que também é um ídolo: pode ser entregue ao Portal Celestial (`moonrelic`) pra trocar de personagem | Gerado |
| 10 | `deerclopsAlarm` | Estrutura que, a cada início de dia, tem uma chance de invocar um Deerclops num ponto aleatório dentro de um raio grande ao redor de si (`daySpawner`) | Gerado |
| 11 | `duneStalker` | Criatura hostil (build "spider" reaproveitado) que arremessa espetos e paredes de areia ao redor de si enquanto luta (`groundAttack`, patterns.md#58) | Gerado |
| 12 | `spikeRod` | Item (build "rocks" reaproveitado) que arremessa espetos e paredes de areia num ponto mirado, mesma mira reticule+spellcaster do `spellEffect`/`tameBomb` (`groundAttack`, patterns.md#58) | Gerado |
| 13 | `viana` | Personagem jogável: Viana, a Bruxa do Sol, com cajado próprio (`sunstaff`) que usa `spellbook` pra alternar entre feitiços (cada um com `manaCost`), gasto de uma barra de mana própria (`CharacterDef.mana`, HUD badge dedicada) inspirada na Inspiração da Wigfrid, reaproveitando o build da Wendy (`CharacterDef.animation`) como visual provisório | Gerado |
