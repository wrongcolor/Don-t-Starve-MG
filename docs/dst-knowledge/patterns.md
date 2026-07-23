# Padrões confirmados

Cada padrão abaixo foi confirmado lendo prefabs reais do jogo (não é suposição).
Status indica se já geramos isso no app (`src/generators/`) ou se é um gap.

## 1. Ferramenta (cortar/minerar/cavar) — **GAP, não implementado**

Confirmado em `axe.lua`, `pickaxe.lua`, `shovel.lua`. Todas seguem o mesmo padrão:

```lua
inst:AddComponent("tool")
inst.components.tool:SetAction(ACTIONS.CHOP, 1)   -- axe: CHOP, pickaxe: MINE, shovel: DIG
```

O segundo argumento (opcional, default 1) é um multiplicador de efetividade —
usado por variantes especiais (ex: machado de vidro lunar usa
`TUNING.MOONGLASSAXE.EFFECTIVENESS`).

A animação de cortar/minerar/cavar **não vem daqui** — é tocada pelo PERSONAGEM
(clipes `chop_pre/chop_loop/chop_pst`, `mine_*`, `dig_*` no stategraph padrão do
jogo, `player_common.lua`). O componente `tool` só habilita a ação; personagens
customizados já herdam essa animação de graça via `MakePlayerCharacter` (que já
usamos em `character.ts`), desde que o build use os nomes de clipe padrão.

**Onde implementar:** `src/generators/item.ts` (componentBlock), condicionado a
`item.category === 'tool'` + um sub-tipo (chop/mine/dig) que ainda não existe no
schema.

## 2. Aparência "na mão" ao equipar (`swap_object`) — **GAP, não implementado**

Confirmado de forma **idêntica** em `axe.lua`, `pickaxe.lua`, `shovel.lua`,
`spear.lua`, `hambat.lua`:

```lua
inst:AddComponent("equippable")
inst.components.equippable:SetOnEquip(onequip)
inst.components.equippable:SetOnUnequip(onunequip)

-- dentro de onequip(inst, owner):
owner.AnimState:OverrideSymbol("swap_object", "swap_axe", "swap_axe")
owner.AnimState:Show("ARM_carry")
owner.AnimState:Hide("ARM_normal")

-- dentro de onunequip(inst, owner):
owner.AnimState:Hide("ARM_carry")
owner.AnimState:Show("ARM_normal")
```

Ponto-chave: o item precisa de **dois builds separados**, não um só —
ex. `axe.zip` (aparência no chão/inventário) **e** `swap_axe.zip` (aparência na
mão). Confirmado nos `assets` de todos os 5 arquivos lidos.

Confirmado também (via `grep` agregado nos 1488 prefabs) que o símbolo trocado
depende do slot de equipamento:

| EQUIPSLOTS | símbolo trocado | contagem |
|---|---|---|
| HANDS | `swap_object` | 113 |
| BODY (armadura) | `swap_body` | 107 |
| HEAD (chapéu) | `swap_hat` | 11 |
| BEARD | (raro, 3 usos) | — |

Cobertura real: 142 prefabs usam `equippable`, 83 desses (58%) usam
`swap_object`/similar — não é universal (alguns equipáveis, como mochilas,
usam outro mecanismo).

**Onde implementar:** `src/generators/item.ts` — qualquer item com `weapon`
ou categoria `tool`/`armor` deveria gerar o par `equippable` + onequip/onunequip,
e o README gerado deveria pedir os dois builds (principal + swap) em vez de um só.

## 3. Dano dinâmico ligado ao apodrecimento (Hambat) — **não modelado**

Confirmado em `hambat.lua`. Diferente do padrão "usos finitos" (finiteuses) que
axe/pickaxe/shovel/spear usam pra durabilidade, o Hambat usa **perishable** como
durabilidade, e o dano é recalculado dinamicamente:

```lua
local function UpdateDamage(inst)
    local dmg = TUNING.HAMBAT_DAMAGE * inst.components.perishable:GetPercent()
    dmg = Remap(dmg, 0, TUNING.HAMBAT_DAMAGE,
                TUNING.HAMBAT_MIN_DAMAGE_MODIFIER * TUNING.HAMBAT_DAMAGE, TUNING.HAMBAT_DAMAGE)
    inst.components.weapon:SetDamage(dmg)
end
-- chamado em: OnLoad, onequip, onunequip, e components.weapon:SetOnAttack(UpdateDamage)
```

Ou seja: dano cai conforme o item apodrece, com um piso mínimo
(`HAMBAT_MIN_DAMAGE_MODIFIER`), recalculado a cada ataque. Confirma que "arma
que perde força com o tempo" é uma mecânica real do jogo, não algo que
inventaríamos — mas hoje nosso schema só aceita dano fixo (`ItemDef.weapon.damage`).

Frequência: 24 de 79 prefabs com `weapon` (~30%) usam `SetOnAttack` para lógica
dinâmica — não é raríssimo, mas também não é a maioria (a maioria usa dano fixo).

**Prioridade:** baixa/média — é uma mecânica "avançada" opcional, não essencial
pro fluxo básico.

## 4. Flutuação em água (`MakeInventoryFloatable`) — **não modelado**

Presente em todos os 5 itens lidos (axe/pickaxe/shovel/spear/hambat), com
parâmetros diferentes de tamanho/física. Não confirmamos os detalhes internos
(não lemos o código do helper), só que é chamado universalmente pra itens que
podem cair na água. Baixa prioridade — cosmético/físico, não afeta jogabilidade
central.

## 5. `weapon`/`tool` como tags automáticas — confirmado, sem ação necessária

Os comentários no próprio código do jogo confirmam:
```lua
--weapon (from weapon component) added to pristine state for optimization
inst:AddTag("weapon")
```
Ou seja, a tag é injetada pelo PRÓPRIO componente (por otimização de rede,
pra checar a tag sem precisar indexar o componente) — se a gente já gera
`AddComponent("weapon")`/`AddComponent("tool")`, não precisa também adicionar a
tag manualmente (o componente real do jogo faz isso; nosso gerador de Lua só
precisa declarar o componente, e quem for jogar já tem o comportamento real).

## 6. Arma à distância com projétil (staffs elementais) — **não modelado**

Confirmado em `staff.lua` (firestaff=vermelho, icestaff=azul). Os dois usam o
mesmo padrão: dano de contato zero, alcance à distância, e um projétil que
carrega o efeito de verdade:

```lua
inst:AddComponent("weapon")
inst.components.weapon:SetDamage(0)                      -- não bate corpo a corpo
inst.components.weapon:SetRange(8, 10)                    -- alcance (min, max)
inst.components.weapon:SetProjectile("fire_projectile")   -- o que é lançado
inst.components.weapon:SetOnAttack(onattack_red)          -- efeito custom no alvo
```

O `onattack_*` é onde a mágica de verdade acontece — no firestaff, incendeia o
alvo (`target.components.burnable:Ignite`); no icestaff, congela
(`target.components.freezable:AddColdness`) e apaga fogo. Ou seja: "arma
elemental" = mesmo componente `weapon`, só que aponta pra um projétil e um
callback de efeito, em vez de dano direto.

**Prioridade:** média/alta — é um arquétipo bem reconhecível ("cajado
elemental"), mas exige gerar também o prefab do projétil, que é escopo novo.

## 7. `spellcaster` — item usado sobre um alvo/ponto pra disparar efeito custom — **não modelado**

Confirmado em telestaff (roxo, teleporta o alvo), greenstaff (verde, desmonta
uma estrutura devolvendo os ingredientes), yellowstaff/opalstaff (cria uma luz
num ponto do chão):

```lua
inst:AddComponent("spellcaster")
inst.components.spellcaster:SetSpellFn(minha_funcao_de_efeito)
inst.components.spellcaster.canuseontargets = true   -- usa sobre uma entidade
inst.components.spellcaster.canuseonpoint = true      -- ou sobre um ponto do chão
inst.components.spellcaster.canonlyuseonrecipes = true -- (green) só em algo craftável
```

Diferente do `weapon`, isso não é combate — é "usar o item sobre algo pra
rodar uma função Lua qualquer". É o mecanismo mais aberto/flexível que
encontramos: qualquer efeito customizado (teleportar, destruir, curar,
invocar) passa por aqui.

**Prioridade:** alta como *conceito*, mas cada efeito específico (teleporte,
destruição) é uma implementação própria — não dá pra generalizar num único
checkbox. Melhor abordagem: modelar 1 efeito de cada vez, conforme o usuário
pedir (ex.: "quero um cajado que teleporta" → aí sim vale a pena).

## 8. Modificador de status enquanto equipado — **não modelado**

Confirmado no `orangestaff` (bengala): `inst.components.equippable.walkspeedmult
= TUNING.CANE_SPEED_MULT` — um multiplicador de velocidade de andar que só
vale enquanto o item está equipado. Generaliza além de staffs: qualquer
equipável (bota, cajado, etc.) pode ter esse campo.

**Prioridade:** média — fácil de implementar (1 campo numérico opcional em
`equippable`), útil pra "bengala"/"botas" tipo itens.

## 9. Custo de sanidade ao usar/atacar — **não modelado**

Confirmado em todo `staff.lua` — cada uso de magia (`onattack_red`,
`teleport_start`, `createlight`, `destroystructure`) desconta sanidade do
personagem via `attacker.components.sanity:DoDelta(-TUNING.SANITY_X)`
(ou `staffsanity`, um componente alternativo mais novo, se presente). Ou seja:
"item mágico custa sanidade pra usar" é uma convenção consistente em todos os
7 staffs, não uma escolha isolada de um item.

**Prioridade:** média — daria pra adicionar como campo opcional em itens
categoria arma/ferramenta ("desconta sanidade ao usar").

## 10. Durabilidade que ignora perda em combate — **não modelado**

Confirmado no `orangestaff`: `finiteuses:SetIgnoreCombatDurabilityLoss(true)` —
flag que faz o item NÃO perder uso ao ser usado como arma (só perde uso na
função específica dele, ex. o teleporte curto da bengala). Contraste com o
padrão padrão (machado perde uso só ao cortar, não ao atacar — ver seção 1).

**Prioridade:** baixa — nicho, mas simples de expor como checkbox.

## 11. Armadura: `swap_body`, sem build separado — **GAP CONFIRMADO, diferente do padrão de arma**

Confirmado em `armor_grass.lua`, `armor_wood.lua`, `armor_marble.lua`,
`armor_sanity.lua`, `armor_bramble.lua` (5 arquivos, padrão idêntico). Isso
**contradiz** a suposição que fizemos pra armas/ferramentas — hoje
`isHandheld()` não cobre `category === 'armor'`, então armadura nunca gera
`equippable` nenhum. Mas o padrão real de armadura também é **diferente** do
de arma: não precisa de build `swap_*` separado, e o unequip usa
`ClearOverrideSymbol` em vez de trocar visibilidade de braço:

```lua
inst:AddComponent("equippable")
inst.components.equippable.equipslot = EQUIPSLOTS.BODY  -- precisa setar explicitamente

local function onequip(inst, owner)
    owner.AnimState:OverrideSymbol("swap_body", "armor_wood", "swap_body") -- MESMO build do item, sem swap_ separado
    inst:ListenForEvent("blocked", OnBlocked, owner)  -- som ao bloquear dano
end

local function onunequip(inst, owner)
    owner.AnimState:ClearOverrideSymbol("swap_body")  -- não usa Show/Hide ARM_carry como arma
    inst:RemoveEventCallback("blocked", OnBlocked, owner)
end
```

**Prioridade:** alta — mesma classe de bug que já corrigimos pra
ferramentas/armas (item existe mas não aparece no personagem).

## 12. Passivos de armadura confirmados

- **`equippable.dapperness`** (armor_sanity): sanidade ganha/perdida
  passivamente enquanto equipado (`TUNING.CRAZINESS_SMALL`,
  `is_magic_dapperness = true`). Generaliza: qualquer armadura pode ter isso.
- **`armor:AddWeakness(tag, extraDamage)`** (armor_grass/wood/bramble): leva
  dano extra de atacantes com uma tag específica (no jogo real é
  "beaver" — uma piada de armadura de madeira ser fraca contra
  castores). Generalizável como "fraqueza contra tag X".
- **`armor.ontakedamage` callback** (armor_sanity): função customizada
  disparada a cada dano recebido — usada pra converter uma % do dano em
  perda de sanidade.
- **Material inflamável** (armor_grass/wood/bramble, NÃO presente em
  armor_marble/armor_sanity): `AddComponent("fuel")` +
  `MakeSmallBurnable(inst, TUNING.SMALL_BURNTIME)` + `MakeSmallPropagator(inst)`
  — só madeira/grama/espinho pegam fogo, pedra/mágico não.
- **`equippable.walkspeedmult`** (armor_marble): confirma que esse campo
  (que já implementamos pros staffs) também se aplica a armadura pesada.

**Não implementado / fora de escopo:** o sistema de espinhos do
`armor_bramble` (`OnAttackOther`/`DoThorns`) é travado a uma skill tree
específica do Wormwood (`skilltreeupdater:IsActivated("wormwood_armor_bramble")`)
— não generaliza pra um mod comum. `shadowlevel` (armor_sanity) é o mesmo
sistema lunar/sombra que já decidimos não modelar.

## 13. Criaturas reais (spider.lua, hound.lua) — confirma o que falta, e o limite do que dá pra confirmar

Lidos os dois arquivos completos. Confirmação importante primeiro: **os nomes
reais dos clipes de animação (idle/walk/atk/hit/death) não estão nesses
arquivos** — ambos usam `inst:SetStateGraph("SGspider")` / `"SGhound")`, e o
conteúdo desses stategraphs mora em `scripts/stategraphs/`, que não temos
nesta cópia. Ou seja, continua sem confirmação a pergunta original sobre
nomes de clipe — o que já era esperado, mas bom ter certeza.

**Atualização (ver seção 36):** `scripts/stategraphs/` agora está disponível
localmente — os nomes reais de clipe para spider/hound (e mais 4 criaturas)
foram confirmados lendo os stategraphs de verdade.

**Mecânicas novas confirmadas, não modeladas hoje:**

- **Alcance de ataque configurável** — `combat:SetRange(min, max)`. Hoje
  `creature.ts` tem isso **fixo em `SetRange(2)`**, sem opção nenhuma no
  formulário. Spider guerreira usa alcance maior — é um valor real que varia
  por criatura.
- **Aura de sanidade** — `AddComponent("sanityaura")` +
  `.aura = -TUNING.SANITYAURA_X`: só de estar perto da criatura, o jogador
  perde (ou ganharia, se positivo) sanidade. Mecânica clássica de "monstro
  assustador" — não modelamos nada disso hoje.
- **Suscetibilidade a fogo/gelo** — `MakeMediumBurnableCharacter(inst, "body")`
  / `MakeMediumFreezableCharacter(inst, "body")`: a criatura pode pegar fogo
  ou congelar. Não modelado — hoje toda criatura gerada é imune a ambos por
  omissão.
- **Loot alternativo por quantidade garantida** — `lootdropper:AddRandomLoot(prefab, peso)`
  + `numrandomloot = N`: sorteia N itens de uma lista ponderada (garantido X
  itens), diferente do `AddChancedLoot` que já geramos (cada item rola sua
  própria chance independente). São dois modelos de loot genuinamente
  diferentes.
- **Alcance/prioridade de retargeting** — `combat:SetRetargetFunction(priority, fn)`
  controla a que distância e com que prioridade a criatura procura novo alvo.
  Nosso `brain.ts` usa uma distância fixa (`SEE_TARGET_DIST = 10`) sem opção
  no formulário.

**Fora de escopo (complexo demais / muito específico):** `sleeper` (ciclo de
sono dia/noite), `follower`/`trader` (mecânica de "criatura de estimação" tipo
aranha do Webber ou pet hound), variantes anfíbias, mutação por lua cheia
(`halloweenmoonmutable`) — todos exigem estado/eventos cruzados demais pra
generalizar num campo de formulário simples.

## 14. Coelho e Tallbird — rendimento menor, mas confirma um padrão limpo

Lidos `rabbit.lua` e `tallbird.lua` completos. A maior parte do que esses
arquivos fazem é **bespoke demais pra generalizar**: o coelho vira "beardling"
baseado na sanidade de quem o observa (todo um sistema de transformação por
insanidade), pode ser pego vivo e alimentado (`MakeFeedableSmallLivestock`), e
o tallbird defende um ninho específico com lógica de retargeting própria. Não
vale a pena expor nada disso como campo de formulário — é lógica de UMA
criatura específica do jogo, não um padrão reutilizável.

**Uma coisa nova e limpa confirmada:** o componente `cookable` — a criatura
pode ser jogada viva numa fogueira e virar um item de comida:
```lua
inst:AddComponent("cookable")
inst.components.cookable.product = "cookedsmallmeat"  -- prefab que ela vira
inst.components.cookable:SetOnCookedFn(...)             -- opcional, efeito custom
```
Isso é diferente de "loot ao morrer" — é uma transformação alternativa
(virar comida em vez de dropar item ao ser morta de outro jeito).

**Observação sobre diminishing returns:** essa leva rendeu bem menos
mecânica generalizável que aranha/cão-selvagem. Pode valer a pena, daqui pra
frente, ou (a) escolher criaturas mais "básicas" (porco, abelha) em vez de
bosses/criaturas com sistemas próprios elaborados, ou (b) migrar a exploração
pra personagens, que ainda não estudamos a fundo.

## 15. Personagens (wilson.lua, wolfgang.lua)

Confirma que `character.ts` já está no caminho certo:
`SetMaxHealth`/`hunger:SetMax`/`sanity:SetMax` batem exatamente com o padrão
real (Wilson e Wolfgang fazem a mesma coisa).

**Wolfgang é complexo demais pra generalizar** — um sistema inteiro de
"força" (mightiness) com 3 estados (fraco/normal/forte) que mudam build,
dano, velocidade, tudo ligado a fome e a um minigame de academia
(barra "bell"). Nada disso vale a pena tentar expor como campo de formulário.

**Uma mecânica limpa confirmada em ambos:** afinidade alimentar —
```lua
inst.components.foodaffinity:AddPrefabAffinity("baconeggs", TUNING.AFFINITY_15_CALORIES_HUGE)
```
O personagem ganha um bônus extra (fome/vida/sanidade) ao comer um alimento
específico — Wilson gosta de bacon and eggs, Wolfgang gosta de batata
cozida. Simples, real, e não modelado hoje.

**Também confirmado, mas não implementado (baixa prioridade):**
`sanity.night_drain_mult` / `sanity.neg_aura_mult` — multiplicadores de
quão rápido a sanidade cai à noite / perto de monstros. Se sobrepõe
parcialmente com nosso perk `no_sanity_drain` existente (que zera
`dapperness`, um mecanismo diferente) — deixei de fora por enquanto pra não
duplicar conceito.

## 16. Geração de mundo: Room → Task → TaskSet — **implementado (Room/Task), fora de escopo (TaskSet)**

Fonte: pasta `map/` de uma cópia separada dos scripts do jogo (não é o mesmo
lote de `scripts/prefabs/` usado nas seções 1-15). É um sistema de 3 camadas:

1. **Room** (`AddRoom("Nome", {...})`) — a unidade de conteúdo real: um tipo
   de terreno (`WORLD_TILES.GRASS/FOREST/ROCKY/...`), prefabs fixos
   (`countprefabs`), e decoração espalhada (`distributepercent`/`distributeprefabs`).
   Confirmado em `rooms.lua`, `rooms/forest/pigs.lua`. **Implementado** em
   `src/generators/worldContent.ts` (`generateRoomLua`).
2. **Task** (`AddTask("Nome", {...})`) — uma área temática que referencia
   quais Rooms podem aparecer (`room_choices`), travada por um sistema de
   fechadura/chave (`locks`/`keys_given`) que controla a progressão da
   história. Confirmado em `task.lua`, `tasks/forest.lua`,
   `lockandkey.lua` (enums `LOCKS`/`KEYS` completos, usados como estão no
   nosso `src/types/worldContent.ts`). **Implementado**
   (`generateTaskLua`).
3. **TaskSet** (`AddTaskSet("Nome", {...})`) — o layout do mundo inteiro,
   redefinindo TODAS as tasks obrigatórias/opcionais. **Fora de escopo** —
   a maioria dos mods de conteúdo mundial usa `AddTask` de forma aditiva
   (uma área nova), não redefine o mundo inteiro.

**Incerteza real, não resolvida:** `AddRoom`/`AddTask` são funções globais
confirmadas, mas o ponto exato de registro a partir do `modmain.lua` de um MOD
(qual `modimport`/hook carrega esses arquivos no momento certo da geração de
mundo) não veio nessa cópia — precisa de um mod de referência real pra
confirmar. O README gerado avisa isso explicitamente.

**Fora de escopo, mesmo com reestruturação liberada:** `static_layouts`
(236 arquivos) — blueprints de estruturas desenhadas à mão (posição exata de
prefab numa grade), trabalho de level design artesanal, não generalizável.

## 17. Como o jogo separa ilhas do continente (Ilha da Lua)

Confirmado em `storygen.lua`/`forest_map.lua`: a separação física real
(`WorldSim:SeparateIslands()`) é **motor nativo (C++), não Lua** — fora do
alcance de qualquer mod. O que É controlável via Lua:

- **`island_percent`** (setting "Ilhas": nunca/padrão/às vezes/frequente/sempre
  → 0/0.2/0.1/0.8/1): chance de uma conexão entre tasks virar uma separação
  em vez de uma trilha normal.
- **`region_id`** (campo da Task, confirmado em `tasks/dst_tasks_forestworld.lua`):
  Tasks com o mesmo `region_id` são geradas como um grupo à parte e conectadas
  ao continente por **uma única travessia** — é assim que a Ilha da Lua é
  montada (`region_id = "island1"` em 5 tasks: `MoonIsland_IslandShards`,
  `_Beach`, `_Forest`, `_Mine`, `_Baths`). **Implementado** no nosso
  `TaskDef.regionId`.

**Tamanho da ilha:** não existe um parâmetro numérico direto — é uma
propriedade emergente de quantas Tasks você atribui ao mesmo `region_id` e
quantas Rooms cada uma pede (`room_choices`, que aceita uma função com
aleatoriedade, ex: `function() return 3 + math.random(2) end`). Mais
tasks/rooms no grupo = ilha fisicamente maior.

**Forma da ilha:** não controlável — decidida pelo motor nativo (Voronoi +
`SeparateIslands`), sem acesso via Lua/mod.

## 18. Buff de combate temporário ao comer — **confirmado e corrigido**

Implementado a pedido (`ItemDef.onEatBuff`) originalmente sem nenhuma cópia
local do jogo disponível pra confirmar — a única entrada deste catálogo
gerada sem leitura de script real. Reconfirmado depois lendo o código de mods
reais publicados do Workshop (não o jogo em si, mas uso real e consistente da
mesma API em dezenas de arquivos):

```lua
inst.components.edible:SetOnEatenFn(function(inst, eater)
    if eater == nil or eater.components.combat == nil then return end
    eater.components.combat.externaldamagemultipliers:SetModifier(inst, 1 + TUNING.X_MULT, "x_damage_buff")
    eater:DoTaskInTime(TUNING.X_DURATION, function()
        if eater.components.combat ~= nil then
            eater.components.combat.externaldamagemultipliers:RemoveModifier(inst, "x_damage_buff")
        end
    end)
end)
```

**Bug real encontrado e corrigido:** o gerador escrevia
`inst.components.edible.oneatenfn = oneaten` (atribuição direta de campo).
`SetOnEatenFn` é confirmado como o setter real em 31 ocorrências através de
vários mods (ex.: `giant_blueberry.lua`/`honey_log.lua` do "Uncompromising
Mode") — nenhum mod real atribui o campo diretamente. `combat.
externaldamagemultipliers:SetModifier(source, multiplier, key)` /
`:RemoveModifier(source, key)` (um `SourceModifierList`) foi confirmado
exatamente com essa assinatura em `pwb_buffs.lua` do mod "Planar Wanda"
(fonte de um efeito de buff temporário real, do mesmo tipo).

## 19. Combinar dois itens iguais pra restaurar durabilidade — **implementado (versão simplificada)**

Fonte: mod real publicado na Workshop ("Repair Combine", by Serpens66, DST
Workshop id 767776640) — não é um script do jogo base, é um mod da comunidade
que lemos por completo (`modmain.lua` + `scripts/components/combinerepairable.lua`).

O mod original usa um componente Lua próprio (`combinerepairable`) e é bem
configurável: bônus percentual (fixo ou aleatório dentro de uma faixa),
modo opcional que aumenta o máximo em vez de só somar a porcentagem, e
suporte a `fueled` (não modelamos — não temos combustível como conceito de
item hoje) e divisor de eficiência pra itens empilháveis.

**O que implementamos** (`ItemDef.combinable`, `src/generators/item.ts` +
`src/generators/modmain.ts`): a essência da mecânica, sem a configuração —
usar um item sobre outro igual soma a % de durabilidade restante dos dois
(capado em 100%) e consome o segundo. Funciona com `finiteuses`, `armor` ou
`perishable` (nessa ordem de prioridade, igual ao mod original).

Ponto técnico confirmado no mod original e replicado aqui: registrar uma
ação nova (`AddAction`/`AddComponentAction`/`AddStategraphActionHandler`) só
funciona em `modmain.lua`, nunca no script de um prefab — por isso essa parte
é gerada **uma única vez por mod** (compartilhada por todos os itens
combináveis), não repetida item a item. Diferente do mod original (que cria
um componente Lua de verdade), usamos `AddComponentAction("USEITEM",
"inventoryitem", ...)` com checagem de tag manual dentro do callback — mais
simples de gerar, sem precisar de um arquivo de componente separado.

**Fora de escopo:** bônus percentual configurável, modo "aumentar o máximo",
suporte a `fueled` (combustível).

## 20. Item que funciona como contêiner (bolsa/caixa com slots) — **implementado (versão simplificada)**

Fonte: mod real publicado na Workshop ("Wanda's Watch Case", by daguaishou,
Workshop id 2879703811) — lemos o `modmain.lua` e o
`scripts/prefabs/pocketwatch_bag.lua` completos.

Padrão confirmado: `inst:AddComponent("container")` +
`inst.components.container:WidgetSetup("<id>")` no prefab do item, e a
configuração de verdade (skin visual, grid de slots, se abre automaticamente
como painel lateral ao ser carregado) mora em `containers.params.<id>`,
setado em `modmain.lua` (não no prefab) — igual ao padrão de `AddAction` da
seção 19, config de mod só é possível no modmain.

**Achado mais importante:** o mod original **reaproveita a skin de UI de um
item vanilla** (`ui_krampusbag_2x8`, a bolsa do Krampus) com o grid exato de
slots (2 colunas x 7 linhas, espaçados 75px) sem precisar de nenhuma arte
própria. Isso é o mesmo princípio de "reaproveitar build vanilla" que já
usávamos pra animação de item (`itemAnimationSchema`/`VANILLA_ITEM_BUILDS`),
só que pra skin de contêiner.

**O que implementamos** (`ItemDef.container`, `src/generators/item.ts` +
`src/generators/modmain.ts`):
- Modo "vanilla": ver seção "REDESENHADO" abaixo — não é mais um preset fixo.
- Modo "custom": grid genérico (mesma convenção de 75px), calculado e
  "desenrolado" em TypeScript (um `table.insert` por slot, sem loop em Lua) —
  **não confirmado** contra nenhum exemplo real de arte customizada, já que
  todo mod de contêiner que lemos reaproveitou uma skin vanilla. Precisa de
  um build `ui_<id>` próprio (arte de UI), que o README avisa ser necessário.
- `issidewidget` (nosso `sideWidget`): confirmado no mod original — um item
  carregado (não equipado a nenhum slot do corpo) pode abrir automaticamente
  como painel lateral, sem envolver o componente `equippable`.
- `itemtestfn` (nosso `acceptsTag`): filtro opcional confirmado no mod
  original — só aceita itens com uma tag específica; se omitido, aceita
  qualquer item, como uma mochila comum.

**Refinado com um SEGUNDO mod real ("Winona Toolbox", 149 linhas, lido por
completo):** confirma o padrão de container de novo (mesmo `AddComponent`/
`WidgetSetup`), e revela dois detalhes novos que incorporamos:
- O `itemtestfn` pode filtrar por uma **lista de prefabs específicos**
  (`item.prefab == "x" or item.prefab == "y" or ...`) em vez de só uma tag —
  útil quando os itens aceitos não têm uma tag em comum. Implementado como
  `container.acceptsPrefabs`, combinado com `acceptsTag` via `or` quando os
  dois estão presentes.
- `inventoryitem:SetOnPutInInventoryFn(...)` chamando `container:Close()` —
  fecha o contêiner quando ele é guardado no inventário, evitando o bug
  visual de um contêiner "aberto" desaparecer do mapa. Isso é **sempre**
  gerado pra qualquer item com `container`, sem precisar de campo no
  formulário — é puro comportamento correto, não uma escolha de design.

**Refinado com um TERCEIRO mod real ("Automation Farm")**: confirma o
componente `preserver`, usado no próprio `icebox`/`icepack` vanilla
(o mod só ajusta o multiplicador via config, o componente já existe neles):
```lua
inst.components.preserver:SetPerishRateMultiplier(0.25) -- comida apodrece 4x mais lento
inst.components.preserver:SetTemperatureRateMultiplier(0.25) -- opcional
```
Totalmente independente de `container` no sentido de wiring (não precisa de
nada em `modmain.lua`), mas só faz sentido combinado com um container (é
assim que o icebox/icepack usam) — implementado como `container.preservation`.

**REDESENHADO com o mesmo mod ("Automation Farm"):** o modo "vanilla" deixou
de ser um preset fixo com grid copiado à mão. Esse mod faz algo mais simples
e mais confiável:
```lua
containers.params.automation_farm_chest = deepcopy(containers.params.sacred_chest)
```
Clona a tabela de configuração **inteira** (skin + grid exato) de QUALQUER
prefab com container já existente no jogo, sem precisar saber os números
exatos de antemão. Substituímos o preset único (`krampus_sack_2x8`,
transcrito à mão a partir do mod anterior) por `container.widget.reusePrefab`
(texto livre, o id de um prefab com container real) + `GLOBAL.deepcopy(...)`
no gerador — mais simples, mais confiável, e funciona pra qualquer contêiner
vanilla, não só um. `issidewidget`/`type` continuam sendo aplicados por cima
do clone, então o usuário mantém controle sobre esses dois mesmo reaproveitando
a skin de outra coisa.

**Visto mas não incorporado:** o `type` do widget nem sempre é o id do
próprio item — este mod usa `type = "chest"` (um valor compartilhado/
genérico) em vez de `type = "toolbox"`. Não sabemos o efeito exato nem quais
valores são válidos (só temos 2 exemplos reais, um usando o id do item e
outro usando "chest"), então mantivemos sempre `type = <id do item>` (o
padrão já confirmado no primeiro mod) em vez de expor isso como opção.

**Fora de escopo (v1):** contêineres que ficam no mundo/são "implantados"
(baús fixos, tipo o Chester ou um baú de tesouro) — isso é um arquétipo
bem diferente (não é `inventoryitem`, usa `deployable` em vez de receita
normal) e mereceria sua própria análise separada. Também fora de escopo:
tornar o contêiner equipável a um slot do corpo (mochila "de verdade", que
ocupa o slot BACK) — teria que combinar com `equippable`, que hoje só é
gerado pra `weapon`/`tool`/`armor` (ver `isHandheld`/`isBodyArmor` em
`item.ts`), não pra `container`.

## 21. Multiplicadores de stat de personagem + afinidade por categoria de comida — **implementado**

Fonte: mod real publicado na Workshop ("Dryad", by HanTears/HeavenMoon/MatchaLatte)
— lemos `scripts/prefabs/dryad.lua` completo (878 linhas). É um personagem com
uma árvore de habilidades própria bem elaborada (fora de escopo, mesmo motivo
do Wolfgang na seção 15), mas o `master_postinit` também tem chamadas
**estáticas**, sem depender de nenhuma tag de skill tree:

```lua
inst.components.combat.damagemultiplier = damage_mult
inst.components.hunger.hungerrate = hunger_mult * TUNING.WILSON_HUNGER_RATE
inst.components.locomotor:SetExternalSpeedMultiplier(inst, "dryad_speed_mod", speed_mult)
inst.components.foodaffinity:AddFoodtypeAffinity(FOODTYPE.VEGGIE, 1.33)
```

Implementamos essas 4 chamadas como campos opcionais em `CharacterDef`
(`damageMultiplier`, `hungerRateMultiplier`, `walkSpeedMultiplier`,
`foodTypeAffinities`), sem a parte condicionada à skill tree do mod original.

`foodaffinity:AddFoodtypeAffinity` é a versão "por categoria inteira" do
`foodaffinity:AddPrefabAffinity` (por prefab específico, ex: Wilson gosta de
bacon and eggs) já citado na seção 15 — mesma ideia, granularidade diferente.

**Refatoração ao implementar:** os perks fixos `no_hunger` (`hungerrate = 0`)
e `faster_walk` (velocidade x1.25) foram **removidos** de `CHARACTER_PERKS` —
os dois eram só um valor fixo do mesmo mecanismo que os novos campos genéricos
(`hungerRateMultiplier = 0`, `walkSpeedMultiplier = 1.25`) já cobrem por
completo, sem precisar de duas formas diferentes de expressar a mesma coisa.

**Não confirmado / não visto:** `health:SetAbsorptionAmount` (que daria o
"defesa x1.25" mencionado na descrição pública do mod) aparece no código do
Dryad, mas **comentado** (`--inst.components.health:SetAbsorptionAmount(...)`)
— ou seja, o próprio autor desativou essa linha. Por isso não implementamos
nenhum campo de "multiplicador de defesa" — a única fonte real que temos para
essa chamada está desligada no mod de origem, não é uma confirmação de que
funciona como esperado.

## 22. Como um Room/Task de mod realmente entra no jogo — **confirmado, corrigido**

Fonte: mod real publicado na Workshop ("Graveyard Island") — lemos
`modmain.lua`, `modworldgenmain.lua` e `scripts/map/static_layouts/graveyard_island.lua`
completos. Isso resolve as duas incertezas que as seções 16 e 17 deixaram
marcadas como "não confirmado, precisa de mod de referência real":

1. **Onde o `AddRoom`/`AddTask` do mod realmente mora**: não é
   `scripts/map/rooms.lua`/`scripts/map/tasks.lua` (o que gerávamos antes) —
   é um arquivo chamado **`modworldgenmain.lua`, na RAIZ do mod** (igual
   `modmain.lua`, não dentro de `scripts/`). O jogo carrega esse arquivo
   automaticamente durante a geração de mundo, sem precisar de
   `modimport`/`PrefabFiles` ou qualquer registro extra.

2. **Como a Task realmente aparece num mundo gerado**: registrar a Task com
   `AddTask` só a deixa *disponível* — ela só é de fato **incluída** na
   geração se algo inserir seu id em `self.tasks` de um TaskSet compatível.
   O mod faz isso assim:
   ```lua
   AddTaskSetPreInitAny(function(self)
       if self.location == "forest" then
           table.insert(self.tasks, "graveyard_island")
       end
   end)
   ```
   **Sem isso, uma Task gerada pelo app nunca apareceria em nenhum mundo
   real** — isso não é um detalhe cosmético, é o que faz a feature funcionar
   de fato. Corrigido: `TaskDef.locations` (obrigatório, mínimo 1) agora
   gera esse bloco automaticamente, agrupado por localização.

**O que ficou de fora, mesmo confirmado no mod:** `countstaticlayouts`
(referencia um `static_layout` — blueprint desenhado à mão — dentro de uma
Room) continua fora de escopo, mesmo motivo já registrado na seção 16
(level design artesanal, não generalizável a um campo de formulário). O mod
também usa `AddRoom`'s `contents.prefabdata` (override de dados específicos
de UM prefab dentro da room, ex: `gravestone = { setepitaph = "..." }`) —
não modelado, é bem específico por prefab.

## 23. Estrutura de teleporte pareada — **implementado (releitura simplificada)**

Fonte: mod real publicado na Workshop ("Craftable Wormholes") — lemos
`modmain.lua` (340+ linhas) e `scripts/components/wormhole_connector.lua`
(230 linhas) completos.

**O que o mod de origem realmente faz:** não cria uma estrutura nova — torna
o prefab **vanilla** `"wormhole"` (o buraco de verme que já existe no jogo)
craftável via `AddRecipe2("wormhole", ...)` + `AddPrefabPostInit("wormhole", ...)`,
e adiciona um componente próprio (`wormhole_connector`) que fica de olho em
todo `wormhole` construído/destruído (eventos `wormhole_created`/
`wormhole_destroyed` no `TheWorld`) pra ligar os dois mais recentes sem par,
com nomeação automática, restrição de quem pode construir, sincronização de
ícones do mapa via RPC pros clientes, e save/load próprio. Confirma que a
chamada de verdade que faz dois teleportadores se conectarem é:
```lua
w1.components.teleporter:Target(w2)
w2.components.teleporter:Target(w1)
```

**Risco identificado e evitado:** o mod também sobrescreve
`inst.components.teleporter.onActivate`, mas SEMPRE encadeando a função
anterior (`old_activate(inst, doer, ...)`) — ou seja, esse hook parece ser a
própria função que executa o teleporte, não um efeito colateral opcional.
Sem o código de `scripts/components/teleporter.lua` (não temos cópia),
não temos como confirmar o que quebra se sobrescrever sem encadear
corretamente — por isso NÃO implementamos nenhum efeito em `onActivate`
(ex.: custo de sanidade ao usar, que o mod original tem), só o `:Target()`.

**O que implementamos** (`ItemDef.teleportPair`, `src/generators/item.ts`):
uma releitura bem mais simples — cada item marcado gera `AddComponent("teleporter")`
e se auto-organiza em pares pela ORDEM DE CONSTRUÇÃO (a 1ª e 2ª instância
formam um par, a 3ª e 4ª formam outro par, etc.), usando uma tabela
`GLOBAL.TELEPORT_PAIRS` compartilhada — sem precisar de nenhum registro em
`modmain.lua` (a tabela se inicializa sozinha, `... or {}`, na primeira
instância construída). Exige que o item seja uma estrutura (`recipe.placer`),
já que um teleportador de bolso não faz sentido.

**Fora de escopo:** nomeação automática, restrição de quem pode construir,
sincronização de ícones do mapa, custo de sanidade ao usar (pelo motivo de
risco acima) e "wormhole pessoal" (só o dono pode usar).

## 24. Item que o jogador pode renomear — **implementado (só o lado seguro)**

Fonte: mod real publicado na Workshop ("Renameable Watches") — lemos
`modmain.lua` (110 linhas) completo.

Confirmado: `named` + `writeable` é o mesmo sistema que placas e lápides
usam pra deixar o jogador digitar um nome customizado:
```lua
prefab:AddComponent("named")

prefab:AddComponent("writeable")
prefab.components.writeable:SetDefaultWriteable(false)
prefab.components.writeable:SetAutomaticDescriptionEnabled(false)
prefab.components.writeable:SetWriteableDistance(1)
prefab.components.writeable:SetOnWrittenFn(onnamed) -- onnamed chama named:SetName(name)
```
Implementamos exatamente isso como `ItemDef.nameable`.

**Risco identificado e evitado (mesmo padrão do #23):** pra esse recurso
funcionar de ponta a ponta, o mod também "ensina" a pena de pluma vanilla
(`featherpencil`) a reconhecer o novo item como alvo válido, via
`AddPrefabPostInit("featherpencil", ...)` adicionando `useabletargeteditem` +
`SetOnUseFn`. Sem o código de `scripts/components/useabletargeteditem.lua`
(não temos cópia), não temos como confirmar se `SetOnUseFn` **substitui** o
comportamento de escrita já existente da pena (ex.: escrever em placas) ou
se convive com ele. Por segurança, **não geramos essa parte** — o item fica
pronto para ser nomeado, mas ativar a escrita com a pena precisa de
verificação manual em jogo (o README gerado avisa isso explicitamente).

## 25. Uma estrutura nunca é um item de inventário — **confirmado, corrigido**

Fonte: mod real publicado na Workshop ("Automation Farm") — lemos
`scripts/prefabs/automation_farm_chest.lua` (144 linhas) completo.

**Bug real encontrado e corrigido:** o gerador SEMPRE usava
`MakeInventoryPhysics(inst)` + `inst:AddTag("item")` +
`inst:AddComponent("inventoryitem")`, mesmo para itens marcados como
"estrutura" (`recipe.placer = true`). O mod confirma que isso está errado —
uma estrutura de verdade nunca é um item de inventário (você não "guarda"
um baú de volta na mochila; ele só sai do mundo sendo destruído a martelo):
```lua
MakeObstaclePhysics(inst, 0.5)
inst:AddTag("structure")
-- SEM inst:AddComponent("inventoryitem"), sem AddTag("item")

inst:AddComponent("workable")
inst.components.workable:SetWorkAction(ACTIONS.HAMMER)
inst.components.workable:SetOnFinishCallback(onhammered) -- dropa loot (se tiver) e :Remove()
```

Isso afetava TODO item-estrutura já gerado pela ferramenta, inclusive o
`teleportPair` (seção 23), que exige `recipe.placer = true` — todo
teleportador gerado antes desta correção saía com um `inventoryitem` que
não deveria existir.

**Implementado** (`isStructure()` em `src/generators/item.ts`, baseado em
`item.recipe.placer`):
- Física de obstáculo em vez de física de inventário, tag `"structure"` em
  vez de `"item"`, sem `inventoryitem`.
- `workable` + martelo + `onhammered` (dropa loot via `lootdropper`, depois
  `inst:Remove()`) — consequência direta e necessária da mudança acima: sem
  isso, uma estrutura nunca sairia do mundo de nenhum jeito.
- O container (`ItemDef.container`) agora só gera o auto-close-ao-guardar
  (seção 20) quando o item NÃO é uma estrutura — um container-estrutura
  (ex.: um baú fixo) não tem `inventoryitem` pra prender esse hook.

**Simplificação assumida, não confirmada:** o raio de `MakeObstaclePhysics`
foi fixado em `0.5` (mesmo valor usado no mod de origem) — o tamanho real
de cada estrutura varia, então isso é só um valor de partida razoável, não
uma medida calculada a partir de nada específico do item do usuário.

## 26. Durabilidade por cooldown, em vez de usos/tempo — **implementado**

Fonte: mod real publicado na Workshop ("Wanda Extended: The Shifting Watch")
— lemos o `scripts/prefabs/pocketwatch_shifting.lua` (330+ linhas, focado
nas partes confirmáveis) e cruzamos com uma chamada já vista antes em
"Renameable Watches" (seção 24).

Confirmado: `rechargeable` é um TERCEIRO modelo de durabilidade (além de
`finiteuses` e `perishable`), mas em vez de gastar/apodrecer, o item entra
em cooldown depois de usado e volta a funcionar sozinho:
```lua
inst:AddComponent("rechargeable")
inst.components.rechargeable:SetChargeTime(30) -- confirmado em "Renameable Watches"
...
inst.components.rechargeable:Discharge(30) -- dispara o cooldown, confirmado nos dois mods
```

Implementado como `ItemDef.rechargeable` (mutuamente exclusivo com
`finiteuses`/`perishable`). O gatilho de `Discharge` é compartilhado com
qualquer callback de "uso" que já geramos: `onattack` (arma) ou a função do
`spellcaster` (efeito mágico em um ponto) — os dois únicos pontos de "isso
foi usado agora" que o gerador já conhece. Não exigimos que seja
especificamente uma arma (correção nossa durante a implementação: o
mecanismo real não é exclusivo de armas, é qualquer coisa com um "uso"
identificável).

**Lido o mod completo (334 linhas do prefab principal) pra confirmar que não
faltava nada mais simples de absorver.** A maior parte é uma habilidade bem
específica da Wanda (reparar estruturas queimadas, refazer buracos de
caverna, re-rolar aranhas, resetar armadilhas de cão) — fora de escopo, mesmo
critério de sempre. Mas achamos mais um detalhe pequeno e seguro:
`inst.components.inspectable.getstatus = function(inst) ... end` — mostra
"RECHARGING" na descrição do item enquanto ele está em cooldown. Incorporado
também, sempre que `rechargeable` está ativo.

**Não confirmado:** se o próprio componente bloqueia automaticamente o
ataque/uso enquanto está descarregado (`not IsCharged()`), ou se isso
precisa ser checado manualmente em algum lugar. Sem
`scripts/components/rechargeable.lua`, não arriscamos adicionar nenhuma
lógica de bloqueio — o item entra em cooldown, mas se ele continua
"funcionando" durante esse tempo não foi confirmado.

## 27. Criatura que forma manada (herd) — **implementado**

Fonte: mod real publicado na Workshop ("Seafellow") — lemos
`scripts/prefabs/seafellow.lua` (290 linhas, focado nas partes
generalizáveis) e `scripts/prefabs/seafellowherd.lua` (43 linhas, completo).
Esse mecanismo é o mesmo que o Beefalo e o Lightning Goat usam no jogo base.

Confirmado: uma "manada" é uma entidade GERENCIADORA separada (sem
`AddNetwork`, sem `SetPristine`/`ismastersim` — é não-networked de propósito),
que periodicamente invoca novos membros perto dos existentes, até um
tamanho máximo:
```lua
-- na criatura:
inst:AddComponent("herdmember")
inst.components.herdmember:SetHerdPrefab("<id>herd")

-- no prefab separado "<id>herd" (SEM AddNetwork):
inst:AddComponent("herd")
inst.components.herd:SetMemberTag("<id>")
inst.components.herd:SetMaxSize(N)
inst.components.herd:SetGatherRange(R)
inst.components.herd:SetOnEmptyFn(inst.Remove)

inst:AddComponent("periodicspawner")
inst.components.periodicspawner:SetRandomTimes(min, max)
inst.components.periodicspawner:SetPrefab("<id>")
inst.components.periodicspawner:SetOnSpawnFn(function(inst, newent) inst.components.herd:AddMember(newent) end)
inst.components.periodicspawner:SetSpawnTestFn(function(inst) return not inst.components.herd:IsFull() end)
inst.components.periodicspawner:Start()
```

Implementado como `CreatureDef.herd` (`maxSize`, `gatherRange`,
`spawnIntervalDays`) em `src/generators/creature.ts` — gera um SEGUNDO
arquivo de prefab (`<id>herd.lua`), registrado em `PrefabFiles` junto com o
principal. Removemos o detalhe específico do mod de origem (o intervalo de
spawn era ligado a uma "temporada de acasalamento" de outro bicho do jogo,
`LIGHTNING_GOAT_MATING_SEASON_BABYDELAY`) — usamos um min/max de dias
genérico em vez disso.

## 28. Árvore de habilidades (skill tree) — **implementado**

Fonte: o próprio jogo base — `scripts/prefabs/skilltree_defs.lua` (completo) e
`scripts/prefabs/skilltree_wilson.lua` (completo), de uma cópia local dos
prefabs que não tínhamos localizado antes (ver nota no início deste arquivo:
o catálogo original dizia "não temos `scripts/components/`", o que segue
verdadeiro, mas os `skilltree_*.lua` são `scripts/prefabs/`, não
`scripts/components/` — por isso apareceram nesta cópia). Cruzado também
contra `scripts/prefabs/skilltree_dryad.lua` de um mod de personagem real
publicado na Workshop ("Dryad") e o `modmain.lua` desse mesmo mod.

Confirmado:

```lua
-- em player_common.lua, presente em TODO personagem jogável — nada extra
-- precisa ser adicionado no prefab do personagem em si:
inst:AddComponent("skilltreeupdater")

-- scripts/prefabs/skilltree_<id>.lua devolve uma função, não uma tabela:
local function BuildSkillsData(SkillTreeFns)
    local skills = {
        <id>_no1 = {
            title = "...", desc = "...",
            pos = {x, y}, group = "<branch>", tags = {"<branch>"},
            root = true,           -- só o primeiro nó de cada ramo
            defaultfocus = true,   -- só UM nó em toda a árvore (foco do controle)
            connects = {"<id>_no2"},  -- gate "OU": qualquer um destes libera o próximo
            onactivate = function(inst, fromload) ... end,
            ondeactivate = function(inst, fromload) ... end,
        },
    }
    return { SKILLS = skills, ORDERS = ORDERS }
end
return BuildSkillsData

-- modmain.lua registra a árvore (mesmo padrão usado por "Dryad"):
local skilltree_defs = require("prefabs/skilltree_defs")
local skills_data = require("prefabs/skilltree_<id>")(skilltree_defs.FN)
skilltree_defs.CreateSkillTreeFor("<id>", skills_data.SKILLS)
skilltree_defs.SKILLTREE_ORDERS["<id>"] = skills_data.ORDERS
```

Também confirmado em `skilltree_wilson.lua`: um nó "lock" (sem `title`, só
`desc`, com `tags` incluindo `"lock"`) usa `lock_open(prefabname,
activatedskills, readonly)` para decidir se libera o que vem depois dele via
`connects`. O único tipo de lock genuinamente generalizável (não amarrado a
boss/allegiance do jogo base) é "libera depois de N skills ativas no mesmo
ramo", via `SkillTreeFns.CountTags(prefab, "<tag_do_ramo>", activatedskills)`
— exatamente o que `wilson_torch_lock_1`/`wilson_beard_lock_1` fazem. Os
outros locks vanilla (`fuelweaver_killed`, `celestialchampion_killed`,
allegiance lunar/sombra) dependem de estado global do jogo base
(`TheGenericKV`) e não fazem sentido pra um personagem de mod.

Implementado como `CharacterDef.skillTree` (`src/generators/skillTree.ts` +
wiring em `src/generators/character.ts` e `src/generators/modmain.ts`).
Simplificações deliberadas em relação ao real:

- Cada `onactivate`/`ondeactivate` foi generalizado pra um único
  `AddTag`/`RemoveTag` (o padrão mais comum de longe, tanto em
  `skilltree_wilson.lua` quanto em `skilltree_dryad.lua`) — não expomos
  Lua arbitrário tocando outros componentes, como o jogo permite.
  Efeitos mais ricos exigiriam expor Lua livre, algo que este app
  não faz em nenhum outro lugar.
- `pos`/`ORDERS` (só afeta o layout visual na tela de habilidades, sem efeito
  de jogo) são calculados automaticamente como uma cadeia vertical por ramo —
  não expomos posicionamento manual.
- `icon` fica de fora — sem pipeline de arte, os nós funcionam sem ícone
  (só não têm imagem). Ver comentário `PLACEHOLDER` no arquivo gerado.
- Limite real de 32 skills "selecionáveis" por árvore (nós lock não contam,
  confirmado em `CreateSkillTreeFor`) não é validado no formulário.

## 29. `spellbook` — item que abre uma roda de feitiços (spell wheel) — **implementado, simplificado**

Fonte: mirror público dos scripts do jogo
(`github.com/taichunmin/dont-starve-together-game-scripts`, não uma cópia
local) — `components/spellbook.lua`, `componentactions.lua`, `actions.lua` e
os 3 únicos prefabs vanilla que usam o componente: `waxwelljournal.lua`
(Diário do Maxwell), `willow_ember.lua` (Brasa da Willow) e
`winona_remote.lua` (Controle da Winona).

Confirmado:

```lua
inst:AddComponent("spellbook")
inst.components.spellbook:SetItems(SPELLS)  -- array de {label, onselect, execute, atlas, normal, ...}
```

A ação de abrir/fechar a roda (`ACTIONS.USESPELLBOOK`/`CLOSESPELLBOOK`) e de
executar o feitiço selecionado (`ACTIONS.CAST_SPELLBOOK`) já existem prontas
no jogo base — nenhum código de ação precisa ser escrito pelo mod, só
`SetItems`. Cada entrada de `SPELLS` tem um `onselect(inst)` (roda
`spellbook:SetSpellFn(fn)`) e um `execute(inst)`. Confirmado em
`components/inventory.lua` (`Inventory:CastSpellBookFromInv`) → dispara
`ACTIONS.CAST_SPELLBOOK` → `spellbook:CastSpell(user)` → chama o `fn` do
`SetSpellFn`, SEM precisar de mira de área — esse é o caminho usado pelo
exemplo `TopHatSpellFn` (comentado, mas presente) em `waxwelljournal.lua`.

NÃO modelado (simplificação deliberada, a pedido do usuário): nos 3 exemplos
reais, o feitiço normalmente NÃO executa direto — abre uma mira de área
(`aoetargeting` + `aoespell`) antes de lançar, e o item é reabastecido por um
recurso (`fueled`, ex: nightmare fuel) em vez de ter usos fixos. Os 3
exemplos também são exclusivos de um personagem específico via
`spellbook:SetRequiredTag("shadowmagic"/"portableengineer"/etc.)` — este app
não tem o conceito de "item exclusivo de personagem" (`ItemDef` e
`CharacterDef` são independentes no schema), então isso também ficou de fora.

Implementado como `ItemDef.spellbook` (`src/types/modProject.ts` +
`src/generators/item.ts`). Simplificações:

- Cada feitiço só faz uma coisa: `SpawnPrefab` de um prefab existente na
  posição de quem lançou — a mesma generalização já usada por `spellEffect`/
  `spellcaster` (seção 7), pelo mesmo motivo (efeito arbitrário exigiria
  expor Lua livre).
- Sem mira de área — o feitiço é sempre "em si mesmo", nunca mirado.
- Sem exclusividade de personagem — qualquer item pode ter `spellbook`.
- Usos totais reaproveitam o `finiteuses` já modelado (mesmo padrão que o
  componente real `book` do jogo usa internamente — `Book:ConsumeUse()`
  chama `finiteuses:Use(1)`) — opcional; sem ele, os feitiços são infinitos.
- `atlas`/`normal` (ícone de cada feitiço na roda) ficam de fora — sem
  pipeline de arte, os feitiços funcionam sem ícone. Mesma decisão já tomada
  pra skill tree (seção 28).

## 30. `armor:InitCondition` — **bug real encontrado e corrigido**

Confirmado em `armor_grass.lua`/`armor_wood.lua`/`armor_marble.lua`
(mesma fonte da seção 11): `InitCondition(condition, absorb_percent)` — o
PRIMEIRO argumento é o total de dano que a armadura absorve antes de
quebrar (valores vanilla na casa das centenas, ex. armadura de madeira =
450), um orçamento de durabilidade próprio, sem relação com
`finiteuses.maxUses` (contagem de "usos", tipicamente uma dezena/centena
bem menor, usada por ferramentas/staffs).

**Bug real encontrado:** o gerador chamava
`InitCondition(TUNING.<ID>_USES or 1, TUNING.<ID>_ABSORPTION)` —
emprestando `finiteuses.maxUses` como se fosse o `condition`. Como
`armorSchema` não tinha campo próprio pra isso, e a maioria das armaduras
não tem `finiteuses` (é opcional e não faz sentido pra elas), o `or 1`
disparava na prática: toda armadura simples gerada por este app quebrava
com ~1 ponto de dano absorvido.

**Corrigido:** `ItemDef.armor.condition` (`src/types/modProject.ts`) é
agora um campo próprio e obrigatório, com sua própria constante
`TUNING.<ID>_CONDITION` (`src/generators/modmain.ts`), referenciada
diretamente em `InitCondition` (`src/generators/item.ts`).

## 31. Alcance de ataque corpo a corpo (`weapon:SetRange`) — **implementado**

Confirmado em `dryad_thornspear.lua` (mod de personagem real "Dryad", uma
lança corpo a corpo — não um staff/arma à distância): `weapon:SetRange(1.5)`
— **um único argumento**. Essa é a mesma API usada pela arma à distância
(seção 6, `SetRange(min, max)` — dois argumentos, junto de `SetProjectile`),
mas numa arma puramente corpo a corpo (sem projétil) o único argumento
estende o alcance normal (~2 no jogo base) sem torná-la uma arma à distância.

Implementado como `ItemDef.weapon.meleeRange` (`src/types/modProject.ts`),
mutuamente exclusivo com `weapon.ranged` (mesmo `.refine()` que já protege
outros pares de campos incompatíveis neste arquivo) — só faz sentido pra uma
arma que não tem projétil.

## 32. `Task.locks`/`keys_given` vazio — investigado, **NÃO é bug** (retratação)

Suspeita inicial, comparando um mod de teste gerado por este app
(`alchemist_island`) com "Graveyard Island" (a fonte da seção 22): nosso
gerador produzia `keys_given = {  }` (tabela vazia) quando uma Task não dava
nenhuma chave, enquanto Graveyard Island usa `keys_given = KEYS.NONE`
(sentinela explícito). Cheguei a "corrigir" isso (`.min(1)` no schema +
fallback pro sentinela `NONE` no gerador) usando como confirmação adicional
`porkland.lua` (mod "Above the Clouds") e `shipwrecked.lua` (mod "Island
Adventures").

**Erro de metodologia identificado:** esses dois mods de confirmação são
conversões totais pra outro modo de jogo inteiro (Hamlet/Porkland e
Shipwrecked — mundos solo, não DST Together), não mods pequenos que só
adicionam uma Task ao mapa padrão como este app faz e como "Graveyard
Island" faz. Não são um comparável válido.

**Reconfirmado com um comparável de verdade** ("Uncompromising Mode",
`dst_compatible = true`, mod real de DST Together que adiciona Tasks novas
ao mapa padrão — mesmíssimo caso de uso): código ATIVO (não comentado) em
`scripts/map/tasks/{newswamp,ratacombs,sunkendecid}.lua` mostra
`locks={}`/`keys_given={}` (tabela vazia) sendo usado normalmente, lado a
lado com `locks={LOCKS.X}`/`keys_given={KEYS.X}` nas outras Tasks do mesmo
arquivo. Ou seja: tabela vazia **funciona sim** — minha suspeita inicial
era baseada numa amostra pequena demais, e a "correção" foi revertida
(`src/types/worldContent.ts`, `src/generators/worldContent.ts`,
`src/components/forms/TaskForm.tsx`, `mods/alchemistIsland.ts`).

**O que sobrou de útil desse mergulho:** `Task.room_bg` usando `WORLD_TILES.X`
(o que este app já gerava) está reconfirmado com evidência bem mais forte —
o mesmo "Uncompromising Mode" usa `room_bg=WORLD_TILES.HOODEDFOREST` e
`room_bg=WORLD_TILES.MAGMA_ASH` em código ativo, em vez do `GROUND.IMPASSABLE`
que só vimos uma vez (em "Graveyard Island"). Nenhuma mudança de código foi
necessária aqui.

**Lição pra próximas confirmações:** ao usar um mod da coleção local como
prova, checar antes se ele é um mod "pequeno" (adiciona conteúdo ao DST
Together padrão, como "Graveyard Island"/"Uncompromising Mode") ou uma
conversão total pra outro modo/DLC (Hamlet, Shipwrecked, Reign of Giants
solo) — a segunda categoria pode usar convenções/campos que não se aplicam
ao caso de uso deste app.

## 33. `speechOverrides` não configura o componente `talker` — confirmado

Suspeita a checar: o recurso de "fala customizada" do gerador de personagem
(`speechOverrides` em `src/generators/speech.ts`, usado por `mods/vex.ts`)
poderia estar mexendo no componente `talker` (cor/fonte/offset do balão de
fala). Lendo `components/talker.lua` (316 linhas) real: o método de falar é
`Say(script, time, noanim, force, nobroadcast, colour, ...)`, que cria um
`FollowText` acima da entidade, com campos próprios `colour`/`font`/`fontsize`/
`offset`. Nada disso é tocado pelo nosso recurso.

O que `speechOverrides` realmente faz é sobrescrever entradas de
`STRINGS.CHARACTERS.<NOME>.ANNOUNCE_*` (ex: `ANNOUNCE_COLD`, `ANNOUNCE_HOT`) —
o jogo lê essa string table internamente e a repassa pra `Talker:Say` quando o
evento correspondente dispara (ex: o personagem sente frio). Ou seja:
funciona, mas por um caminho indireto (string table, não configuração do
componente) — e por isso cor/fonte/offset do balão nunca são expostos pelo
gerador, só o texto.

**Status:** implementado (via string table), correto pro que faz — só a
descrição mental de "como funciona" estava incompleta antes desta leitura.

## 34. Golpe vs. estocada (animação de ataque por tipo de arma) — **confirmado, GAP quase irrelevante**

Pergunta original (seções anteriores, em aberto até agora): existe lógica real
de seleção de animação de ataque corpo-a-corpo por tipo de arma (ex: espada
golpeia, lança estoca)? Lido `stategraphs/SGwilson.lua` (28601 linhas) direto —
o `ActionHandler(ACTIONS.ATTACK, ...)` (~linha 1317) e o estado `"attack"`
(~linha 10666) resolvem a animação numa cadeia de `elseif equip:HasTag(...)`,
checando a **tag da arma equipada**, nunca o tipo/categoria do item em si:

```lua
elseif equip ~= nil and equip:HasTag("jab") then
    inst.AnimState:PlayAnimation("spearjab_pre")
    inst.AnimState:PushAnimation("spearjab", false)
elseif equip ~= nil and equip:HasTag("lancejab") then
    inst.AnimState:PlayAnimation("lancejab_pre")
    inst.AnimState:PushAnimation("lancejab", false)
elseif equip ~= nil and equip:HasTag("whip") then ... -- "whip_pre"/"whip"
elseif equip ~= nil and equip:HasTag("book") then ...  -- "attack_book"
elseif equip ~= nil and equip:HasTag("chop_attack") and inst:HasTag("woodcutter") then ... -- Woodie-only
elseif equip ~= nil and equip.components.weapon ~= nil and not equip:HasTag("punch") then
    inst.AnimState:PlayAnimation("atk_pre")
    inst.AnimState:PushAnimation("atk", false) -- default: TODA arma "normal" cai aqui
```

Confirmado por que quase nada usa a variante "estocada": busquei a tag `"jab"`
em todos os 1594 prefabs reais — **zero resultados** (nenhuma arma do jogo base
a usa; os estados `spearjab_pre`/`spearjab` existem no stategraph mas estão
órfãos/reservados). A tag `"lancejab"` tem exatamente **um** uso real:
`yoth_lance.lua` (arma do evento sazonal Year of the Tiger). O `spear.lua`
comum, `spear_wathgrithr.lua` (Wigfrid), `spear_lance.lua` (investida montada)
e `spear_gungnir.lua` não usam nem `jab` nem `lancejab` — todos caem no `atk_pre`/
`atk` genérico, igual a um machado.

**Conclusão prática:** não existe uma distinção golpe/estocada dirigida por
"tipo de arma" que faça sentido modelar no gerador — é uma tag opcional
(`jab`/`lancejab`/`whip`/`book`/`chop_attack`/...) usada por meia dúzia de
armas muito específicas em toda a base do jogo, não um padrão geral de lanças
vs. machados. **Status:** não vale a pena implementar — GAP confirmado como
não relevante, não como pendência.

## 35. `deployable` ≠ `placer` — dois mecanismos distintos (correção)

`docs/dst-knowledge/components.json` tinha uma hipótese não confirmada sobre o
componente `deployable`: "provavelmente relacionado ao nosso 'placer' de
estruturas". Lendo `components/deployable.lua` (149 linhas) e
`scripts/prefabutil.lua` diretamente, a hipótese estava **errada** — são dois
mecanismos separados:

- **`placer`** (`MakePlacer`, `scripts/prefabutil.lua:1`) é o ghost/preview de
  posicionamento durante a construção de uma receita — `inst:AddComponent("placer")`.
  É exatamente o que `src/generators/item.ts` (`generateItemPlacerPrefab`,
  linha ~667) já gera via `MakePlacer(...)` para `item.recipe.placer` — **já
  modelado corretamente**, nenhuma mudança necessária.
- **`deployable`** (`MakeDeployableKitItem`, `scripts/prefabutil.lua:76`) é um
  componente completamente diferente: permite que um item **já no inventário**
  seja "deployado" direto no mundo por uma ação (right-click), fora do fluxo
  de receita/construção — ex. armadilhas, sacos de areia, barracas. API real:
  `SetDeployMode(mode)` (`DEPLOYMODE.DEFAULT/ANYWHERE/TURF/PLANT/WALL/WATER/CUSTOM`,
  cada um valida a posição de forma diferente), `SetDeploySpacing(spacing)`,
  campo `restrictedtag`, `Deploy(pt, deployer, rot)`.

**Status:** `placer` já implementado (sem mudança); `deployable` é um recurso
NOVO e não relacionado, não implementado — só valeria a pena se quiséssemos
gerar itens "deployáveis avulsos" (sem receita), o que está fora do escopo
atual do gerador.

## 36. Stategraphs reais de criatura (spider, hound, pig, bee, rabbit, tallbird) — fecha a lacuna do #13

A seção 13 já tinha lido `spider.lua`/`hound.lua` (os PREFABS) e confirmado que
os nomes reais de clipe de animação (idle/walk/atk/hit/death) não estavam
disponíveis, porque só tínhamos `scripts/prefabs/`. Agora com
`scripts/stategraphs/` disponível, lemos os 6 stategraphs reais
correspondentes (`SGspider.lua`, `SGhound.lua`, `SGpig.lua`, `SGbee.lua`,
`SGrabbit.lua`, `SGtallbird.lua`) direto.

**Clipes reais confirmados (referência, não uma lista fixa — cada build tem os
seus):**

| Criatura | idle | mover | atacar | hit | death |
|---|---|---|---|---|---|
| spider | `idle` | `walk_pre`→`walk_loop` | `atk` (+variantes: `warrior_atk`, `spit`, `hide`, `heal`) | `hit` / `hit_stunlock` | `death` |
| hound | `idle` | `run_pre`→`run_loop`→`run_pst` | `atk_pre`→`atk` | `hit` | `death` (ou `death_shatter`) |
| pig | `funnyidle`→(`idle_loop`/`hungry`/`idle_angry`/`idle_scared`/`idle_happy`/`idle_creepy`) | `walk_loop`/`run_loop` | `atk` (reaproveitado por `chop`) | `hit` | `death` |
| bee | `idle`/`idle_angry` | `walk_pre`→`walk_loop` | `atk` | `hit` | `death` |
| rabbit | `idle` (+`lookup_*`/`lookdown_*`) | `walk` → `run_pre`→`run` | **não existe** | `hit` | `death` |
| tallbird | `idle` (teen randomiza `idle_blink`/`hungry`) | `walk_pre`/`walk_loop`/`walk_pst` | adulto `atk_pre`→`atk`; filhote `teenatk_pre`→`teenatk` (estado `peck` separado) | `hit` | `death` |

Confirma que nosso `stategraph.ts` gerar sempre os 5 estados fixos
(`idle`/`moving`/`attack`/`hit`/`death`) com clipes livres digitados pelo
usuário continua correto como abordagem — o jogo real também varia bastante
(pig usa 5 clipes de idle por humor, coelho não tem ataque nenhum) — só reforça
que não dá pra cravar um clipe "certo" sem builds específicos.

**Mecânicas novas confirmadas, generalizáveis, não modeladas hoje:**

- **Variante de ataque por tag/distância** (spider, tallbird) — a mesma
  criatura escolhe entre múltiplos estados de ataque (corpo-a-corpo padrão vs.
  `warrior_atk`/`spit`/`peck`) conforme uma tag própria (`spider_warrior`,
  `teenbird`) e/ou se o alvo está fora do alcance de melee. Hoje `creature.ts`
  só gera um único estado `attack`.
- **Escudo com absorção de dano** (spider, estado `shield`) —
  `health:SetAbsorptionAmount(TUNING.X)` no `onenter`, resetado pra `0` no
  `onexit`. Mecanismo limpo e isolado, reaproveitável em qualquer criatura.
- **Hit com/sem stunlock** (spider: `hit` normal permite continuar atacando,
  `hit_stunlock` bloqueia com tag `busy`) — dois níveis de reação a dano,
  distinto do único estado `hit` que geramos hoje.
- **Convocação de reforços por uivo** (hound, estado `howl` → no frame 10
  chama `SpawnHound` → `TheWorld.components.hounded:SummonSpawn(pos)`,
  materializa hounds e os vira seguidores de quem uivou). Padrão "líder de
  matilha convoca reforços", isolado e reaproveitável.
- **Idle escolhido por humor/lealdade** (pig, estado `funnyidle` ramifica em 5
  clipes conforme `follower:GetLoyaltyPercent()`, se tem líder, se é `guard`,
  se é noite, se tem alvo de combate).
- **Reuso do clipe de ataque como animação de trabalho** (pig: o estado
  `chop`, usado quando o porco é mandado cortar árvore, tem timing igual ao
  `atk` de combate — só troca o que dispara no frame 13).
- **Ciclo obrigatório voar/pousar antes de agir** (bee: alterna entre "no ar"
  — `EnableBuzz(true)` — e "pousada" via `land`→`land_idle`→`takeoff`; a ação
  de polinizar só é aceita com a tag de estado `landed`, senão a criatura pousa
  primeiro). Padrão limpo pra qualquer criatura voadora futura.
- **Criatura sem estado de ataque** (rabbit — confirmado: nenhuma ocorrência
  de `"attack"` nem `combat` em `SGrabbit.lua`). Caso real de presa 100%
  pacífica: sem componente `combat`, sem estado `attack` nenhum na stategraph.
  Nosso gerador hoje sempre cria um `combat`+estado `attack` fixo — uma
  criatura verdadeiramente inofensiva (`behavior` tipo "passive"/"flee") não
  tem como ser gerada fiel ao padrão real do jogo.

**Fora de escopo (bespoke demais):** mutação de aranha em `mutated_spider`,
mordida em múltiplas fases + susto + estátua de argila do hound, transformação
werepig por ciclo lunar, crescimento de `teenbird`→`tallbird` — todos sistemas
completos de UMA criatura específica, não padrões reutilizáveis.

## 37. Mais 4 stategraphs reais (beefalo, merm, tentacle, koalefant)

Continuação da seção 36. `SGBeefalo.lua`, `SGmerm.lua`, `SGtentacle.lua`,
`SGkoalefant.lua` lidos completos.

**Clipes reais confirmados:**

| Criatura | idle | mover | atacar | hit | death |
|---|---|---|---|---|---|
| beefalo | `idle_loop` | `walk_pre/_loop/_pst`; `run_pre/_loop/_pst` (perseguindo) vs `run2_*` (fugindo/viajando) | `atk_pre`→`atk` | `hit` | `death` |
| merm | `funnyidle`→`idle_loop` | `walk_*`/`run_*` padrão | `atk` (ou `atk_triplepunch`) | `hit` (ou `disappear` se `shadowminion`) | `death` |
| tentacle | `idle` / `ground_pre_loop_pst` (`rumble`) | **não existe — sem `locomotor`** | `atk_pre`→`atk_loop`+`atk_idle`→`atk_pst` | `hit` | `death` |
| koalefant | `idle_loop` (+ `graze`/`bellow`/`shake`) | `walk_*`/`run_*` padrão | `atk_pre`→`atk` (existe, ao contrário do coelho) | `hit` | `death` |

**Mecânicas novas confirmadas, generalizáveis, não modeladas hoje:**

- **Flags "pending" checadas no `onenter` do `idle`** (beefalo:
  `hairGrowthPending`/`growUpPending`/`domesticationPending`) — em vez de
  reagir a um evento na hora, o estado `idle` confere flags pendentes assim
  que a criatura fica ociosa e só então entra na transição correspondente.
  Jeito limpo de adiar uma transformação one-shot pro primeiro momento seguro
  (sem interromper combate/movimento).
- **Sela caindo por obediência insuficiente** (beefalo: `shake_off_saddle`
  disparado quando `domesticatable:GetObedience() < TUNING.BEEFALO_KEEP_SADDLE_OBEDIENCE`).
- **Camada "job" (guard/worker) sobre o esqueleto padrão** (merm) — reforça o
  achado do pig na seção 36 (reuso do clipe de ataque como animação de
  trabalho: `chop`/`mine`/`hammer`/`use_tool` disparam `PerformBufferedAction`
  no mesmo frame do `atk`), mais um estado extra `use_building` (abastecer
  construções) e um idle "cansado" (`debuff`, clipe por chance/intervalo)
  quando `ShouldWaitForHelp()`.
- **Buff/debuff em massa via evento mundial** (merm: `onmermkingcreated_anywhere`/
  `onmermkingdestroyed_anywhere` disparam `"buff"`/`"debuff"` em TODOS os merms
  do mundo simultaneamente — broadcast, não um evento por instância).
- **Esquiva física como alternativa ao hit reativo** (merm, estado
  `dodge_attack` via `SetMotorVelOverride`, disparado por `attackdodged` em vez
  de ir pro `hit` normal).
- **Emboscada em 3 fases pra criatura estacionária** (tentacle, sem
  `locomotor` nenhum): `newcombattarget`→`taunt` (emerge parcial,
  `breach_pre`→`breach_loop`); só depois de `timeinstate > .75` E
  `combat:TryAttack()` bem-sucedido é que compromete o `attack_pre` (emerge
  total); se o alvo sumir antes, recua por `breach_pst`. Padrão reaproveitável
  pra qualquer criatura escondida/estacionária.
- **Ataque em loop reentrante em vez de combo fixo** (tentacle: o estado
  `attack` chama `GoToState("attack")` nele mesmo enquanto `combat.target`
  existir, só sai por `attack_post` quando o alvo some — tamanho de combo
  aberto, e o `hit` não volta pro `idle`, volta direto pro `attack`, ou seja a
  criatura não recua ao ser atingida, só retoma).
- **Carcaça com múltiplas porções colhíveis** (koalefant:
  `CommonStates.AddCorpseStates` recebe `corpse = function(inst) return "carcass"..tostring(inst.meat_level) end`
  — o clipe do cadáver muda conforme quanto de carne já foi extraída, diferente
  de "loot único ao morrer" que já geramos).
- **Fuga e capacidade de combate são traços independentes** — koalefant é
  presa grande que foge E tem um estado `attack` completo (ao contrário do
  coelho da seção 36, que é pacifista E foge). Confirma que "foge de
  ameaças" e "não tem ataque" não são a mesma coisa no jogo real.
- **Nem todo estado declarado é alcançado pela própria stategraph**
  (koalefant/beefalo: o estado `alert` existe mas nenhum `events`/timeline
  deste arquivo o chama — o comentário real do Beefalo confirma:
  `"The alert state name is hardcoded into the FaceEntity behaviour"`, ou
  seja é convencionado por um comportamento de brain compartilhado, não pela
  stategraph local).

**Fora de escopo (bespoke demais):** ciclo completo de domesticação do
beefalo (growable + hair_growth + achievements), skins/YOTB, revive; merm
virando mermking, mutação lunar, spawn de shadow minion; som ambiente
desacoplado da animação sobrevivendo a sleep/wake do tentacle (`rumblesound`,
efeito bem específico) — todos sistemas de UMA criatura, não padrão geral.

## 38. Mais 6 stategraphs reais (bat, bird, bird_mutant, bunnyman, butterfly, buzzard)

Continuação das seções 36-37 (agora 16 criaturas cobertas).

**Clipes reais confirmados:**

| Criatura | idle | mover | atacar | hit | death |
|---|---|---|---|---|---|
| bat | `fly_loop` (nunca pousa) | `fly_loop` | `atk` (default) | `hit` (default) | `death` (default) |
| bird | `idle` | `hop` (chão) / `glide` (ar) | **não existe** (só a variante mutante ataca) | `hit` | `death` |
| bird_mutant | `idle` | `hop` (mesmo clipe do "walk") / `glide` | `attack` | **não existe** | `death` |
| bunnyman | `funnyidle`→variantes | `walk_loop`/`run_loop` | `atk` | `hit` | `death` |
| butterfly | `idle_flight_loop` | `flight_cycle` | **não existe** | **não existe** | `death` |
| buzzard | `idle` | `hop`/`glide` | `atk` (mutante: `atk_flame_pre/_loop/_pst`) | `hit` | `death` |

**Mecânicas novas confirmadas, generalizáveis, não modeladas hoje:**

- **Voo vertical invencível pra ponto inacessível** (bat, `flyaway`/`flyback`) —
  move só no eixo Y via `Physics:SetMotorVel(0, Y, 0)` (sem `locomotor`), com
  `health:SetInvincible(true)` e sombra desligada enquanto voa; o retorno
  monitora a posição Y a cada `onupdate` até `pt.y <= .1` pra só então
  teleportar e reativar hitbox/sombra. Reaproveitável pra qualquer criatura
  que precise "sumir" temporariamente (ninho, teto de caverna).
- **Idle com tique sorteado por faixas de probabilidade cumulativas**
  (bird: `r<.5`/`r<.6`/... escolhe entre `idle`/`switch`/`peck`/`hop`/
  `flyaway`/`caw` no timeout do próprio estado, sem envolver o brain).
- **Ausência de reação a dano é traço independente de ter ataque**
  (bird_mutant: tem `attack` completo mas ZERO ocorrência de `"hit"` ou do
  evento `attacked` no arquivo — dano não interrompe nem visualmente reage).
  Espelha o achado da seção 37 pro koalefant (fuga × combate independentes),
  agora pro par hit × attack.
- **Ataque que se auto-interrompe no meio do timeline** (bunnyman: no frame
  de dano, o próprio `onenter` do `attack` já chama
  `inst.sg:RemoveStateTag("attack")`/`RemoveStateTag("busy")`, liberando a
  criatura pra reagir a outros eventos antes do `animover` terminar — janela
  de interrupção configurável sem precisar de um estado extra). Mesmo padrão
  confirmado de novo em buzzard (remove `"attack"` no frame 20, mantém
  `"busy"`; `flamethrower_pst` remove `"busy"` no frame 13).
- **Criatura sem ataque E sem hit** (butterfly) — grau mais raso de "presa
  pacífica" que o coelho da seção 36 (que ao menos tem `hit`): só
  idle/pousar/decolar/morrer, nenhuma reação a combate de nenhum lado.
- **Mergulho que executa a presa em vez de causar dano** (buzzard: ao pousar
  sobre um alvo com tag `prey`, vai pro estado `kill`, que no frame 27 chama
  `target.components.health:Kill()` diretamente — não `combat:DoAttack`).
  Padrão de "predador vs. presa pequena" reaproveitável, distinto de combate
  normal.
- **Stun com janela de interrupção graduada** (buzzard: cadeia
  `fall`→`stun_pre`→`stun_loop`↔`stun_hit`→`stun_pst`, usa
  `inst.sg.mem.stun_endtime` — timestamp persistente que sobrevive a troca de
  estado, ao contrário de `statemem` — e vai soltando/prendendo tags
  (`noelectrocute`/`caninterrupt`/`busy`) em frames específicos conforme o
  atordoamento evolui, em vez de tudo de uma vez).
- **Coordenação entre instâncias via busca espacial** (buzzard:
  `ChooseAttack` varre `TheSim:FindEntities` por outros buzzards mutantes já
  usando o ataque especial no mesmo alvo, pra não disparar todos juntos —
  coordenação implícita sem manager central).

**Fora de escopo (bespoke demais):** mastigação em N repetições configuráveis
do bat (item-específico), mutação lunar de bird/buzzard, lançador de chamas
(FX pool), captura em armadilha do bird (`trapped`→`stunned`→`flyaway`,
componente externo cuida da doma, não a stategraph), `abandon`/`cheer` do
bunnyman (já coberto pelo padrão "camada job/lealdade" da seção 37).

## 39. Mais 6 stategraphs reais (carrat, catcoon, centipede, deer, frog, gnarwail)

Continuação das seções 36-38 (agora 22 criaturas cobertas). **Correção de
premissa:** `SGcentipede.lua` é o `archive_centipede` (robô do Arquivo/Forge),
não a lagarta de caverna comum — sem burrow/hide nenhum, confirmado via
`grep` (`archive_centipede`/`ARCHIVE_CENTIPEDE` em toda referência de tuning).

**Clipes reais confirmados:**

| Criatura | idle | mover | atacar | hit | death |
|---|---|---|---|---|---|
| carrat | `idle1`/`idle2` | `walk_*`/`run_*` padrão | **não existe** (sem `combat`) | `hit` | `death` |
| catcoon | `idle_loop` | `walk_pre/_loop/_pst` | default (`atk_pre`/`atk`) | default | default |
| centipede (archive) | `idle` | `walk_*` custom | `atk_roll_pre/_loop/_pst` (carga) + `atk_aoe` | default | default |
| deer | `idle_loop` (+`idle_grazing`) | `walk_*`/`run_*` padrão | melee default + `atk_magic_*` (só com `inst.gem`) | `hit`/`hit_2` (com gema) | default |
| frog | `idle`/`idle2` (lunar) | `jump_pre`→`jump`→`jump_pst` (hop, não walk contínuo) | `atk_pre`→`atk` | `hit` | `death` |
| gnarwail | `idle_loop` (+`idle2_loop`) | `walk_*`/`run`/`submerge`, tudo custom | `submerge` (barco) / `attack_2` (investida) | `hit` | `dead`→`dead_loop` |

**Mecânicas novas confirmadas, generalizáveis, não modeladas hoje:**

- **Auto-esconder por janela de tempo + checagem espacial** (carrat: `idle`
  compara `inst.sg.mem.emerge_time + TIME_LIMIT` contra `GetTime()` e só
  submerge se também não achar a tag `"beefalo"` num raio de 20). Gatilho
  puramente temporal + presença de entidade específica — diferente da
  emboscada por combate do tentacle (seção 37).
- **Frame de ataque empurra evento comportamental no alvo, não dano**
  (catcoon: `pounceattack` no frame 6 dispara
  `target:PushEvent("threatnear", {threat=inst})` em alvos com tag `"bird"`,
  fazendo o alvo fugir por conta própria). Variante "induz fuga" do padrão
  "mata direto" já visto no buzzard (seção 38).
- **Estado-loop que produz item com chance crescente por iteração e piscina
  por relacionamento** (catcoon `hairball`: chance `.8/numretches`, prêmios
  diferentes se `follower:GetLeader()` existe ou não).
- **Follow-up de combate adiado via flag checada no `idle`** (centipede: o
  fim de um ataque seta `inst.doAOE = true`; o `idle` seguinte checa a flag e
  pula direto pra `atk_aoe` se achar alvo em `TheSim:FindEntities`, em vez de
  ociosar). Extensão do padrão "flags pendentes no idle" (seção 37, beefalo)
  pra encadeamento de combate.
- **Dano por varredura espacial contínua durante o movimento, não por
  `DoAttack` único** (centipede: o `onupdate` do estado `roll` varre a área e
  mantém uma lista `ignores` pra não bater duas vezes no mesmo alvo).
- **Múltiplas intenções pendentes concorrentes, com prioridade explícita,
  consumidas no `idle`** (deer: `wantstocast`/`wantstogrowantler`/
  `wantstounshackle`, setadas quando o evento chega ocupado). Generaliza o
  padrão de flag pendente da seção 37 pra várias intenções competindo.
- **Troca de identidade por respawn orquestrado dentro do próprio estado**
  (deer `unshackle`: `inst:Remove()` + `SpawnPrefab("deer")` +
  `sg:GoToState` chamado direto na nova instância, com prefab de FX à parte
  pra continuidade visual) — diferente de transformar a mesma entidade.
- **Detecção de alvo montado em plataforma, ramificando o ataque entre
  passageiro e a própria plataforma** (gnarwail: `GetCurrentPlatform()`
  decide entre `fin_taunt`/`body_slam`/`boat_attack` conforme o alvo estar
  ou não num barco).
- **Ataque de impacto atrasado que corrige a posição pelo deslocamento do
  alvo entre aquisição e execução** (gnarwail `boat_attack`: recalcula
  `target_position + (target_boat:GetPosition() - old_boat_position)` no
  `ontimeout`).
- **Atacante vira seu próprio projétil** (gnarwail `finish_boat_attack`:
  spawna `gnarwail_attack_horn` carregando `inst:GetSaveRecord()`, aplica
  dano separadamente ao passageiro e ao casco, e a própria criatura se
  remove).
- **Locomoção normal escalona sozinha pra um modo de deslocamento mais forte
  com tags de combate, decidido no próprio `ontimeout` do loop de
  movimento** (gnarwail: `run`→`body_slam` se a distância até o destino
  ultrapassa `RUNNING_DIVE_DISTANCESQ` — decisão de combate tomada dentro do
  movimento, não por evento de ataque).

**Fora de escopo (bespoke demais):** minigame de corrida YOTC do carrat
(`endofrace_*`), brincar com brinquedo do catcoon (`pounceplay`), sistema de
veados-gema/magia do deer (`deercast_cd`), arremesso de item n'água do
gnarwail (`toss`). Frog não trouxe mecânica nova — confirma só o padrão
"hop" já visto em bird/buzzard (seção 38) aplicado a anfíbio pequeno.

## 40. Mais 6 stategraphs reais (grassgator, grassgekko, mole, krampus, lavae, lightninggoat)

Continuação das seções 36-39 (agora 28 criaturas cobertas — `SGhermitcrab.lua`
pulado de propósito: 5261 linhas, sistema de loja/NPC bespoke demais).

**Clipes reais confirmados:**

| Criatura | idle | mover | atacar | hit | death |
|---|---|---|---|---|---|
| grassgator | `idle_loop` | `walk_*`/`run_*` padrão | `atk_pre`→`atk` | `hit` | `death` (+`death_idle` em água) |
| grassgekko | `idle_loop` | `walk_*`/`run_loop`→`run_pst` | default | `hit` (custom: força `run` no frame 5) | default |
| mole | `idle`/`idle_under` (mesmo estado, clipe por `isunder`) | `walk_pre/_loop/_pst` custom | **não existe** | `hit` | `death` |
| krampus | `idle` | só `run` (sem walk) | `atk_pre`→`atk` | `hit` | `death` |
| lavae | `idle`(+`idle2/3/4`) | `walk_pre`→`walk_loop`→`walk_pst` | `atk_pre`→`atk`→`atk_pst` | `hit` | `death` (ou `frozen`→`thaw`→`shatter`) |
| lightninggoat | `idle_loop` | `walk_pre`/`walk` (auto-trote) | default (dano ramifica por `charged`) | default | `death`/`death_2` |

**Mecânicas novas confirmadas, generalizáveis, não modeladas hoje:**

- **Submersão móvel com busca espacial de raio crescente** (grassgator:
  `dive`→`dive_loop`→`surface`, tags `invisible`/`noattack`/`noelectrocute`
  aplicadas em frames escalonados; durante `dive_loop` o `onupdate` procura
  novo local raso com `searchrange += 8` a cada timeout até achar, só então
  reemerge). Terceira variante de "esconder" catalogada — timer puro
  (carrat, #39), estacionário (tentacle, #37), agora móvel-com-busca.
- **Tail-drop via flag pendente + timeline forçando transição antes do fim
  da animação** (grassgekko: `scare`→`tail_off`, dropa loot no frame 4 se
  `inst.hasTail`, força `GoToState("run")` no frame 15 via timeline em vez
  de esperar `animover`; regrow consultado no `idle` via
  `inst.tailGrowthPending`, mesmo padrão de flag pendente da seção 37).
- **Burrow real por troca de física, não só tag** (mole:
  `inst:SetAbovePhysics()`/`SetUnderPhysics()` alternado por estado, com o
  MESMO `idle` mudando de clipe/tags conforme `inst.isunder`, em vez de dois
  estados idle separados). Primeiro burrow genuíno confirmado nesta série —
  contraponto ao esquema baseado só em tag `invisible` do bat/grassgator.
- **Parar/reiniciar a brain por nome de razão durante autoextinção
  scriptada, com `onexit` como salvaguarda** (krampus: `exit` desliga
  `StopBrain("SGkrampus_exit")`, remove física, fica invencível, e
  `inst:Remove()` no fim; o `onexit` do próprio estado desfaz tudo isso caso
  o `Remove()` não tenha disparado — rede de segurança).
- **Reação a dano desacoplada da seleção de alvo** (lavae — comentário real
  no arquivo: "Lavae doesn't want to change his target to attackers";
  `onattackedfn` só toca `hit`, nunca mexe em `combat:SetTarget`).
- **Evento `death` interceptado e ramificado pra estado terminal alternativo
  por status ativo** (lavae: `EventHandler("death", ...)` redireciona pra
  `thaw_break` se `frozen`/`thawing`, em vez do `death` padrão — desvio de
  ESTADO inteiro, não só de clipe/loot dentro do mesmo estado).
- **Flag de carga persistente lida por várias animações sem estado
  dedicado** (lightninggoat: `inst.charged` consultado em idle/walk/bleet/
  taunt/attack/death/sleep só pra som e pra escolher o tipo de dano do MESMO
  ataque via `combat:DoAttack(target, nil, nil, "electric")` — sem estado de
  "carregando" separado).
- **Troca de build num frame de timeline como transformação visual leve**
  (lightninggoat `discharge`: `AnimState:SetBuild(...)` no frame 18, no meio
  da própria animação `trans`, sem trocar de prefab).
- **Estado-forwarder pra preservar nome renomeado** (lightninggoat:
  `electrocute` só encaminha pra `GoToState("shocked")`, com comentário real
  "New electrocute mechanics depend on this state name existing. Forward to
  old state for backward compatibility" — jeito real do próprio jogo lidar
  com rename sem quebrar quem ainda referencia o nome antigo).

**Fora de escopo (bespoke demais):** furto-e-fuga do krampus é generalizável
(item acima), mas os detalhes de quando/quanto ele pune o jogador (sistema de
"naughtiness") ficam fora da stategraph. Gatilho de transformação
lavae→mímico/mariposa: zero menção no arquivo, confirmado que fica em outro
lugar (componente/brain), não na stategraph.

## 41. Mais 6 stategraphs reais (monkey, mosquito, mossling, moonpig, otter, penguin)

Continuação das seções 36-40 (agora 34 criaturas cobertas). **Correção de
premissa:** `SGmoonpig.lua` NÃO é uma variante lunar do pig pacífico da
seção 36 — todo o arquivo usa clipes/sons `were_*`
(`dontstarve/creatures/werepig/...`). É o werepig lunar hostil (minerador de
moonbase), sem relação nenhuma com o `funnyidle` do pig comum.

**Clipes reais confirmados:**

| Criatura | idle | mover | atacar | hit | death |
|---|---|---|---|---|---|
| monkey | `idle_loop` | `walk_pre/_loop/_pst` (só anda) | `atk` (melee) ou `throw` (arremesso) | `hit` | `death` |
| mosquito | `walk_loop` (idle = mesmo clipe do mover) | `walk_loop` | `atk` | `hit` | `death` (ou `explode_pre`→`splat` se `toofat`) |
| mossling | `idle` | `walk_pre/_loop/_pst` | `atk` (elétrico) ou `spin_pre→spin_loop→spin_pst→spin_pst_loop→spin_pst_loop_pst` | `hit` (default) | `death` (default) |
| moonpig (werepig lunar) | `were_idle_loop` | só `were_run_pre/_loop/_pst` (sem walk) | `were_atk_pre`→`were_atk` (reaproveitado em `workmoonbase`) | `hit` | `death` |
| otter | `idle` | `AddSimpleRunStates` (run_pre/_loop/_pst) | `bite` (override do default) | `hit` | `death` (+`death_idle` em água) |
| penguin | `idle_loop` | `slide_bounce→slide_loop→slide_post` (deslizando) ou `walk` (start=loop) | `atk_pre`→`atk` (parado) ou `slide_bounce` reaproveitado em `runningattack` | `hit` | `death` |

**Mecânicas novas confirmadas, generalizáveis, não modeladas hoje:**

- **Seleção de modo de ataque por distância calculada no evento
  `doattack`** (monkey: compara `GetDistanceSqToInst` contra
  `MONKEY_MELEE_RANGE^2` pra escolher melee vs. arremesso, decidido antes de
  entrar em qualquer estado). Mais um eixo de "modo de ataque" catalogado —
  soma-se a distância (aqui), plataforma (gnarwail, #39), tag persistente
  (lightninggoat, #40) e agora tag de locomoção corrente (penguin, abaixo).
- **Morte condicional em detonação de área, excluindo quem alimentou por
  último** (mosquito: se `inst.toofat`, entra em `splat` em vez de `death` —
  no frame 11 varre `TheSim:FindEntities` num raio e aplica dano a tudo com
  tag `_combat` exceto aliados de `inst.lastleader`, depois `inst:Remove()`).
- **Troca permanente de moveset por morte de entidade dependente**
  (mossling: `doattack` escolhe `attack` normal ou a cadeia bespoke `spin_*`
  conforme `inst.mother_dead` — não é interrupção pontual, é permanente).
- **Transformação temporária de build/tamanho durante um loop de combate,
  com saída por tempo OU distância** (mossling `spin_loop`: troca pra
  `mossling_angry_build`, cresce via `sizetweener:StartTween`, conta
  `inst.numSpins`, sai por `ShouldStopSpin` = raio do jogador OU
  `numSpins >= 2`).
- **Interrupção mid-anim que força o brain a agir imediatamente**
  (mossling `action`/comer remove `"busy"` no meio do timeline E chama
  `inst.brain:ForceUpdate()` — evolução do padrão de interrupção graduada da
  seção 38, agora acordando o brain em vez de só liberar tags).
- **Reanimação tipo gárgula: pausa a anim exatamente na pose e retoma após
  delay configurável** (moonpig: `death(inst, reanimating)` chama
  `AnimState:Pause()` em vez de tocar animação, com
  `TimeEvent(TUNING.GARGOYLE_REANIMATE_DELAY, ...)` chamando `Resume()`
  depois; um estado `reanimate` dedicado restaura a pose via `SetFrame`/
  `SetTime`). Padrão reaproveitável pra qualquer inimigo tipo estátua.
- **Roubo com anim de ataque seguido de devolução condicionada a posição
  espacial** (otter: `steal` reaproveita a anim `attack`; depois `toss_fish`
  checa `target:IsOnOcean(false)` antes de devolver o peixe roubado
  especificamente pro oceano).
- **Som de movimento em loop precisa ser morto defensivamente em TODO
  estado de saída, não só no próprio `onexit`** (penguin: `SoundEmitter:
  KillSound("slide")` repetido em quase todo `onenter` de outros estados —
  idle, run_start/stop, walk_start/stop, eat_pre, pickup, migrate, attack,
  taunt, death — pra não vazar o som entre transições).
- **Ramificação de ataque pela tag de locomoção corrente no momento do
  evento** (penguin: `doattack` checa `inst.sg:HasStateTag("running")` pra
  ir pra `attack` parado ou `runningattack` deslizando).
- **Dano recebido enquanto segura item carregado força soltar o item**
  (penguin: `eat_loop`/`pickup` escutam `"attacked"` no meio da animação e
  chamam `TryToDropFood` — interrupção por dano específica de estar
  carregando algo).

**Fora de escopo (bespoke demais):** roubo de item do monkey (`ACTIONS.STEAL`
roteado pro estado genérico `action`, já é padrão comum, não novo);
`AddAmphibiousCreatureHopStates`/`AddLunarPreRiftMutationStates` do
otter/penguin são helpers de framework já existentes, não mecânica nova
dessas criaturas especificamente.

## 42. Mais 6 stategraphs reais (perd, pigelite, rocky, shark, slurper, slurtle)

Continuação das seções 36-41 (agora 40 criaturas cobertas). **Correção de
premissa:** `SGpigelite.lua` NÃO é um guarda-elite de combate — é o
participante do minigame do Rei Porco (`minigame_participator`, confirmado
via `Original/prefabs/prefabs/pigelite.lua`), sem `EventHandler("death"...)`
nem estado `death`/`corpse` nenhum (a entidade só some via `inst:Remove()`
ao fim da pose). O guarda de combate de verdade é `pigelitefighter` (arquivo
separado, não lido nesta leva).

**Clipes reais confirmados:**

| Criatura | idle | mover | atacar | hit | death |
|---|---|---|---|---|---|
| perd | `idle_loop` | `walk_*`/`run_*` padrão | `atk` | `hit` | `death` |
| pigelite (minigame) | `idle_object_loop` | `walk_*` padrão + `run_object_*` próprio | `atk_object` | `hit` | **não existe** |
| rocky | `idle_tendrils` | `walk_*` (sem run) | `atk` | `hit`/`hide_hit` (por tag `hiding`) | `death` |
| shark | `idle` | hop anfíbio + `walk`/`run` | `attack` (reaproveitado em `bite`, loop repetido por chance) | `hit` | `dead`→`dead_loop` |
| slurper | `idle_loop` | sem walk/run padrão — `roll_pre/_loop/_pst` próprio | `atk` (melee) ou `headslurp`/`headslurpmiss` (especial) | `hit` | `death` |
| slurtle | `idle` | `walk_*` custom | `atk` | `hit_shield`/`hit_out` (por tag `shield`) | `death`/`death_2` ou pipeline `salt_death_*` |

**Mecânicas novas confirmadas, generalizáveis, não modeladas hoje:**

- **Trava física temporária por troca de massa** (pigelite:
  `Physics:SetMass(POSING_MASS)` durante estados de pose de minigame,
  restaurada pra `DEFAULT_MASS` depois — imobiliza sem remover locomotor).
- **Tag de movimento emprestada só pra desligar o brain** (pigelite: tag
  `"jumping"` reaproveitada com o comentário real "jumping tag to disable
  brain activity", sem nenhum estado de pulo de verdade por trás).
- **Coordenação cross-instância lendo a memória de outras entidades da
  mesma tag** (pigelite: `endpose_pre.ontimeout` varre `TheSim:FindEntities`
  por tag `"pigelite"` e lê `v.sg.mem.postchatter` de OUTRAS instâncias pra
  não duplicar a fala de fim de partida — vai além da busca espacial de
  coordenação já vista no buzzard, #38, porque também compartilha memória).
- **Som com pitch/volume escalado pelo tamanho atual da criatura** (rocky:
  `PlaySoundWithParams(sound, {size=GetScalePercent(inst)})`, lido do
  componente `scaler`).
- **Desistência de alvo por falhas consecutivas** (shark: `missedtargets`
  incrementa a cada tentativa sem sucesso; acima de 2, `combat:DropTarget()`
  + `timer:StartTimer("calmtime", 2)` — para de perseguir e "esfria" por um
  tempo, não é retry infinito).
- **Troca de banco de animação inteiro sincronizada com estado ambiental,
  restaurada corretamente após interrupção** (shark: `AnimState:SetBank`
  alterna `"shark"`/`"shark_water"` conforme `amphibiouscreature.in_water`,
  inclusive guardando o banco certo numa tag temporária durante
  eletrocussão pra restaurar no `onexit`). Mais forte que a troca de build
  do lightninggoat (#40): aqui é o banco inteiro, e depende do ambiente, não
  de um frame fixo.
- **Ataque especial que transforma a própria criatura em item equipável no
  alvo** (slurper: `headslurp` chama `target.components.inventory:
  Equip(inst)` direto no timeline, revalidando alvo/distância na hora —
  padrão inédito nesta série).
- **Efeito de morte disparado com atraso configurável, dissociado do fim da
  animação** (slurper: som + `lootdropper:DropLoot` só no frame 60, bem
  depois da animação de morte terminar — cadáver fica parado antes do
  "estouro" final).
- **Sub-pipeline de morte elementar com dano contínuo self-inflicted
  embutido no próprio `onupdate`** (slurtle: `salt_death_loop` aplica
  `health:DoDelta(-200*dt, nil, "salt", ...)` nela mesma enquanto toca a
  animação de dissolução; o `EventHandler("death"...)` no nível de eventos
  já decide entre `corpse`/`salt_death_pst`/`death` normal ANTES de entrar
  em qualquer coisa parecida com morte comum). Extensão mais forte do
  "death interceptado por status" do lavae (#40) — aqui a causa dispara um
  sub-pipeline com dano próprio embutido, não só troca de clipe/loot.

**Confirmações (não novidade, reforçam padrão já catalogado):** escudo por
absorção de dano (rocky, slurtle — mesmo padrão do spider, #37).

**Fora de escopo (bespoke demais):** roubo de item brilhante do perd (ação
`STEAL` nem aparece nos `actionhandlers` — deve estar em componente/brain,
não na stategraph); drop de ouro em `dive` e sistema de props/pontuação do
minigame do pigelite; `gobble` do shark (`action.target:Remove()` direto,
sem passar por inventário/eat).

## 43. Mais 6 stategraphs reais (smallbird, spat, squid, warg, walrus, wobster)

Continuação das seções 36-42 (agora 46 criaturas cobertas). **Duas correções
de premissa** (mesmo padrão de nome-enganoso já visto no centipede/moonpig/
pigelite): `SGspat.lua` NÃO é filhote de gnarwail/criatura oceânica — usa
banco de som de beefalo, reaproveita `mating_taunt1` do beefalo, dropa
`meat`/`poop`/`phlegm`, come `FOODTYPE.VEGGIE` e está no sistema `HUNT_ACTIONS`
(igual ao koalefant) — é terrestre. E `SGwalrus.lua` é compartilhado por DUAS
entidades diferentes (`walrus` adulto e `little_walrus`/wee MacTusk), sem
arquivos separados — a distinção é só `inst.prefab`/tag dentro dos estados.

**Clipes reais confirmados:**

| Criatura | idle | mover | atacar | hit | death |
|---|---|---|---|---|---|
| smallbird | `idle` | padrão | `atk` | `hit` | `death` (+`hatch`/`grow`) |
| spat | `idle_loop` | padrão | `strike`/`strike_pst` (melee) ou `snot_*` (arremesso) | default | `death` |
| squid | `idle`/`idle2`/`idle3` | hop anfíbio + `run_*` | `attack` (melee) / `flee` (tinta) | `hit` | `dead`→`dead_loop` (água) |
| warg | `idle_loop` | só run | `atk` / `attack_icing` / `atk_breath_*` (mutante) | `hit` | `death` |
| walrus (+little_walrus) | `idle`+`funny_idle` por prefab | `walk`/`run` | `atk`/`atk_dart` (adulto) ou `taunt_attack`/`abandon` (minion) | `hit` | `death` |
| wobster | `idle` | só run | **não existe** | **não existe** | **não existe** |

**Mecânicas novas confirmadas, generalizáveis, não modeladas hoje:**

- **Flag de interrupção pendente checada em ~10 pontos espalhados pelo
  grafo inteiro** (warg: `inst.sg.mem.dostagger`/`dohowl`, testados via
  helpers `TryStagger`/`TryHowl` dentro de `idle`, timelines de `hit`/
  `attack`/`howl`/`chomp_*`/`stagger_pst`/`flamethrower_pre` e no
  `pst_onenter` do electrocute). Versão mais distribuída do padrão de flag
  pendente já visto (beefalo #37, grassgekko/lightninggoat #40).
- **Arma em cone/varredura angular com deduplicação de dano por tick e por
  alvo** (warg `flamethrower_loop`: ângulo varia -45°→+45° por
  `FrameEvent`, `DoFlamethrowerAOE` usa `GetTick()` + tabela
  `targets[v].hit_tick` com `MULTIHIT_FRAMES` pra não bater no mesmo alvo
  duas vezes no mesmo tick).
- **Uma stategraph só servindo várias variantes narrativas de uma
  criatura** — maior exemplo encontrado: warg (normal/clay/gingerbread/
  mutante-lança-chamas, ramificado por tag/build/flag dentro dos mesmos
  estados) e walrus (adulto/minion, por `inst.prefab`/tag).
- **Faceamento temporariamente trocado pra mais direções durante um ataque
  especial** (warg: `SwitchToEightFaced()` no início de `flamethrower_pre`,
  revertido pra `SwitchToSixFaced()` no `onexit`).
- **Estados genéricos de luta-no-anzol como template de pesca oceânica
  compartilhado entre criaturas não aparentadas** (`bitehook_pre/_loop/
  _jump/_escape`, confirmados idênticos em squid e wobster — funcionam
  mesmo sem `components.combat`/`health`, caso do wobster).
- **Task periódico autogovernado pelo `onenter`/`onexit` dos próprios
  estados de idle, não pelo brain** (smallbird: `DoPeriodicTask(1,
  CheckForNewLeader)` ativo só durante `idle`/`idle_blink`/`idle_peep` sem
  líder, cancelado ao sair desses estados).
- **Escolha de modo de ataque pela tag do item/arma equipada** (spat:
  `weapon:HasTag("snotbomb")` decide arremesso vs. melee) — mais um eixo de
  seleção de ataque, além de distância (monkey, #41), plataforma (gnarwail,
  #39) e tag de locomoção (penguin, #41).

**Fora de escopo (bespoke demais):** crescimento/`SpawnTeen` do smallbird
(sistema de mascote único), `heardhorn`/`loseloyalty`/`matingcall` do spat
(montaria), roubo de peixe fisgado do squid (`gobble`/`oceanfishable`,
específico de pesca), variantes clay/gingerbread do warg em si (fora o
padrão "1 SG pra N variantes" já catalogado acima).

## 44. Mais 5 stategraphs reais (worm, gelblob, dustmoth, lunar_grazer, powdermonkey)

Continuação das seções 36-43 (agora 51 criaturas cobertas). **Mais uma
correção de premissa**: `SGpowdermonkey.lua` NÃO é um macaco com bomba —
zero menção a explosão/pólvora/bomba no arquivo. É o NPC tripulante de
barco do Monkey Island (`components.crewmember`), com remar (`ACTIONS.ROW`
→ `"row"`), carregar canhão (`boatcannon:LoadAmmo`), mergulhar, dormir a
bordo e roubar — "powder monkey" é o termo histórico pro menino da pólvora
em navios, não uma arma da criatura.

**Clipes reais confirmados:**

| Criatura | idle | mover | atacar | hit | death |
|---|---|---|---|---|---|
| worm | `mound_idle` (+`mound`/`mound_out`) | `walk_pre/_loop/_pst` | `atk_pre`→`atk` | `hit` | `death` |
| gelblob | `idle`+tamanho | **não existe** (estacionário) | **não existe** | `hit`+tamanho | `death` (sempre `_small`) |
| dustmoth | `idle` | `walk` | existe estruturalmente mas **inalcançável** (sem handler que a dispare) | `hit` | `death` |
| lunar_grazer | `idle` | `walk_pre/_loop/_pst` | `devour` (único ataque) | `hit` | **não existe morte tradicional** — `splat`/`melt`/`captured_despawn` convergem pra `dissipated` |
| powdermonkey | `idle` | padrão | `atk` (armado) / `unequipped_atk` (desarmado) | `hit` | `death` |

**Mecânicas novas confirmadas, generalizáveis, não modeladas hoje:**

- **Ataque adiado até um frame seguro dentro do próprio ciclo de
  movimento** (lunar_grazer: um `FrameEvent` no meio de `walk_start`/`walk`
  seta a tag `"queueattack"` + `statemem.doattack`; só um `FrameEvent`
  posterior, num ponto fixo e seguro da mesma animação, chama
  `ChooseAttack` de fato — o ataque não interrompe a caminhada, espera o
  momento certo dela). Eixo novo: é sobre *quando* atacar, não *qual*
  ataque escolher (os eixos já catalogados eram todos sobre "qual").
- **`ActionHandler` reaproveitado puramente como roteador de estado, sem
  executar a ação de verdade** (dustmoth: `PET`/`REPAIR` mapeados pra
  `dustoff_pre`/`repair_den_pre`, com comentário real do jogo confirmando o
  "hack": "these two are a hack, the actions are never actually performed
  but the handlers are used to bring the moth to certain sg states").
- **Guarda de reversão por flag de sucesso no `onexit` de uma troca de
  identidade temporária** (worm: `statemem.islure` decide se
  `ChangeToWorm`/`ChangeToLure` deve rodar no `onexit`, protegendo contra
  interrupção no meio da transição isca↔minhoca).
- **Helper de animação que sufixa o clipe por estágio de tamanho E espelha
  a mesma animação num segundo corpo** (gelblob: `_PlayAnimation`/
  `_PushAnimation` tocam `idle`+`inst.size` E replicam em `inst.back.AnimState`
  — uma criatura, duas AnimStates sincronizadas).
- **Bypass do teto de dano por hit pra aplicar dano scripted exato, com
  restauração logo depois** (gelblob: `SetMaxDamageTakenPerHit(nil)` só
  durante um `DoDelta` exato até `maxhealth/9`, restaurado em seguida).
- **Coordenação indivíduo↔veículo/grupo via componente compartilhado**
  (powdermonkey: `crewmember`/`boatcrew`/`boatcannon` — animação
  individual sincronizada a um sistema de nível de barco/tripulação).
- **Pipeline de despawn por erosão com reorientação pro chão, acumulado em
  `onupdate`** (lunar_grazer: `SetOrientation(ANIM_ORIENTATION.OnGround)` +
  `SetErosionParams(t*t, ...)` até dissolver).

**Confirmação (não novidade):** seleção de ataque por arma equipada
(powdermonkey) reaparece, mas implementada via o hook `attackanimfn` do
próprio `CommonStates.AddCombatStates` — uma via de implementação nova pro
mesmo eixo já catalogado (spat, #43), não mecânica nova.

**Fora de escopo (bespoke demais):** enxame `core`+`debris` do lunar_grazer
(visual específico de destroços lunares), sistema de tripulação completo do
powdermonkey (roubo, comemoração, canhão em si).

## 45. Últimas 4 stategraphs reais (primemate, caveventmite, molebat, pigelitefighter) — fecha a varredura de mob básico

Última leva da série 36-45: 55 criaturas cobertas no total. `SGpigelitefighter.lua`
é o guarda de combate de verdade que a seção 42 apontou como faltante
(`SGpigelite.lua` era só o participante do minigame — clipe de idle
`idle_object_loop` idêntico confirma que compartilham o mesmo build).

**Clipes reais confirmados:**

| Criatura | idle | mover | atacar | hit | death |
|---|---|---|---|---|---|
| primemate | `idle_loop` | padrão | padrão ou `atk_weapon` (armado) | padrão | padrão |
| caveventmite | `idle` (bespoke) | `walk_pre`→`walk_loop` (bespoke) | `atk` ou `blow` (sopro térmico) | `hit` | `death` |
| molebat | `idle_sit`(+`idle_smell`) | padrão | `attack` | `walk_pst` (!) — reuso do clipe de fim-de-caminhada como hit | padrão |
| pigelitefighter | `idle_object_loop` | padrão | `atk_combo` (3 hits numa animação só) | `hit` | `death` |

**Mecânicas novas confirmadas, generalizáveis, não modeladas hoje:**

- **Grafo core 100% bespoke coexistindo com estados periféricos via
  `CommonStates`** (caveventmite: idle/moving/attack/hit/death totalmente
  escritos à mão, mas sleep/frozen/electrocute/sink vêm do helper
  compartilhado — primeira criatura da série sem usar `AddWalkStates` nem
  `AddCombatStates` pro núcleo).
- **`onupdate` compartilhado entre estados não relacionados, ativado só por
  uma flag comum** (caveventmite: `DoBlowUpdate` roda em `death`, `attack`,
  `blow_attack` E `shield_vent`, mas só age se `statemem.blowing` for
  truthy — efeito de área desacoplado de qual estado o disparou).
- **Invulnerabilidade disparada por evento externo dedicado, não por dano,
  com cooldown próprio** (caveventmite: `entershield`/`exitshield` —
  eventos externos — levam a `shield_vent`, com
  `components.timer:StartTimer("shield_cooldown", ...)`; diferente do
  escudo-por-absorção-de-dano do rocky/slurtle, #42, que reage a hit).
- **Timeline empurra evento customizado direto no alvo da ação em buffer**,
  em vez de manipular componentes dele (molebat `break_molehill`:
  `ba.target:PushEvent("suckedup")`).
- **Física/sombra suspensas durante queda, com restauração garantida no
  `onexit` via flag de guarda** (molebat `fall`: extensão do padrão de
  guarda-de-reversão do worm, #44, agora pra ativação de física/sombra em
  vez de troca de identidade).
- **Combo de múltiplos hits dentro de uma única animação de ataque**
  (pigelitefighter `atk_combo`: `combat:DoAttack()` chamado 3x no mesmo
  timeline, frames 12/18/31, tags removidas só no frame 43).
- **Velocidade de movimento calculada como distância/duração-fixa-em-frames
  para aterrissagem exata num destino** (pigelitefighter `spawnin`:
  `SetMotorVelOverride(sqrt(dist)/(22*FRAMES), 0, 0)`).
- **Override de símbolo por variante aplicado ao cadáver via loop sobre
  tabela de variantes** (pigelitefighter `corpseoncreate`: itera
  `BUILD_VARIATIONS[N]` e `OverrideSymbol` cada símbolo no corpo morto).

### Síntese de fechamento (seções 36-45, 55 criaturas)

Os achados mais recorrentes ou mais diretamente acionáveis em
`src/generators/creature.ts`/`stategraph.ts`/`brain.ts`:

1. **Eixos de escolha de ataque** — arma equipada, distância, plataforma,
   tag de locomoção, cooldown próprio — reaparecem o bastante pra virar um
   campo `attackVariants` condicional, em vez de um único estado `attack`
   fixo.
2. **Flag de interrupção pendente checada em múltiplos pontos** (beefalo
   #37, grassgekko/lightninggoat #40, warg #43) — candidato natural a
   virar um helper reutilizável no `stategraph.ts` gerado.
3. **Escudo/invulnerabilidade temporária com cooldown via
   `components.timer`** (rocky/slurtle #42, caveventmite #45) — maduro o
   bastante pra virar um bloco opcional no gerador.
4. **Guarda de reversão no `onexit`** protegendo restaurações contra
   interrupção (worm #44, molebat #45) — deveria ser sugerido sempre que o
   gerador emitir um `onenter` que desativa algo (física, sombra,
   colisão).
5. **Nomes de arquivo enganosos são comuns** (centipede, moonpig, pigelite,
   spat, powdermonkey) — lição de processo, não de API: nunca inferir
   comportamento de um `SG<nome>.lua` pelo nome, sempre ler.
6. **"Uma stategraph, N variantes"** (warg #43, walrus #43, build-variation
   do pigelitefighter #45) — recorrente o bastante pra virar um modo de
   geração suportado (reskin compartilhando uma única stategraph gerada).

Com isso, a varredura sistemática de stategraphs de criatura "básica" (não
boss, não estrutura, não personagem jogável) está concluída — os
candidatos restantes em `Original/stategraphs/stategraphs/` são bosses,
variantes de personagem jogável, estruturas/efeitos, ou NPCs de
minigame/evento sazonal, todos de valor generalização baixo pelo mesmo
critério já aplicado nas seções 14/40/42.

## 46. Início da varredura de brains (spider, hound, pig, bee, rabbit, tallbird, beefalo, merm, koalefant)

Nova série paralela à 36-45: em vez das stategraphs (animação), agora os
`brains/*.lua` reais (árvore de decisão de IA) das mesmas criaturas.
Contexto: `src/generators/brain.ts` hoje só tem 3 perfis fixos
(hostile/neutral/passive), cada um virando uma `PriorityNode` mínima —
`WhileNode(HasTarget, ChaseAndAttack)` + `Wander`, com `SEE_TARGET_DIST`
fixo em 10. Todo brain real usa a MESMA primitiva (`PriorityNode` avaliada
de cima pra baixo a cada tick — a ordem dos nós já É a lógica de decisão,
sem precisar de `if` fora da árvore), só que com muito mais nós e
condições. `braincommon.lua` (661 linhas, compartilhado por 7 dos 9 brains
desta leva) concentra os padrões mais reutilizados: `PanicTrigger`/
`ElectricFencePanicTrigger`/`IpecacsyrupPanicTrigger` (pânico por causa
específica), `PanicWhenScared` (pânico acumulável + chance de perder
lealdade do seguidor), `AnchorToSaltlick`, e `NodeAssistLeaderDoAction`/
`NodeAssistLeaderPickUps` (framework de "ajudar o líder" reusado por porco
e merm).

**Prioridades reais (resumo por criatura):**

- **spider**: pânico → escudo reativo (`spider_hider`) → ataca parede sem
  líder / foge se cuspidora em cooldown / `ChaseAndAttack` → segue líder
  (raio por `defensive`) → investiga/vai pra casa/comercia → `Wander`.
- **hound**: pânico → ataca parede sem líder → come cadáver (com cooldown
  pós-ataque) → `ChaseAndAttack` (alcance por posse: pet=10, com casa=20,
  solto=100) → `Leash` em casa sem líder → come → segue líder → `Wander`.
- **pig**: cadeia de pânicos (susto/fogo/choque/ipeca) → hit-and-run →
  resgata líder preso → foge de porco hostil → comercia → dá presente ao
  líder (lealdade máxima) → minigame → **sub-árvore de dia** (come, ajuda
  líder a cortar lenha, segue, `Leash`, foge/encara jogador, `Wander`) OU
  **sub-árvore de noite** (foge de aranha, come, foge de jogador, vai pra
  casa/luz, `FindLight`, `Panic`).
- **bee**: pânico → hit-and-run → pânico se casa pegando fogo → vai pra
  casa (noite OU cheia de pólen OU inverno) → beacon → `FindFlower` →
  `Wander`.
- **rabbit**: pânico → foge em 2 camadas do mesmo predador (raio íntimo
  3/6, raio longo 5/10) → vai pra casa (evento OU noite OU primavera) →
  come isca → `Wander`.
- **tallbird**: pânico → `ChaseAndAttack` → **defende o ninho** (busca
  ameaça num raio, mesmo antes de checar dia/noite) → vai pra casa à noite
  → bota ovo se pronto → constrói ninho → `Wander`.
- **beefalo**: pânico → `ChaseAndAttack` → parado se sendo nomeado/arreado
  → vai pro local de arreio → segue dono do sino/líder → cumprimenta
  (fase temporizada) → `AnchorToSaltlick` → vadia esperando ser alimentado
  (fase temporizada) → `Wander` perto do rebanho.
- **merm**: cadeia de pânicos → encara curador → busca ferramenta faltante
  → hit-and-run → come → vai ao trono do rei → ajuda líder (cavar/plantar/
  cortar/minerar, por prioridade de ferramenta) → responde chamado de
  panela de oferenda → comercia → segue líder (distância por lealdade +
  se em barco) → vai pra casa (nunca todos ao mesmo tempo) → `Wander`.
- **koalefant**: pânico → `ChaseAndAttack` → `SequenceNode{FaceEntity,
  RunAway}` (encara o caçador, DEPOIS foge — sequência, não escolha) →
  `AnchorToSaltlick` → `Wander`.

**Mecânicas de decisão novas, generalizáveis, não modeladas hoje:**

- **Hit-and-run (kiting)**: `WhileNode(not combat:InCooldown, Attack)` +
  `WhileNode(combat:InCooldown, RunAway)` — ataca só quando pode bater,
  foge enquanto recarrega. Confirmado em bee, pig E merm (3 criaturas
  independentes), forte candidato a virar opção de comportamento.
- **Escudo reativo por dano acumulado** (spider: `UseShield(inst, dano_até_ativar,
  duração, evita_projétil, esconde_se_assustado)`, com cooldown próprio).
- **Fuga em duas camadas de distância** do mesmo predador — reação em
  estágios (raio íntimo de pânico + raio de fuga de longo alcance), em vez
  de um único threshold (rabbit).
- **Perfil dia/noite como duas sub-árvores completas**, não um nó isolado
  — comportamento inteiro muda de "sociável/produtivo" pra "foge de tudo,
  busca luz" (pig). Gatilho por estação também confirmado (`isspring` no
  rabbit).
- **Alcance de perseguição/comportamento condicional a posse/vínculo** —
  pet vs. tem casa vs. totalmente selvagem mudam o raio de `ChaseAndAttack`
  na mesma criatura (hound).
- **IA territorial**: busca ativa por ameaça perto de um ponto fixo
  (casa/ninho) e vai defendê-lo, com prioridade ALTA (antes até do ciclo
  dia/noite) — tallbird.
- **Distância de `Follow` escalada por lealdade/afinidade**, também
  modulada por contexto (em barco ou não) — merm; spider já mostrava uma
  versão mais simples (flag `defensive` muda o raio).
- **Equipamento/recurso como pré-requisito de comportamento** — merm só
  habilita tarefas de cavar/plantar depois de ir buscar uma ferramenta.
- **`SequenceNode` como primitiva de composição** (faz A, depois B, na
  ordem — diferente de `PriorityNode`, que escolhe UM entre vários) —
  koalefant, único uso confirmado nesta leva.
- **Regra de "não esvaziar o grupo"**: só um membro vai pra casa por vez,
  checado via contagem de filhos fora (merm `CountChildrenOutside() > 1`).

**Fora de escopo (bespoke demais):** minigame do rei porco/rei merm, trono,
panela de oferenda, `AnchorToSaltlick` (mecânica de sal específica),
máquina de 3 fases temporizadas de saudação do beefalo (interessante mas
alta complexidade pra generalizar), `ChattyNode` (diálogo ambiente por
ação — generalizável como flag simples, mas não é decisão de IA em si).

## 47. Mais 9 brains (bat, bird, bird_mutant, bunnyman, butterfly, buzzard, carrat, catcoon, centipede)

Continuação da seção 46 (18 criaturas cobertas). Confirmado: `centipedebrain.lua`
é mesmo o `archive_centipede` (robô do Arquivo), bate com o `ShouldRoll`/
evento `"rollattack"`/`CHARGE_RANGE` já identificado na stategraph (#39).

**Mecânicas de decisão novas, generalizáveis, não modeladas hoje:**

- **Recurso mundial compartilhado com teto de "donos" escalado por
  tamanho** (buzzard: `SIZE_TO_NUM_OWNERS = {tiny=1, ..., large=10}`,
  tabela estática cross-instância rastreando quem já "reservou" uma
  carcaça — impede que N buzzards disputem o mesmo recurso além da
  capacidade dele). Achado mais forte desta leva.
- **Alvo sugerido/arbitrado em grupo, com fallback se recusado**
  (buzzard: `combat:SuggestTarget(doer)` — diferente de setar o alvo
  direto, permite que vários membros do grupo neguem sobreposição de
  alvo entre si; se a sugestão falha, a árvore cai pro próximo nó).
- **Engajar ou fugir decidido por posse de recurso, não por HP/tag**
  (buzzard `DealWithThreat`: defende comida/carcaça perto em vez de fugir,
  inverso do padrão usual "foge se fraco").
- **Modo de comportamento ditado por ordens externas de um líder de
  esquadrão** (bat: `teamattacker:GetOrders()` = HOLD/ATTACK/nil escolhe
  qual sub-ação a criatura roda).
- **Roubo de item específico via varredura de inventário/contêiner
  próximo** (bat: procura "nitre" em players/contêineres no alcance,
  monta lista de candidatos e sorteia um).
- **"Reactive brain": árvore inteira colapsa em ação disparada por evento
  externo empurrado**, não por condição sondada a cada tick (bird: todo
  nó de folha vira `FlyAway` via `PushEvent`, reagindo a `"threatnear"`/
  `"gohome"`). Perfil útil como alternativa simples ao polling constante.
- **Composição dinâmica da árvore por tag de variante, montada no
  `OnStart`** (bird_mutant: `table.insert` condicional a
  `bird_mutant_spitter` antes de construir a `PriorityNode`) — variantes
  da mesma criatura podem ter listas de nós genuinamente diferentes, não
  só parâmetros diferentes.
- **Alvo de enxame/grupo compartilhado, atribuído por manager externo**
  (bird_mutant: `entitytracker:GetEntity("swarmTarget")`, com fallback pra
  alvo aleatório entre players/seguidores no alcance).
- **Fuga disparada por limiar de HP percentual** (bunnyman:
  `health:GetPercent() < threshold` — primeiro caso confirmado nesta
  série de "foge por estar fraco", distinto de fugir por susto/predador).
- **Foge de uma TAG de item equipado específica, não da entidade em si**
  (bunnyman: foge de quem estiver carregando "manrabbitscarer",
  independente de quem seja o portador).
- **Ameaça neutralizada por progressão de personagem (perk/skilltree)**
  (butterfly: `RunAway` ignora o predador se ele tiver
  `skilltreeupdater:IsActivated("wormwood_bugs")` ativo).
- **Forrageamento ciente de risco**: entre alvos de comida candidatos,
  prefere um que não esteja perto de uma ameaça conhecida, só aceita
  perto de ameaça se não houver opção limpa disponível (carrat).
- **Intervalo de idle aleatório modulado pelo vínculo social atual**
  (catcoon: recalculado a cada disparo, curto com líder por perto, longo
  sem líder).
- **Gatilho de ação pontual por lealdade abaixo de limiar crítico**
  (catcoon `whine`) — complementa o follow-escalado-por-lealdade do #46.
- **Inventário cheio dispara retorno pra depositar** (catcoon).
- **Cooldown implementado por remoção de tag + restauração agendada**
  (catcoon: `DoTaskInTime(30, restore_toy_tag)` em vez de
  `components.timer`).
- **Suspensão total da árvore por um único gate de state tag**, em vez de
  checagem "busy" nó a nó (centipede: `WhileNode(not HasStateTag("charge"))`
  envolvendo a `PriorityNode` inteira).

**Confirmações (reforçam #46, não são novidade):** hit-and-run/kiting
reaparece como "Dodge" no centipede (variante mirada no próprio alvo).

## 48. Mais 9 brains (deer, frog, gnarwail, grassgator, grassgekko, mole, krampus, lavae, lightninggoat)

Continuação das seções 46-47 (27 criaturas cobertas).

**Mecânicas de decisão novas, generalizáveis, não modeladas hoje:**

- **Nó de efeito colateral sempre-falha rodando a cada tick, sem bloquear
  a prioridade** (deer: `ActionNode(ResetData)` envolto em
  `FailIfSuccessDecorator` no topo da árvore — um "pump" de sincronização
  de estado desacoplado da lógica de decisão em si, roda todo tick
  independente do resto).
- **Alternância de árvore inteira por filiação a um grupo administrado
  externamente**, não por dia/noite (deer: `TheWorld.components.
  deerherding:IsActiveInHerd` troca entre `herdmentality`/`solomentality`
  completos — mesma "duas sub-árvores" do pig #46, gatilho diferente).
- **Alerta de rebanho compartilhado pra virar-se em conjunto**, não pra
  atacar (deer: `GetClosestHerdAlertTarget` — variante do "alvo de grupo"
  já visto, aqui só orienta `FaceEntity`, sem engajar).
- **Integridade corporal própria (parte quebrada) rebaixa combate pra
  fuga** (gnarwail: `HornIsBroken()` evita engajar mesmo com alvo válido)
  — categoria de gatilho nova, distinta de HP%/tag externa.
- **Hit-and-run com exceção contextual**: ataca sem esperar cooldown se o
  alvo está numa plataforma/veículo, senão aplica cooldown normal
  (gnarwail) — combina padrão já catalogado com override situacional.
- **Formação de seguimento calculada pela física/velocidade do veículo do
  líder** (gnarwail: `GetFormationOffsetNormal` deriva offset da
  velocidade do barco; parado, usa offset estático relativo à borda).
- **Descarte/doação de item condicionado ao valor dele pro próprio ator**
  (gnarwail: só entrega ao líder o que NÃO é seu alimento favorito) —
  "guarda o que quer, dá o que não quer", distinto do roubo do bat (#47).
- **`Wander` com direção enviesada pra longe de uma entidade próxima, e
  validador de terreno customizado injetado** (gnarwail: ângulo oposto ao
  barco mais próximo + `is_valid_turf_at_point` restringindo tiles).
- **Cooldown de reaquisição de alvo de percepção via `components.timer`**
  (grassgator: só busca novo alvo se o timer não existir, mantém o atual
  enquanto existir) — throttle de percepção, variante do cooldown-por-tag
  do catcoon (#47).
- **Ordem de sequência flee→face** como variação de design válida
  (grassgator), frente ao face→flee já catalogado (koalefant #46).
- **Delay ("luto") antes de reconstruir um recurso/casa perdida**, via
  timestamp + threshold em vez de rebuild imediato (mole: `ShouldMakeHome`
  só dispara `GetTime() - needs_home_time > make_home_delay` depois).
- **Reserva de alvo do lado do ITEM-alvo, com expiração própria**
  (mole: `target.selectedasmoletarget = true` + `DoTaskInTime(5,
  SelectedTargetTimeout)`) — variante da ownership cap do buzzard (#47),
  mas a reserva mora no alvo, não numa tabela do lado do ator.
- **`EventNode` como nó pontual dentro de árvore majoritariamente por
  polling**, sem colapsar as demais folhas (mole `"gohome"`) — mais leve
  que o "reactive brain" total do bird (#47).
- **Gatilho climático dedicado pra ida-pra-casa** (mole: `isacidraining`)
  — categoria de risco nova (antes só dia/noite/estação/evento).
- **Quota de saque randomizada por instância**, decidindo quando a
  criatura "termina a missão" e transiciona de estado direto pela árvore
  (krampus: `self.greed = 2 + math.random(4)`, `NumItems() >= greed`
  dispara `GoToState("exit")` via `ActionNode`).
- **`MinPeriod` envolvendo uma sub-árvore inteira como throttle de
  reentrada** (krampus: `MinPeriod(inst, 10, true, stealnode)`) — mecanismo
  de cooldown por tempo mínimo em vez de tag/timer de nó único.
- **Confiança assimétrica**: foge de uma categoria inteira (tag
  `"player"`) mas segue um indivíduo específico dessa mesma categoria
  (krampus: foge de players em geral, `Follow(mytarget)` do alvo
  escolhido).
- **Memória de alvo com auto-invalidação por lifecycle**, independente de
  `combat.target` (krampus: `mytarget` limpo por listener no `"onremove"`
  do próprio alvo).

**Confirmações (reforçam #46/#47, sem novidade):** ida pra casa por
noite/estação (frog, lavae), `SequenceNode{Face, RunAway}` do koalefant
reaparece idêntico no lightninggoat, fuga por tag específica reaparece no
grassgekko.

## 49. Mais 9 brains (monkey, mosquito, mossling, werepig, otter, penguin, perd, pigelite, rocky)

Continuação das seções 46-48 (36 criaturas cobertas). Confirmado:
`pigelitebrain.lua` reforça a identidade de #42 — usa
`entitytracker:GetEntity("king")`, `IsMinigameActive()`, `propweapon`/
`minigameitem` — é mesmo o participante do minigame do Pig King, não um
combatente comum.

**Mecânicas de decisão novas, generalizáveis, não modeladas hoje:**

- **Recurso como pré-requisito do próprio ATAQUE**, não só de uma tarefa
  de trabalho (monkey: só engaja o jogador se `HasAmmo`; sem munição, a
  árvore desvia pra buscar recurso em vez de atacar — mais forte que o
  gate de ferramenta do merm, #46, porque afeta combate direto).
- **`Wander` parametrizável por tabela de timing** (mosquito:
  `minwalktime`/`randwalktime`/`minwaittime`/`randwaittime` — controla o
  "ritmo" do movimento, não só a distância).
- **Flip permanente e irreversível de modo por flag narrativa** (mossling:
  `mother_dead` vira hostil pra sempre) — categoria de gatilho distinta do
  ciclo dia/noite/estação já catalogado.
- **Invoca um protetor externo sob ameaça, e usa a posição AO VIVO desse
  protetor como âncora de `Leash`** (mossling: `SummonGuardian` com
  checagem de limite `SummonsAtMax`).
- **Gate de alimentação pela agressividade do alvo atual em combate**
  (werepig: só come se o oponente em combate não estiver mirando dano
  nele) — categoria distinta do forrageamento-com-risco do carrat (#47).
- **Cooldown único compartilhado entre MÚLTIPLAS funções de ação
  distintas** (otter: `INTERACT_COOLDOWN_NAME`, iniciado no callback de
  sucesso de qualquer `BufferedAction`) — throttle de classe inteira de
  ações, não de um tipo específico.
- **Zona de exclusão espacial ao redor de casa pra evitar repescar o
  próprio estoque já entregue** (otter) — anti-loop de acumulação.
- **Handoff de movimento brain→stategraph via `locomotor:GoToEntity`
  direto + listener de `"onreachdestination"`**, sem `BufferedAction`
  (otter `TryToFish`).
- **Rouba comida do inventário AO VIVO de outro personagem**, formando
  escada explícita de fontes (inventário próprio → chão → container →
  personagem) (otter).
- **Ordens de esquadrão suprimindo o próprio instinto de fuga** (penguin:
  `ShouldRunAway` ignora o predador se `teamattacker.orders` = ATTACK/
  HOLD) — versão mais forte da ordem de líder do bat (#47).
- **Decisão em dois tempos**: agenda a ação via `DoTaskInTime`, mas
  RE-VALIDA as condições (clima/predador/local) dentro do próprio
  callback antes de executar de fato (penguin).
- **Permanência de objeto único possuído, com efeitos em cascata ao
  perdê-lo** (penguin: `myEgg`/`CheckMyEgg` — esquece se roubado, podre ou
  fora do chão).
- **Foge levando o bem, não a si mesmo** (penguin: relocaliza o ovo pro
  inventário em vez de lutar/fugir com ele exposto).
- **Raio de contenção dinâmico que encolhe perto de um objeto possuído
  rastreado** (penguin `GetWanderDistFn`).
- **"Chegada" decidida por comparação entre duas `knownlocations`
  independentes** (penguin `HerdAtRookery`).
- **Alvo-referência ("casa") recomputado ao vivo a cada chamada**, sem
  memória fixa — busca sempre o arbusto mais próximo, com fallback pro
  `homeseeker.home` (perd).
- **Sub-árvore de evento especial ligada por flag booleana de instância**,
  checada dinamicamente (não montada só no `OnStart` como o bird_mutant,
  #47) (perd: `inst.seekshrine`).
- **Loiter probabilístico com janela decrescente** — só elegível após um
  tempo mínimo, chance por tick que decai e se auto-reseta (perd
  `ShouldLoiter`).
- **Wrapper uniforme "…AndAvoid" compondo uma zona de exclusão em toda a
  árvore** (pigelite: toda primitiva — chase/leash/panic — ganha uma zona
  de exclusão fixa ao redor do rei, aplicada consistentemente).
- **Histerese de reivindicação de alvo em esquadrão com threshold de
  troca** (pigelite `GetSeekObj`: mantém o alvo se perto, só troca se o
  novo for significativamente mais perto por uma margem) — mais rica que
  o cap de posse do buzzard (#47) ou a reserva do mole (#48).
- **Histerese de dois limiares numa condição booleana em si**, não só na
  distância de fuga (pigelite `ShouldPanic`).
- **Sincronização de grupo via polling do stategraph de OUTRAS
  instâncias** (pigelite `ShouldMatchOverPose` — varre tags de todos os
  elites antes de posar).
- **Sistema de sorte nomeado gateando uma decisão de IA** (rocky:
  `TryLuckRoll(..., LuckFormulas.LoseFollowerOnPanic)`) — primeiro caso de
  luck-system controlando IA, distinto de `math.random` cru.
- **Comportamento sempre-ativo em `ParallelNode` sob a árvore inteira**,
  não competindo por prioridade (rocky: `UseShield` roda em paralelo à
  `PriorityNode` de combate/wander, garantido incondicional).

## 50. Mais 9 brains (shark, slurper, slurtle, smallbird, spat, squid, warg, walrus, wobster)

Continuação das seções 46-49 (45 criaturas cobertas). Confirmado: assim
como `SGwalrus.lua` (#43), `walrusbrain.lua` também não tem arquivo
próprio pro minion `little_walrus` — um único brain serve os dois.

**Mecânicas de decisão novas, generalizáveis, não modeladas hoje:**

- **Modo ambiental binário que colapsa a árvore inteira numa única ação
  forçada** (shark: fora d'água → só `Attack`, mais nada é avaliado) —
  categoria de gate distinta de dia/noite/estação já catalogada.
- **Fuga habilitada pela EXISTÊNCIA de um timer/flag externo**, não por
  proximidade de predador nem HP — quem liga/desliga a fuga é código de
  fora da brain (shark: `GetRunAwayTarget` só retorna algo se
  `timer:TimerExists("getdistance")`).
- **Latência de reação escalada pela severidade da necessidade** — a
  MESMA sub-árvore duplicada com janelas de espera diferentes conforme a
  urgência (`IsStarving` reage quase instantâneo e é avaliada ANTES do
  combate; `IsHungry` tem atraso maior e vem depois) (smallbird) —
  primeiro caso confirmado de "urgência muda a latência de reação".
- **Fome medida por tempo decorrido desde a última refeição**, não por
  `hunger:GetPercent()` (slurtle: `GetTime() - inst.lastmeal >
  HUNGER_TOLERANCE`) — categoria de gatilho distinta.
- **Roubo de comida em cascata de 4 fontes**, com exclusão por debuff e
  por parentesco de tag (slurtle `StealFoodAction`: mochila equipada →
  slots → container do alvo → pickable; ignora alvos com
  `"healingsalve_acidbuff"` ou da própria tag `"slurtle"`) — estende o
  roubo-de-inventário-ao-vivo do otter (#49).
- **Seleção dinâmica de ARMA equipada conforme estado/tag do alvo**, não
  gate de posse (spat: `CanPhlegmNow`/`CanMeleeNow` escolhem entre
  snotbomb e arma corpo-a-corpo conforme o alvo ainda estar `pinnable`)
  — distinto do gate de munição do monkey (#49): aqui há ESCOLHA entre
  duas armas, não liga/desliga de uma só.
- **Retaliação automática contra quem capturou a própria criatura**
  (squid `TargetFisherman`: se a distância ao pescador do anzol for menor
  que `FISHING_COMBAT_DIST`, seta `combat:SetTarget` direto).
- **Broadcast ativo de alvo de recurso descoberto pra todo o rebanho**
  (squid `EatFishAction`: ao achar peixe, varre
  `herd.components.herd.members` e atribui `foodtarget` a membros sem
  alvo ainda) — PUSH pro grupo inteiro, mais forte que os "alvo
  compartilhado sob demanda" já catalogados (#47/#48).
- **Gate de ação por presença sustentada** — contador de 3 estados
  (nil→timestamp→true) exige o alvo ficar dentro de um raio por N
  segundos CONTÍNUOS, resetando se sair (warg `TryReanimate`), distinto
  de checagem pontual de distância.
- **Imunidade TOTAL ao sistema de pânico por tag de variante** (warg:
  `ismutated` desliga as duas chamadas de panic via `IfNode(not
  ismutated)`) — mais forte que a imunidade pontual a UM predador do
  butterfly (#47), aqui desliga o sistema inteiro.
- **Validação de sucesso de ação consultando feedback da própria
  stategraph**, em vez de assumir sucesso (warg: `ActionNode` dispara
  `"dohowl"` e só retorna `SUCCESS` se `sg:HasStateTag("howling")` ou
  `sg.mem.dohowl` mudou de fato).
- **Kiting por `Follow` a distância durante o cooldown, alternativa ao
  `RunAway`** (walrus: depois de `ChaseAndAttack`, um `Follow(target,
  MIN..MAX_DIST)` incondicional mantém a criatura "sombreando" o alvo em
  vez de recuar) — variante de design pro hit-and-run clássico (#46).
- **Sistema de interesse/isca com compromisso escalonado e limite de
  tentativas** (wobster `nibble_lure`: interesse ≤0 abandona; excedeu
  `MAX_NIBBLES_PER_LURE` força perda de interesse; senão rola dado
  ponderado pelo histórico de mordiscadas pra decidir morder de vez ou só
  se aproximar) — primeiro caso de "atrair com risco de perder interesse"
  confirmado na série.

**Confirmações (reforçam padrões já catalogados, sem novidade):** struggle/
tiredout de anzol idêntico entre squid e wobster (2ª ocorrência
independente do template de pesca, #43); ida pra casa por ciclo dia/noite
reaparece com polaridade invertida no wobster (`should_go_home =
isday or iscaveday` — criatura noturna, casa de dia); slurperbrain e
spatbrain(panic/chase/wander base) não trazem novidade além do já listado.
