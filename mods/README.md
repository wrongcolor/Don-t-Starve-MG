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
| 13 | `viana` | Personagem jogável: Viana, a Bruxa do Sol, com kit de 5 itens — `suncodex` (`container` com 3 slots) guarda até 3 feitiços craftáveis (Ember Wisp/Solstice Blessing/Sunfed/Sun Wisp, `item.spellDef`, os stat-effect via `DoDelta`, patterns.md#62), e `sunstaff` (`spellbook` com `source: 'linkedContainer'`) oferece exatamente os que estiverem dentro do codex —, gasto de uma barra de mana própria (`CharacterDef.mana`, HUD badge dedicada) inspirada na Inspiração da Wigfrid, reaproveitando o build da Wendy (`CharacterDef.animation`) como visual provisório. Sun Wisp invoca a creature `sunwisp`: companheira decorativa (`CreatureDef.companion`) com luz de verdade (`CreatureDef.light`, patterns.md#65), build `flameball_fx` reaproveitado do `emberlight` | Gerado |
| 14 | `hideawayHut` | Estrutura com `interior` (`size: 'tiny'`, patterns.md#64): construir e entrar pela própria porta (a estrutura vira uma porta de verdade) leva a uma salinha separada real, via o componente `interiorspawner` do mod publicado "Above the Clouds" — primeiro mod gerado por esta ferramenta com `mod_dependencies` (precisa de "Above the Clouds" instalado também) | Gerado |
| 15 | `teleportGate` | Estrutura com `teleportPair` (patterns.md#23): duas construídas do mesmo tipo se linkam automaticamente, uma leva à outra — build vanilla "wormhole" reaproveitado | Gerado |
| 16 | `residentDen` | Estrutura com `resident` (`components/spawner.lua`): mantém um `pigman` morando nela, que reaparece depois de alguns dias se morrer — build vanilla "pighouse" reaproveitado | Gerado |
| 17 | `campBedroll` | Estrutura com `restStation` (`components/sleepingbag.lua`, patterns.md#57): dormir nela à noite recupera vida/fome/sanidade, com número limitado de usos — build vanilla "tent" reaproveitado | Gerado |
| 18 | `portableSupplyCrate` | Estrutura `deployMode: 'deployableItem'` + `container` própria (a combinação real da Panela Portátil, patterns.md#56): craft vira item, dropa no chão como baú — widget e build vanilla "treasurechest" reaproveitados | Gerado |
| 19 | `trailRations` | Item combinando `stackable` + `perishable` + `edible` + `onEatBuff`: comida empilhável e perecível que cura um pouco e dá um buff de dano temporário ao comer (patterns.md#18) | Gerado |
| 20 | `emberRod` | Item `rechargeable` + `spellEffect` (patterns.md#26): nunca quebra, só recarrega com o tempo em vez de gastar usos — conjura luz (`createLight`) | Gerado |
| 21 | `calmingCenser` | Item com `tameBomb`: arremessa uma nuvem que amansa temporariamente criaturas hostis próximas, via `follower`/`leader` (patterns.md#58) | Gerado |
| 22 | `engravedPlaque` | Item `nameable` (patterns.md#24): placa decorativa que o jogador pode renomear, como placas/lápides | Gerado |
| 23 | `pigVillage` | Estrutura `villagerhouse` (`resident`, build vanilla "pig_house") que hospeda a creature `villager` — primeiro uso do novo `animation.source: 'islandAdventuresShipwrecked'`, reaproveitando o build `wildbore_build` do mod publicado "Island Adventures - Shipwrecked" (`mod_dependencies` real no `modinfo.lua` gerado, workshop id `1467214795`) | Gerado |
| 24 | `monkeyRaidEvent` | Primeiro uso de `WorldEventDef` (mundo, não estrutura): ao entardecer, chance de spawnar 2-4 `raidmonkey` (criatura com `squadAlert`) perto de um jogador aleatório, com chance de soltar ouro — versão destilada do sistema real de piratas do DST (`piratespawner.lua`) | Gerado |
