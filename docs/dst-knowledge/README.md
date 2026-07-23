# Catálogo de conhecimento — Don't Starve Together

Este diretório reúne o que já confirmamos sobre a API de modding de Don't Starve
Together, extraído de análise real dos scripts do jogo (não é chute/memória).

**O que NÃO está aqui:** os arquivos `.lua` originais do jogo. São copyright da
Klei — este catálogo guarda só estatísticas agregadas (nomes de componentes/tags
e quantas vezes aparecem) e trechos curtos ilustrativos que escrevemos nós mesmos
pra documentar o formato de uma chamada, no mesmo espírito de documentar uma API.

## Arquivos

- **`components.json`** — todos os `AddComponent("x")` encontrados em 1488 prefabs
  do jogo, com contagem de frequência. `notes` só é preenchido pros componentes que
  já estudamos de fato (lendo o prefab real); os demais ficam com `notes: null` —
  frequência real, mas sem descrição inventada.
- **`tags.json`** — mesma ideia, para `AddTag("x")`.
- **`patterns.md`** — padrões compostos confirmados (não é 1 componente isolado,
  é "esses componentes + essa sequência de chamadas = esse comportamento"), com
  status de cada um no nosso gerador (implementado / gap conhecido).

## Fonte dos dados

Três fontes, todas de uso público real (não são chute/memória):

1. Uma cópia local de `scripts/prefabs/*.lua` do jogo instalado (1488
   arquivos), em 2026-07.
2. Desde 2026-07-23, uma cópia local completa de `scripts/components/*.lua`
   (821 arquivos), `scripts/stategraphs/*.lua` (261 arquivos, incluindo
   `SGwilson.lua`), e o restante da pasta `scripts/` do jogo (brains, widgets,
   map, etc. — pasta local `Original/`, nunca versionada, ver `.gitignore`).
   Fecha o buraco que a fonte 1 sozinha deixava (implementação *interna* de
   componentes e do stategraph do jogador) — mas só o que já foi lido sob
   demanda está de fato confirmado em `components.json`/`patterns.md`.
3. Uma coleção local de ~80 mods reais publicados no Workshop (nomes citados
   diretamente em `patterns.md` onde usados, ex. "Automation Farm", "Repair
   Combine", "Seafellow"). Vários desses mods embutem `scripts/components/`
   e até `scripts/stategraphs/` próprios (novos componentes, ou patches via
   `AddComponentPostInit`/`AddClassPostConstruct` sobre os componentes reais
   do jogo) — usados pra confirmar assinaturas de API que a cópia de
   `scripts/prefabs/` sozinha não revela (ex. seção 18, `edible:SetOnEatenFn`).
   Um desses mods ("Insight", um mod de tooltips) tem uma pasta
   `scripts/descriptors/` com um arquivo por componente vanilla, cada um lendo
   os campos/métodos reais desse componente — próximo de uma referência de API
   viva pra quase todo componente do jogo.

## Como estender

Quando estudarmos um novo prefab: atualizar a contagem/notes em
`components.json`/`tags.json` se algo novo aparecer, e adicionar em
`patterns.md` qualquer combinação de componentes que forme um comportamento
reconhecível (não documentar componente isolado ali — isso já está nos JSON).
