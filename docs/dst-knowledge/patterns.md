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

## O que ainda não temos como confirmar

Esta cópia local do jogo só tem `scripts/prefabs/`. Não temos
`scripts/components/` (implementação interna de cada componente) nem
`scripts/stategraphs/` (o `SGwilson.lua` que decide qual animação o personagem
toca). Por isso a pergunta original sobre "golpe vs estocada" continua sem
confirmação — não achamos nenhum prefab de arma com lógica de seleção de
animação de ataque; se essa diferença existe, ela mora no stategraph do
jogador, que não está nesta cópia.
