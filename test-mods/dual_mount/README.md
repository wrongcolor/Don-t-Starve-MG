# Dual Mount (protótipo)

Mod escrito à mão (não gerado pela ferramenta) pra validar a mecânica de dois
jogadores montados na mesma criatura, adicionando um segundo assento
diretamente na **Woby real** (`wobybig`, o estágio crescido/montável dela) em
vez de criar uma criatura própria pra isso.

## Como funciona

- `AddPrefabPostInit("wobybig", ...)` (`modmain.lua`) adiciona o componente
  `pillion` à Woby real assim que ela nasce — nenhum prefab novo é necessário,
  e nenhuma arte nova também: a Woby já tem tudo que o componente precisa
  (`rideable`, e os próprios `ApplyBuildOverrides`/`ClearBuildOverrides` que
  ela já define pro condutor — ver abaixo).
- O **condutor** monta pela ação nativa `MOUNT` (componente `rideable` padrão do
  jogo, já existente na Woby) — controla o movimento normalmente, sem nenhuma
  mudança.
- O **passageiro** digita `/pillion` no chat estando perto da Woby já montada,
  e é anexado como filho do condutor, num offset fixo ao lado dele — mesma
  técnica que `components/rider.lua`'s próprio `Rider:Mount` usa pro condutor,
  só que sem posição central. Não é clique porque a Woby monta deixa de ser
  clicável sozinha assim que alguém a monta (ver "Limitação conhecida" abaixo)
  — o comando roda inteiro no servidor e resolve a montaria mais próxima com
  a tag `pillion_hasdriver`, sem depender de nada client-side.
- Os dois usam o mesmo banco de animação genérico de montaria (`wilsonbeefalo`
  — confirmado em `components/rider.lua`: é o banco usado pra QUALQUER
  personagem montando QUALQUER criatura montável, não só beefalo, apesar do
  nome), então não precisa de arte com dois assentos. O visual do passageiro
  (reins/enfeites) reaproveita automaticamente o `wobybig.ApplyBuildOverrides`
  real da própria Woby — `components/rider.lua` já chama esse método no
  condutor por convenção padrão do jogo (`if target.ApplyBuildOverrides ~= nil
  then target:ApplyBuildOverrides(...) end`), e `pillion.lua` reusa a mesma
  convenção pro passageiro.
- O passageiro copia o estado do condutor (parado/correndo) escutando o evento
  nativo `"newstate"` do condutor — sem precisar mexer no stategraph nativo do
  jogador além de registrar dois estados extras (`pillion_idle`/`pillion_moving`).
- Se o condutor desmontar, desconectar, ou o passageiro desconectar, o
  passageiro é automaticamente removido do assento.

## Limitação conhecida (por que não é um clique)

Tentativas de fazer isso via clique direito (a ação nativa "MOUNT" usa esse
caminho) esbarraram em duas coisas reais, confirmadas direto nos scripts do
jogo:

1. `components/rider.lua`'s `Rider:Mount` chama `target:RemoveFromScene()` na
   MONTARIA assim que alguém monta nela (a mesma técnica que este mod usa pro
   passageiro) — ou seja, a Woby deixa de ser clicável sozinha; só o
   **condutor** (que vira o "pai" dela via `AddChild`) continua clicável.
2. `Rider:GetMount()` (`components/rider_replica.lua`) só funciona pro
   **próprio** jogador — é dado "classified", privado, que nenhum outro
   cliente consegue ler. Não tem como um segundo jogador perguntar "o que
   essa outra pessoa está montando" pela API real do jogo.

Contornar isso tentando clicar no condutor (em vez da montaria) e resolver a
montaria via uma tag/netvar pública não deu certo de forma confiável na
prática (mesmo replicando o padrão do handler real `rideable` do próprio
jogo). Por isso o comando de chat: ele roda inteiro no servidor
(`serverfn`), então nenhum desses problemas de visibilidade cliente/servidor
existe — `caller` já é a entidade real do jogador, e a montaria é achada
via `TheSim:FindEntities` com a tag `pillion_hasdriver`.

## Como instalar

1. Copie esta pasta inteira para `Documents/Klei/DoNotStarveTogether/mods/`.
2. Ative o mod na lista de mods do jogo.
3. Reinicie se solicitado.

## Checklist de teste manual

- [ ] `c_spawn("wobybig")` no console (F1) sem erro (já nasce com `canride =
      true`, não precisa domesticar). Se o jogo bloquear a montaria por não
      ser o Walter, teste como Walter em vez disso — isso é comportamento
      vanilla, não deste mod.
- [ ] Um jogador (o condutor) clica direito na Woby uma única vez → monta
      normalmente (ação nativa), visual do condutor (reins) igual ao vanilla
      de sempre.
- [ ] Com a Woby já montada por ele, um SEGUNDO jogador (não o condutor —
      `pillion.lua` bloqueia `doer == driver` de propósito), estando perto da
      Woby, digita `/pillion` no chat → é anexado ao lado do condutor.
- [ ] Andar/parar com o condutor: o passageiro acompanha visualmente sem
      controlar o próprio movimento.
- [ ] Passageiro clica em si mesmo → "Descer da garupa" o solta na posição do
      condutor.
- [ ] Condutor desmonta (`ACTIONS.DISMOUNT`) com passageiro sentado → os dois
      descem.
- [ ] Passageiro se desconecta enquanto sentado → sem erro no log do host.
