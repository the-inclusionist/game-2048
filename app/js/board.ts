// SPDX-License-Identifier: AGPL-3.0-or-later
// THE RULES — and nothing else. No DOM, no PixiJS, no engine: a pure leaf module with zero dependencies.
//
// ========================= WHY THE PURITY HERE IS NOT STYLE =========================
// Three things depend on it, and none of them is aesthetic:
//   · Vitest's `node` project runs this without a browser, so the rules of the game are auditable by a
//     school or by a Secretaria without opening a Chromium;
//   · the seven-field DECLARATION (`declaration.ts`) answers the engine by asking this module, so whatever
//     tells a blind child "where is a merge available" is the same function that decides the move — not a
//     second copy of the rule that can drift in silence;
//   · high contrast BY ROLE has to ask "can this tile merge?", which is a question about rules and not
//     about drawing.
//
// ========================= EXPONENTS, NOT VALUES =========================
// `0` is an empty square; `n` is the tile 2^n. Merging is `n + 1`. The goal is `11`.
//
// This is not memory thrift — it is what makes "power of two" the MODEL rather than a label stuck on
// afterwards. The activity's question ("two to the what?") reads exactly the number the mechanic moves, and
// the narration for a child who cannot see the screen can say "two to the third" with no conversion invented
// along the way.
//
// ========================= WRITTEN FROM THE RULES, NOT FROM A FORK =========================
// `docs/LICENSES.md` explains why: the rules of a game carry no copyright, an implementation does, and the
// Município's title has to cover the whole of what it owns. `tests/board.node.test.ts` is where "we wrote it
// from scratch" stops being a claim and becomes a measured property.

/** Side of the board. All the mechanics are generic over it — a 5×5 variant is this line and nothing else. */
export const SIZE = 4;

/** The exponent that closes the round: 2^11 = 2048. It is the `need` of the contract's field 5. */
export const OBJETIVO = 11;

/**
 * The share of the draw that yields a 4 instead of a 2 — 10%, as in the 2048 this game descends from.
 *
 * ⚠️ It is the one rule here that is a CHOICE rather than a deduction, so it is named instead of scattered as
 * a `0.1` inside an `if`. It governs the pace of the whole game: more 4s shortens the round, fewer drags it.
 */
export const CHANCE_DE_QUATRO = 0.1;

/** The board: `SIZE × SIZE` exponents in reading order (index = `y * SIZE + x`). Immutable. */
export type Board = readonly number[];

export type Direction = 'left' | 'right' | 'up' | 'down';

/** A merge that HAPPENED: where the new tile ended up, and which exponent it took. */
export interface Merge {
  readonly at: number;
  readonly exponent: number;
}

/**
 * THE PATH OF ONE TILE in this move: where it left from, where it stopped, and whether it died in a merge.
 *
 * ⚠️ THE RULES ARE WHAT KNOWS THIS, which is why it lives here and not in the renderer. A slide animation has
 * to answer "where did the tile now in this square come from", and a renderer can only GUESS that by diffing
 * two boards — which fails on exactly the interesting case, the merge, where TWO tiles end in the same place
 * and the guess has to pick one. There is no guess here: `slide` already knew, and now it says.
 *
 * Every tile is in the list, including one that did not move (`from === to`). Whoever draws needs all of
 * them, and a list of "only the ones that moved" would force the renderer to rediscover the rest.
 */
export interface Movimento {
  readonly from: number;
  readonly to: number;
  /** THE EXPONENT IT HELD ON LEAVING — not what it became. This is the number that travels across the screen. */
  readonly exponent: number;
  /** Did it vanish into a merge? Then it disappears on arrival, and the new tile is born in its place. */
  readonly merged: boolean;
}

/** The result of a move. `moved: false` is what stops the draw from rewarding a useless keystroke. */
export interface Move {
  readonly board: Board;
  readonly merges: readonly Merge[];
  /** The path of EVERY tile, for whoever draws the slide. See `Movimento`. */
  readonly movimentos: readonly Movimento[];
  readonly moved: boolean;
  /** The sum of the VALUES formed — the round's score, which dies with it (ADR-0037). */
  readonly gained: number;
}

/** Where the new tile landed and what it is. `null` when there was no free square, and null is an answer. */
export interface Spawn {
  readonly board: Board;
  readonly at: number;
  readonly exponent: number;
}

export const emptyBoard = (): Board => new Array<number>(SIZE * SIZE).fill(0);

/**
 * The PATHS a direction travels, each one starting at the WALL being pushed towards.
 *
 * This is the only part that knows what "left" means, and that is why it exists separately: with the paths in
 * hand, sliding in all four directions is the SAME code over different lists. The alternative — four loops
 * with mirrored indices — is where the merge-once-only rule gets implemented four times and comes out right
 * in three.
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
 * Pushes the board and merges whatever meets. Returns a NEW board; the input is untouched.
 *
 * ⚠️ THE RULE THE FORKS GET WRONG is the extra `k++` below: merging a pair CONSUMES the partner, so a freshly
 * formed tile cannot merge again in the same move. `[2,2,2,2]` to the left is `[4,4]`, never `[8]` — and the
 * difference is not a detail: with the cascade, a round ends in fifteen moves.
 */
export function slide(board: Board, dir: Direction): Move {
  const saida = [...board];
  const merges: Merge[] = [];
  const movimentos: Movimento[] = [];
  let gained = 0;
  let moved = false;

  for (const caminho of caminhos(dir)) {
    // ⚠️ THE INDICES, not the values. The earlier version did `.map(i => board[i]).filter(...)` and lost each
    // tile's ORIGIN along the path — enough to compute the next board and not enough to say where each tile
    // came from. Keeping the index costs nothing and is the half that was missing.
    const cheias = caminho.filter((i) => board[i] !== 0);
    const resultado: number[] = [];

    for (let k = 0; k < cheias.length; k++) {
      const destino = caminho[resultado.length];
      if (k + 1 < cheias.length && board[cheias[k]] === board[cheias[k + 1]]) {
        const exponent = board[cheias[k]] + 1;
        resultado.push(exponent);
        merges.push({ at: destino, exponent });
        // BOTH tiles travel to the same square, and both die there. It is the only case where two paths end
        // at the same point, and it is exactly the case a renderer could not have guessed.
        movimentos.push({ from: cheias[k], to: destino, exponent: exponent - 1, merged: true });
        movimentos.push({ from: cheias[k + 1], to: destino, exponent: exponent - 1, merged: true });
        gained += 2 ** exponent;
        k++; // ⚠️ the partner was consumed: this is what stops the cascade
      } else {
        resultado.push(board[cheias[k]]);
        movimentos.push({ from: cheias[k], to: destino, exponent: board[cheias[k]], merged: false });
      }
    }

    caminho.forEach((destino, k) => {
      const value = resultado[k] ?? 0;
      if (saida[destino] !== value) moved = true;
      saida[destino] = value;
    });
  }

  return { board: saida, merges, movimentos, moved, gained };
}

/** The indices of the empty squares, in reading order. */
export const emptySpots = (board: Board): number[] =>
  board.reduce<number[]>((acc, e, i) => (e === 0 ? (acc.push(i), acc) : acc), []);

/**
 * Draws a new tile into an empty square. Chance ENTERS as a parameter, and that is the decision that matters.
 *
 * A `Math.random()` in here would make the round irreproducible and this module untestable at the point that
 * matters most. With the generator injected, the game passes the engine's seeded RNG (`core/rng`) and the
 * same seed gives the same round — which is what ADR-0049 asks of a deterministic reward, and what lets a
 * teacher replay exactly the round the child has just played.
 *
 * Two draws, in this order: the SQUARE and then the VALUE. The order is contract, because it is what a test
 * with a fake generator needs to know in order to write the sequence.
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
 * The squares taking part in some merge available NOW — sorted, without repetition.
 *
 * ⚠️ THIS IS FIELD 5 OF THE ENGINE'S CONTRACT, and it is where this game pays the engine back. `targetsOf`
 * returns "where the things that still count are", and the sonar compares distances in the declared
 * topology. In a linear quiz it was correct and useless (the second consumer's finding 9 says so in as many
 * words); here it answers "where is a merge available", which for a child who cannot see the screen is the
 * whole mechanic.
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

/** Is there still a move? One empty square is enough; with none, a neighbouring pair is required. */
export const canMove = (board: Board): boolean =>
  emptySpots(board).length > 0 || mergeSpots(board).length > 0;

/** The largest EXPONENT in play — the objective's `have`, compared against `OBJETIVO`. */
export const maxTile = (board: Board): number => board.reduce((m, e) => (e > m ? e : m), 0);
