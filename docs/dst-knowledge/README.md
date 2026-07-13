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

Extraído de uma cópia local de `scripts/prefabs/*.lua` do jogo instalado
(1488 arquivos), em 2026-07. Não inclui `scripts/components/` nem
`scripts/stategraphs/` — então qualquer coisa que dependa da implementação
*interna* de um componente (não só de como ele é chamado no prefab) ou do
stategraph do jogador ainda não está confirmada aqui.

## Como estender

Quando estudarmos um novo prefab: atualizar a contagem/notes em
`components.json`/`tags.json` se algo novo aparecer, e adicionar em
`patterns.md` qualquer combinação de componentes que forme um comportamento
reconhecível (não documentar componente isolado ali — isso já está nos JSON).
