// SPDX-License-Identifier: AGPL-3.0-or-later
// A ANIMAÇÃO DE DESLIZE — a parte que é ARITMÉTICA, separada da parte que é relógio.
//
// ========================= UM RELÓGIO, UMA CURVA, DOIS PINTORES =========================
// O tabuleiro é desenhado por duas camadas: o canvas pinta a figura, o DOM escreve os números. Numa animação
// isso vira um risco novo — se cada camada tivesse a própria animação (uma em `requestAnimationFrame`, outra
// numa transição de CSS), elas andariam com relógios diferentes e o número descolaria da peça no meio do
// movimento. Já perdemos uma tarde com as duas camadas medidas por réguas diferentes PARADAS; em movimento
// seria pior e mais difícil de ver.
//
// Então: **um só `requestAnimationFrame`, um só `t`, uma só curva** — e as duas camadas recebem as MESMAS
// coordenadas, calculadas aqui. Ficarem juntas deixa de ser disciplina e passa a ser construção.
//
// ========================= PURO, PORQUE O RELÓGIO NÃO É TESTÁVEL E A CONTA É =========================
// Nada aqui sabe o que é `requestAnimationFrame`, `Date` ou canvas. Entra `t` entre 0 e 1, sai posição em
// pixels lógicos. O laço vive em `boot/main.ts`, que é onde o tempo mora.
import type { Movimento } from './board.ts';
import { SIZE, type Board } from './board.ts';
import { cellRect } from './geometry.ts';

/**
 * A duração de uma jogada, em milissegundos.
 *
 * ⚠️ CURTA DE PROPÓSITO. Este jogo é de turno do jogador (campo 6 do contrato: `tick: 'player'`), e uma
 * criança que joga bem encadeia jogadas depressa. Animação longa em jogo de turno vira espera, e espera vira
 * a criança apertando a tecla de novo achando que não funcionou. 110 ms é o suficiente para o olho seguir a
 * peça e curto o bastante para não entrar no caminho.
 */
export const DURACAO_MS = 110;

/**
 * ⚠️ E ELA É ZERO SOB `prefers-reduced-motion`, sem passar por menu nenhum.
 *
 * É a WCAG 2.3.3 (Animation from Interactions), e a decisão de não exigir que a criança ache uma opção:
 * quem precisa disso já configurou no sistema operacional, e o jogo tem de obedecer sem ser perguntado.
 *
 * ⚠️ ACHADO DA ENGINE, anotado aqui porque é onde ele dói: o `platform/storage` dela guarda `reducedMotion`,
 * mas o valor é um objeto de bandeiras do JOGO DE PLATAFORMA — `parallax`, `decor`, `items`, `particles`.
 * Não existe um "movimento reduzido" GERAL que um consumidor de outro gênero possa ler, e escolher a
 * bandeira `items` para decidir sobre peças de tabuleiro seria adivinhar a forma da pergunta. É a mesma
 * família do achado 2 (o dicionário): uma configuração modelada para um gênero, que não atravessa.
 */
export const duracaoDaJogada = (movimentoReduzido: boolean): number => (movimentoReduzido ? 0 : DURACAO_MS);

/**
 * Vale a pena animar AGORA?
 *
 * ⚠️ NÃO SE ANIMA NUMA ABA ESCONDIDA, e isto é um defeito MEDIDO e não uma precaução. Num documento oculto o
 * navegador PARA o `requestAnimationFrame` — não o atrasa, para. O laço que espera o próximo quadro nunca é
 * chamado, a promessa nunca resolve, e o quadro final — aquele que desenha o tabuleiro NOVO — nunca chega.
 *
 * O resultado observado em 2026-09-05, com o painel do navegador oculto: o modelo já em `4:2 12:4` e a tela
 * ainda mostrando as duas peças de antes, com o contador em "1 de 11" em vez de "2 de 11". Para a criança
 * isso é trocar de aba (ou o tablet apagar a tela) no meio de uma jogada e voltar para um tabuleiro que
 * mente — até ela jogar de novo.
 *
 * A resposta certa não é animar mais rápido: é NÃO ANIMAR. Ninguém está olhando, e o que importa é que o
 * estado desenhado alcance o estado real imediatamente.
 */
export const podeAnimar = (duracao: number, documentoVisivel: boolean): boolean =>
  duracao > 0 && documentoVisivel;

/**
 * Quanto esperar antes de desistir do relógio e ir direto ao quadro final.
 *
 * O `podeAnimar` cobre o caso NOMEADO (aba escondida). Isto cobre o resto: navegador que estrangula quadros
 * por bateria, aparelho que engasga, uma janela minimizada que não conta como `hidden`. Três vezes a duração
 * é folga bastante para uma animação honesta e curto o suficiente para ninguém ver o tabuleiro parado.
 *
 * ⚠️ E o socorro é o QUADRO FINAL, nunca um estado intermediário: chegar atrasado ao lugar certo é aceitável,
 * parar no meio do caminho não é.
 */
export const socorroMs = (duracao: number): number => duracao * 3 + 50;

/**
 * A curva. `easeOut` quadrática: sai rápido e freia no fim.
 *
 * A escolha não é estética. Numa peça que desliza para uma parede, frear na chegada é o que faz o olho
 * entender que ela ENCOSTOU em vez de ter sido teletransportada — e é o oposto de um `easeIn`, que faria a
 * peça parecer cair.
 */
export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

/** Onde uma peça está, em pixels lógicos, no instante `t` (0 = saída, 1 = chegada). */
export interface Peca {
  readonly x: number;
  readonly y: number;
  readonly exponent: number;
  /**
   * A CASA A QUE ELA PERTENCE — o destino, para quem está em voo; a própria casa, para quem está parada.
   *
   * ⚠️ Ela vem junto porque quem desenha precisa perguntar o PAPEL daquela casa à declaração (campo 2 do
   * contrato), e derivar o índice de volta a partir de `x`/`y` seria desfazer a conta da geometria com
   * divisão e arredondamento — uma segunda implementação da mesma coisa, no lugar mais fácil de errar.
   */
  readonly at: number;
}

/** Recorta `t` em [0,1]. Um `t` fora do intervalo vem de relógio que pulou, e extrapolar joga a peça fora. */
const travar = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

/** A posição de UMA peça no instante `t`. */
export function posicaoDe(mov: Movimento, t: number): Peca {
  const a = cellRect(mov.from);
  const b = cellRect(mov.to);
  const p = easeOut(travar(t));
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, exponent: mov.exponent, at: mov.to };
}

/**
 * TODAS as peças em movimento, no instante `t`.
 *
 * As duas metades de uma fusão continuam sendo DUAS peças até `t = 1`, uma em cima da outra na chegada. É o
 * que se vê num 2048 bem-feito: as duas encostam e só então viram uma — e é por isso que `slide` devolve os
 * dois caminhos em vez de um.
 */
export const pecasNoInstante = (movimentos: readonly Movimento[], t: number): Peca[] =>
  movimentos.map((m) => posicaoDe(m, t));

/* ===================== O LAÇO =====================
 *
 * ⚠️ ELE MORAVA DENTRO DO `bootar()`, e mudou-se para cá por uma razão medida: lá dentro era INTESTÁVEL. O
 * relógio de quadros do navegador não roda num painel oculto, e a tentativa de observá-lo ao vivo devolveu
 * zero quadros três vezes seguidas — não porque o laço estivesse errado, mas porque o ambiente não o deixava
 * correr. Ficar dependendo do olho para saber se o cancelamento e o socorro funcionam é o que este projeto
 * chama de gate que nunca pôde ficar vermelho.
 *
 * A saída é a mesma que o `core/rng` da engine já usa para o acaso: **o relógio ENTRA por parâmetro**. Com
 * ele injetado, um teste de nó avança o tempo à mão e verifica o que só acontece nas bordas — a jogada que
 * cancela a anterior, o socorro que salva o quadro final, o `t` que nunca passa de 1.
 */

/** O relógio, injetado. No navegador são as funções nativas; num teste, um relógio de mentira. */
export interface Relogio {
  readonly agora: () => number;
  readonly proximoQuadro: (fn: (agora: number) => void) => void;
  readonly depoisDe: (fn: () => void, ms: number) => number;
  readonly cancelarEspera: (id: number) => void;
}

export interface Animador {
  /** Corre uma jogada. Resolve quando o movimento acaba — por chegada, por cancelamento ou por socorro. */
  correr(movimentos: readonly Movimento[], duracao: number, documentoVisivel: boolean): Promise<void>;
}

/**
 * O laço, com o relógio e o pintor injetados.
 *
 * `aoQuadro` recebe as peças de cada instante e desenha as DUAS camadas com elas — é o que garante que canvas
 * e DOM andem juntos por construção, e não por disciplina.
 */
export function criarAnimador(relogio: Relogio, aoQuadro: (pecas: readonly Peca[]) => void): Animador {
  let atual = 0;

  return {
    correr(movimentos, duracao, documentoVisivel) {
      const meu = ++atual;
      if (movimentos.length === 0 || !podeAnimar(duracao, documentoVisivel)) return Promise.resolve();

      return new Promise<void>((pronto) => {
        const inicio = relogio.agora();
        let espera = 0;
        let acabada = false;
        const terminar = (): void => {
          if (acabada) return;
          acabada = true;
          relogio.cancelarEspera(espera);
          pronto();
        };

        // O SOCORRO: se o relógio de quadros parar, a promessa resolve assim mesmo e o chamador desenha o
        // quadro final. Chegar atrasado ao lugar certo é aceitável; parar no meio do caminho não é.
        espera = relogio.depoisDe(terminar, socorroMs(duracao));

        const passo = (agora: number): void => {
          // ⚠️ UMA JOGADA NOVA CANCELA A ANTERIOR em vez de enfileirar. Uma criança que segura a seta produz
          // jogadas mais depressa que a duração da animação, e enfileirar deixaria o tabuleiro DEVENDO
          // animações — o estado na tela atrasado em relação ao real, que é a pior forma de um jogo de turno
          // mentir.
          if (meu !== atual) return terminar();
          const t = (agora - inicio) / duracao;
          aoQuadro(pecasNoInstante(movimentos, t));
          if (t < 1) relogio.proximoQuadro(passo);
          else terminar();
        };
        relogio.proximoQuadro(passo);
      });
    },
  };
}

/** O relógio de verdade. Uma linha, e é a única parte disto que um teste não consegue exercitar. */
export const relogioDoNavegador = (win: Window): Relogio => ({
  agora: () => win.performance.now(),
  proximoQuadro: (fn) => { win.requestAnimationFrame(fn); },
  depoisDe: (fn, ms) => win.setTimeout(fn, ms),
  cancelarEspera: (id) => win.clearTimeout(id),
});

/** As peças de um tabuleiro PARADO — o quadro final, e o que se desenha quando não há animação. */
export function pecasParadas(board: Board): Peca[] {
  const out: Peca[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (board[i] === 0) continue;
    const r = cellRect(i);
    out.push({ x: r.x, y: r.y, exponent: board[i], at: i });
  }
  return out;
}
