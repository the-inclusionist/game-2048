// SPDX-License-Identifier: AGPL-3.0-or-later
// AS REGRAS — e nada mais. Sem DOM, sem PixiJS, sem engine: um módulo-folha, puro, de zero dependências.
//
// ========================= POR QUE A PUREZA AQUI NÃO É ESTILO =========================
// Três coisas dependem dela, e nenhuma é estética:
//   · o project `node` do Vitest roda isto sem navegador, então as regras do jogo são auditáveis por uma
//     escola ou por uma Secretaria sem abrir um Chromium;
//   · a DECLARAÇÃO dos sete campos (`declaration.ts`) responde à engine consultando este módulo, então quem
//     responde "onde há uma fusão possível" para a criança cega é a mesma função que decide a jogada — e não
//     uma segunda cópia da regra que pode divergir em silêncio;
//   · o alto contraste por PAPEL precisa perguntar "esta peça pode fundir?", que é uma pergunta de regra e
//     não de desenho.
//
// ========================= EXPOENTES, NÃO VALORES =========================
// `0` é casa vazia; `n` é a peça 2^n. Fundir é `n + 1`. O objetivo é `11`.
//
// Não é economia de memória — é o que faz "potência de dois" ser o MODELO e não um rótulo colado depois. O
// enunciado da atividade ("dois elevado a quê?") lê exatamente o número que a mecânica move, e a narração
// para quem não vê a tela pode dizer "dois elevado a três" sem nenhuma conversão inventada no caminho.
//
// ========================= ESCRITO DAS REGRAS, NÃO DE UM FORK =========================
// `docs/LICENSES.md` explica por quê: regra de jogo não tem direito autoral, implementação tem, e a
// titularidade do Município tem de ser do inteiro. `tests/board.node.test.ts` é onde "escrevemos do zero"
// deixa de ser alegação e vira propriedade medida.

/** Lado do tabuleiro. Toda a mecânica é genérica sobre ele — uma variante 5×5 é esta linha e mais nada. */
export const SIZE = 4;

/** O expoente que fecha a rodada: 2^11 = 2048. É o `need` do campo 5 do contrato da engine. */
export const OBJETIVO = 11;

/**
 * A fatia do sorteio que sai 4 em vez de 2 — 10%, como no 2048 de que este jogo descende.
 *
 * ⚠️ É a única regra aqui que é ESCOLHA e não dedução, então fica nomeada em vez de espalhada como `0.1`
 * dentro de um `if`. Ela governa o ritmo do jogo inteiro: mais 4 encurta a partida, menos 4 a arrasta.
 */
export const CHANCE_DE_QUATRO = 0.1;

/** O tabuleiro: `SIZE × SIZE` expoentes, em ordem de leitura (índice = `y * SIZE + x`). Imutável. */
export type Board = readonly number[];

export type Direction = 'left' | 'right' | 'up' | 'down';

/** Uma fusão que ACONTECEU: onde a peça nova ficou, e qual expoente ela passou a ter. */
export interface Merge {
  readonly at: number;
  readonly exponent: number;
}

/** O resultado de uma jogada. `moved: false` é o que impede o sorteio de premiar uma tecla inútil. */
export interface Move {
  readonly board: Board;
  readonly merges: readonly Merge[];
  readonly moved: boolean;
  /** A soma dos VALORES formados — o placar da rodada, que morre com ela (ADR-0037). */
  readonly gained: number;
}

/** Onde a peça nova caiu e o que ela é. `null` quando não havia casa livre, e null é resposta. */
export interface Spawn {
  readonly board: Board;
  readonly at: number;
  readonly exponent: number;
}

export const emptyBoard = (): Board => new Array<number>(SIZE * SIZE).fill(0);

/**
 * Os CAMINHOS que uma direção percorre, cada um começando na PAREDE para onde se empurra.
 *
 * É a única parte que sabe o que "esquerda" quer dizer, e é por isso que ela existe separada: com os
 * caminhos em mãos, deslizar para os quatro lados é o MESMO código sobre listas diferentes. A alternativa —
 * quatro laços com índices espelhados — é onde a regra de fundir-uma-vez-só é implementada quatro vezes e
 * fica certa em três.
 */
function caminhos(dir: Direction): number[][] {
  const linhas: number[][] = [];
  for (let a = 0; a < SIZE; a++) {
    const reta: number[] = [];
    for (let b = 0; b < SIZE; b++) {
      reta.push(dir === 'left' || dir === 'right' ? a * SIZE + b : b * SIZE + a);
    }
    linhas.push(dir === 'right' || dir === 'down' ? reta.reverse() : reta);
  }
  return linhas;
}

/**
 * Empurra o tabuleiro e funde o que encostar. Devolve um tabuleiro NOVO; o de entrada não é tocado.
 *
 * ⚠️ A REGRA QUE OS FORKS ERRAM está no `k++` extra lá embaixo: ao fundir um par, o parceiro é CONSUMIDO,
 * então a peça recém-formada não pode fundir outra vez na mesma jogada. `[2,2,2,2]` para a esquerda é
 * `[4,4]`, nunca `[8]` — e a diferença não é de detalhe: com cascata, uma partida acaba em quinze jogadas.
 */
export function slide(board: Board, dir: Direction): Move {
  const saida = [...board];
  const merges: Merge[] = [];
  let gained = 0;
  let moved = false;

  for (const caminho of caminhos(dir)) {
    const cheias = caminho.map((i) => board[i]).filter((e) => e !== 0);
    const resultado: number[] = [];

    for (let k = 0; k < cheias.length; k++) {
      if (k + 1 < cheias.length && cheias[k] === cheias[k + 1]) {
        const exponent = cheias[k] + 1;
        resultado.push(exponent);
        merges.push({ at: caminho[resultado.length - 1], exponent });
        gained += 2 ** exponent;
        k++; // ⚠️ o parceiro foi consumido: é isto que impede a cascata
      } else {
        resultado.push(cheias[k]);
      }
    }

    caminho.forEach((destino, k) => {
      const valor = resultado[k] ?? 0;
      if (saida[destino] !== valor) moved = true;
      saida[destino] = valor;
    });
  }

  return { board: saida, merges, moved, gained };
}

/** Os índices das casas vazias, em ordem de leitura. */
export const emptySpots = (board: Board): number[] =>
  board.reduce<number[]>((acc, e, i) => (e === 0 ? (acc.push(i), acc) : acc), []);

/**
 * Sorteia uma peça nova numa casa vazia. O acaso ENTRA por parâmetro, e essa é a decisão importante.
 *
 * Um `Math.random()` aqui dentro tornaria a partida irreproduzível e este módulo intestável no ponto que
 * mais importa. Com o gerador injetado, o jogo passa o RNG semeado da engine (`core/rng`) e a mesma semente
 * dá a mesma partida — que é o que o ADR-0049 pede de uma recompensa determinística, e o que deixa uma
 * professora repetir exatamente a rodada que a criança acabou de jogar.
 *
 * Duas tiragens, nesta ordem: a CASA e depois o VALOR. A ordem é contrato, porque é o que um teste com
 * gerador falso precisa saber para escrever a sequência.
 */
export function spawn(board: Board, rnd: () => number): Spawn | null {
  const livres = emptySpots(board);
  if (livres.length === 0) return null;

  const escolha = Math.min(livres.length - 1, Math.floor(rnd() * livres.length));
  const at = livres[escolha];
  const exponent = rnd() < CHANCE_DE_QUATRO ? 2 : 1;

  const novo = [...board];
  novo[at] = exponent;
  return { board: novo, at, exponent };
}

/**
 * As casas que participam de alguma fusão disponível AGORA — ordenadas, sem repetição.
 *
 * ⚠️ ESTE É O CAMPO 5 DO CONTRATO DA ENGINE, e é onde este jogo paga a engine de volta. `targetsOf` devolve
 * "onde está o que ainda conta", e o sonar compara distâncias na topologia declarada. Num quiz linear ele
 * era correto e inútil (o achado 9 do segundo consumidor diz isso com todas as letras); aqui ele responde
 * "onde há uma fusão possível", que para uma criança que não vê a tela é a informação da mecânica inteira.
 */
export function mergeSpots(board: Board): number[] {
  const casas = new Set<number>();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      if (board[i] === 0) continue;
      if (x + 1 < SIZE && board[i + 1] === board[i]) { casas.add(i); casas.add(i + 1); }
      if (y + 1 < SIZE && board[i + SIZE] === board[i]) { casas.add(i); casas.add(i + SIZE); }
    }
  }
  return [...casas].sort((a, b) => a - b);
}

/** Ainda há jogada? Uma casa vazia basta; sem nenhuma, é preciso um par vizinho. */
export const canMove = (board: Board): boolean =>
  emptySpots(board).length > 0 || mergeSpots(board).length > 0;

/** O maior EXPOENTE em jogo — o `have` do objetivo, que se compara com `OBJETIVO`. */
export const maxTile = (board: Board): number => board.reduce((m, e) => (e > m ? e : m), 0);
