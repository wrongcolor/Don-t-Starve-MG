# Dual Mount (protótipo)

Mod escrito à mão (não gerado pela ferramenta) pra validar a mecânica de dois
jogadores montados na mesma criatura, discutida a partir da análise de como a
Woby (`Original/prefabs/prefabs/wobybig.lua`) monta jogadores no DST.

## Como funciona

- `twinsteed`: criatura montável simples, reaproveita 100% os assets vanilla
  `beefalo`/`beefalo_build.zip` (nenhuma arte nova é necessária).
- O **condutor** monta pela ação nativa `MOUNT` (componente `rideable` padrão do
  jogo) — controla o movimento normalmente.
- O **passageiro** clica com o botão direito na criatura já montada ("Sentar na
  garupa") e é anexado como filho do condutor, num offset fixo ao lado dele —
  mesma técnica que `Rider:Mount` usa pro condutor, só que sem posição central.
- Os dois usam o mesmo banco de animação genérico de montaria (`wilsonbeefalo`,
  o mesmo que qualquer personagem usa pra montar um beefalo/Woby), então não
  precisa de arte com dois assentos.
- O passageiro copia o estado do condutor (parado/correndo) escutando o evento
  nativo `"newstate"` do condutor — sem precisar mexer no stategraph nativo do
  jogador além de registrar dois estados extras (`pillion_idle`/`pillion_moving`).
- Se o condutor desmontar, desconectar, ou o passageiro desconectar, o
  passageiro é automaticamente removido do assento.

## Limitação conhecida

O componente `pillion` só existe no servidor (como a maioria dos componentes
de gameplay do jogo). Isso funciona sem problema quando o **host** é um dos
dois cavaleiros (o processo do host roda cliente+servidor juntos). Se quiser
testar com **dois clientes remotos** de verdade, o cliente convidado não vai
ver o botão "Sentar na garupa" ao mirar na criatura, porque ele só enxerga
componentes replicados (`inst.replica.*`) de entidades que não são dele. Pra
resolver isso definitivamente falta um `pillion_replica.lua` expondo "tem vaga
livre?" via netvar — não implementado neste protótipo pra manter o escopo
pequeno.

## Como instalar

1. Copie esta pasta inteira para `Documents/Klei/DoNotStarveTogether/mods/`.
2. Ative o mod na lista de mods do jogo.
3. Reinicie se solicitado.

## Checklist de teste manual

- [ ] `c_spawn("twinsteed")` no console (F1) sem erro.
- [ ] Como host: clique direito na criatura → monta normalmente (ação nativa).
- [ ] Ainda montado, clique direito de novo → "Sentar na garupa" aparece e
      anexa o segundo jogador ao lado do condutor.
- [ ] Andar/parar com o condutor: o passageiro acompanha visualmente sem
      controlar o próprio movimento.
- [ ] Passageiro clica em si mesmo → "Descer da garupa" o solta na posição do
      condutor.
- [ ] Condutor desmonta (`ACTIONS.DISMOUNT`) com passageiro sentado → os dois
      descem.
- [ ] Passageiro se desconecta enquanto sentado → sem erro no log do host.
