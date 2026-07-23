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
