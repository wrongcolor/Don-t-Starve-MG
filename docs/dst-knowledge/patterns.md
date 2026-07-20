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

## 18. Buff de combate temporário ao comer — **NÃO confirmado, implementado mesmo assim**

Diferente de todo o resto deste catálogo, este padrão **não** veio de ler um
prefab real — implementado a pedido (ItemDef.onEatBuff) sem cópia local do
jogo disponível pra confirmar. Baseado na API pública amplamente documentada
pela comunidade de modding de DST:

```lua
inst.components.edible.oneatenfn = function(inst, eater)
    if eater == nil or eater.components.combat == nil then return end
    eater.components.combat.externaldamagemultipliers:SetModifier(inst, 1 + TUNING.X_MULT, "x_damage_buff")
    eater:DoTaskInTime(TUNING.X_DURATION, function()
        if eater.components.combat ~= nil then
            eater.components.combat.externaldamagemultipliers:RemoveModifier(inst, "x_damage_buff")
        end
    end)
end
```

`edible.oneatenfn` e `combat.externaldamagemultipliers` (um `SourceModifierList`)
moram em `scripts/components/`, que esta cópia local nunca teve (ver seção
abaixo) — então, ao contrário dos outros itens deste arquivo, **ninguém leu o
código-fonte real pra confirmar a assinatura exata**. Testar em jogo antes de
publicar qualquer mod que use isso.

**Prioridade de re-confirmação:** alta — é o único padrão do catálogo gerado
sem leitura de script real; se algum dia tivermos acesso a
`scripts/components/edible.lua` e `scripts/components/combat.lua`, confirmar
aqui e remover este aviso.

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

## O que ainda não temos como confirmar

Esta cópia local do jogo só tem `scripts/prefabs/`. Não temos
`scripts/components/` (implementação interna de cada componente) nem
`scripts/stategraphs/` (o `SGwilson.lua` que decide qual animação o personagem
toca). Por isso a pergunta original sobre "golpe vs estocada" continua sem
confirmação — não achamos nenhum prefab de arma com lógica de seleção de
animação de ataque; se essa diferença existe, ela mora no stategraph do
jogador, que não está nesta cópia. O mesmo vale para o buff de dano ao comer
(seção 18) e para o `eater` component (`components.json`, `modeled_in_app: false`).
