// SPDX-License-Identifier: AGPL-3.0-or-later
// THE RULES OF 2048, WRITTEN FROM SCRATCH — and this file is the reason they CAN be written from scratch.
//
// ========================= WHY REIMPLEMENT, IN ONE SENTENCE =========================
// The RULES of a game are not protected by copyright; an implementation of them is. The Município has to own
// the WHOLE of what it owns (`docs/LICENSES.md`), and the MIT licence of the Threes! descendants would allow
// reuse with attribution — no licence obstacle is being worked around, this is a decision about OWNERSHIP.
// What this file does is turn "the rules" into something verifiable, so that "we wrote it from scratch" is a
// measured property and not a claim.
//
// ========================= THE MODEL: EXPONENTS, NOT VALUES =========================
// The board holds `0` for empty and `n` for 2^n — `1` is the tile 2, `11` is the tile 2048. This is not memory
// thrift: it is what makes "power of two" the MODEL of the game rather than a label stuck on afterwards.
// Merging becomes `n + 1`, the objective becomes `11`, and the activity's wording ("two to the what?") reads
// the same number the mechanic uses. The tests write VALUES, because that is how the child sees them.
//
// ========================= THE RULE THE FORKS GET WRONG =========================
// In one move, each tile merges AT MOST ONCE. `[2,2,2,2]` to the left is `[4,4]`, never `[8]`. It is the
// difference between a game that ends in fifteen moves and 2048. It is marked [Many] and it is the case that
// most justifies this file existing before the code.
import { describe, expect, it } from 'vitest';
import {
  SIZE, canMove, maxTile, mergeSpots, slide, spawn, type Board,
} from '../app/js/board.ts';

/** A board written in VALUES (0, 2, 4, 8…) — as the child sees it — turned into exponents. */
const grade = (...valores: number[]): Board => {
  if (valores.length !== SIZE * SIZE) throw new Error(`grade needs ${SIZE * SIZE} squares`);
  return valores.map((v) => (v === 0 ? 0 : Math.log2(v)));
};
/** Back to values, so that `expect` fails saying `[4,4,0,0]` and not `[2,2,0,0]`. */
const valores = (b: Board): number[] => b.map((e) => (e === 0 ? 0 : 2 ** e));
/** A single row, the rest empty — the most readable way to test horizontal sliding. */
const linha = (...v: number[]): Board => grade(...v, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
/** A single column. `[a,b,c,d]` becomes the first column. */
const coluna = (a: number, b: number, c: number, d: number): Board =>
  grade(a, 0, 0, 0, b, 0, 0, 0, c, 0, 0, 0, d, 0, 0, 0);
const primeiraLinha = (b: Board): number[] => valores(b).slice(0, SIZE);
const primeiraColuna = (b: Board): number[] => [0, 1, 2, 3].map((y) => valores(b)[y * SIZE]);

const VAZIO: Board = grade(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

describe('slide — sliding and merging', () => {
  it('[Zero] an empty board does not move in any direction', () => {
    for (const dir of ['left', 'right', 'up', 'down'] as const) {
      const r = slide(VAZIO, dir);
      expect(r.moved, dir).toBe(false);
      expect(r.gained, dir).toBe(0);
      expect(valores(r.board), dir).toEqual(valores(VAZIO));
    }
  });

  it('[One] a lone tile travels to the wall, and merges with nobody', () => {
    const r = slide(linha(0, 0, 2, 0), 'left');
    expect(primeiraLinha(r.board)).toEqual([2, 0, 0, 0]);
    expect(r.moved).toBe(true);
    expect(r.merges).toEqual([]);
    expect(r.gained).toBe(0);
  });

  it('[Right] two adjacent equals become one of double the value', () => {
    const r = slide(linha(2, 2, 0, 0), 'left');
    expect(primeiraLinha(r.board)).toEqual([4, 0, 0, 0]);
    expect(r.gained).toBe(4);
    expect(r.merges).toEqual([{ at: 0, exponent: 2 }]);
  });

  it('[Many] ⚠️ four equals become TWO merges, never a cascade', () => {
    const r = slide(linha(2, 2, 2, 2), 'left');
    expect(primeiraLinha(r.board), 'each tile merges at most once per move').toEqual([4, 4, 0, 0]);
    expect(r.gained).toBe(8);
    expect(r.merges).toHaveLength(2);
  });

  it('[Exception] the JUST-MERGED tile does not merge again in the same move', () => {
    // 2+2 becomes 4 on square 0; the 4 that was already next to it must NOT join it now.
    const r = slide(linha(2, 2, 4, 0), 'left');
    expect(primeiraLinha(r.board)).toEqual([4, 4, 0, 0]);
    expect(r.gained).toBe(4);
  });

  it('[Boundary] with three equals, the pair nearest the WALL being pushed towards is the one that merges', () => {
    expect(primeiraLinha(slide(linha(2, 2, 2, 0), 'left').board)).toEqual([4, 2, 0, 0]);
    expect(primeiraLinha(slide(linha(0, 2, 2, 2), 'right').board)).toEqual([0, 0, 2, 4]);
  });

  it('[Boundary] a blocker in the way does not stop the pair behind it from merging', () => {
    expect(primeiraLinha(slide(linha(4, 2, 2, 0), 'left').board)).toEqual([4, 4, 0, 0]);
  });

  it('[Simple] a move that changes nothing returns moved:false — and that is what stops the spawn', () => {
    const encostado = linha(4, 2, 0, 0);
    const r = slide(encostado, 'left');
    expect(r.moved, 'without this, every useless key press still fills the board').toBe(false);
    expect(valores(r.board)).toEqual(valores(encostado));
  });

  it('[Interface] the columns obey the same rule as the rows', () => {
    expect(primeiraColuna(slide(coluna(2, 2, 2, 2), 'up').board)).toEqual([4, 4, 0, 0]);
    expect(primeiraColuna(slide(coluna(2, 2, 2, 2), 'down').board)).toEqual([0, 0, 4, 4]);
    expect(primeiraColuna(slide(coluna(0, 0, 0, 8), 'up').board)).toEqual([8, 0, 0, 0]);
  });

  it('[Interface] `gained` is the sum of the values FORMED, which is the round’s score', () => {
    const r = slide(linha(4, 4, 8, 8), 'left');
    expect(primeiraLinha(r.board)).toEqual([8, 16, 0, 0]);
    expect(r.gained).toBe(8 + 16);
  });

  it('[Right] the incoming board is NOT modified — the move returns a new one', () => {
    const antes = linha(2, 2, 0, 0);
    const copia = [...antes];
    slide(antes, 'left');
    expect([...antes]).toEqual(copia);
  });
});

describe('movements — where each tile came from, which is what the animation needs to know', () => {
  it('[Zero] a move that shifts nothing invents no path for the tiles standing still... ', () => {
    // ...but it does NOT forget them either: they stay in the list, with `from === to`. Whoever draws needs
    // ALL the tiles, and a list of "only the ones that moved" would force them to rediscover the rest by
    // comparing boards — which is exactly the guesswork this field exists to eliminate.
    const r = slide(linha(4, 2, 0, 0), 'left');
    expect(r.moved).toBe(false);
    expect(r.movimentos).toEqual([
      { from: 0, to: 0, exponent: 2, merged: false },
      { from: 1, to: 1, exponent: 1, merged: false },
    ]);
  });

  it('[One] a tile that slides keeps its origin and its destination', () => {
    const r = slide(linha(0, 0, 8, 0), 'left');
    expect(r.movimentos).toEqual([{ from: 2, to: 0, exponent: 3, merged: false }]);
  });

  it('[Right] in a merge, BOTH tiles travel to the same square and both die', () => {
    // It is the case a renderer could not guess by comparing two boards: two origins, one destination, and
    // the tile that appears there is neither of the two.
    const r = slide(linha(2, 2, 0, 0), 'left');
    expect(r.movimentos).toEqual([
      { from: 0, to: 0, exponent: 1, merged: true },
      { from: 1, to: 0, exponent: 1, merged: true },
    ]);
    expect(r.merges).toEqual([{ at: 0, exponent: 2 }]);
  });

  it('[Interface] the exponent that travels is the one from BEFORE the merge — that is the number crossing the screen', () => {
    const r = slide(linha(8, 8, 0, 0), 'left');
    expect(r.movimentos.every((m) => m.exponent === 3), '8 = 2^3 travelling, not the 16').toBe(true);
    expect(r.merges[0].exponent, 'the 16 is born at the destination, it does not travel there').toBe(4);
  });

  it('[Many] with four equals there are FOUR paths and two destinations, not a cascade', () => {
    const r = slide(linha(2, 2, 2, 2), 'left');
    expect(r.movimentos.map((m) => `${m.from}->${m.to}`)).toEqual(['0->0', '1->0', '2->1', '3->1']);
    expect(r.movimentos.every((m) => m.merged)).toBe(true);
  });

  it('[Boundary] in the columns the paths are vertical, and the destination is the real index', () => {
    const r = slide(coluna(0, 4, 0, 4), 'up');
    expect(r.movimentos).toEqual([
      { from: 4, to: 0, exponent: 2, merged: true },
      { from: 12, to: 0, exponent: 2, merged: true },
    ]);
  });

  it('[Cross-check] every tile of the INCOMING board appears exactly once in the list', () => {
    // The invariant that stops the animation losing or duplicating a tile on screen.
    const antes = grade(2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2);
    for (const dir of ['left', 'right', 'up', 'down'] as const) {
      const origens = slide(antes, dir).movimentos.map((m) => m.from).sort((a, b) => a - b);
      const ocupadas = antes.map((e, i) => (e ? i : -1)).filter((i) => i >= 0);
      expect(origens, dir).toEqual(ocupadas);
    }
  });

  it('[Right] every destination in the list is occupied on the OUTGOING board', () => {
    const r = slide(linha(2, 2, 4, 8), 'left');
    for (const m of r.movimentos) expect(r.board[m.to], `destination ${m.to}`).not.toBe(0);
  });
});

describe('spawn — the draw, and why it is seeded', () => {
  /** A fake `rnd`: it returns the given sequence, in order. A fake seed is a controlled seed. */
  const rndFixo = (...vs: number[]) => { let i = 0; return () => vs[i++ % vs.length]; };

  it('[One] the new tile lands on an EMPTY square', () => {
    const quaseCheio = grade(2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 0);
    const r = spawn(quaseCheio, rndFixo(0.5, 0.5));
    expect(r).not.toBeNull();
    expect(r!.at, 'there was only one free square').toBe(15);
  });

  it('[Zero] a full board returns null — and null is an answer, not an error', () => {
    const cheio = grade(2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2);
    expect(spawn(cheio, rndFixo(0.5))).toBeNull();
  });

  it('[Right] the same seed gives the same game — what ADR-0049 asks for, and what makes this testable', () => {
    const semente = () => { let s = 20260905; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; };
    const a = spawn(VAZIO, semente());
    const b = spawn(VAZIO, semente());
    expect(a).toEqual(b);
  });

  it('[Boundary] a 4 comes out on the declared slice of the draw, and a 2 on the rest', () => {
    // The first number picks the square; the second picks the value. 0.05 < 0.1 → tile 4; 0.5 → tile 2.
    expect(spawn(VAZIO, rndFixo(0, 0.05))!.exponent, '2^2 = 4').toBe(2);
    expect(spawn(VAZIO, rndFixo(0, 0.5))!.exponent, '2^1 = 2').toBe(1);
  });

  it('[Right] the incoming board is NOT modified', () => {
    const copia = [...VAZIO];
    spawn(VAZIO, rndFixo(0, 0.5));
    expect([...VAZIO]).toEqual(copia);
  });
});

describe('canMove, mergeSpots and maxTile — what the declaration asks for', () => {
  it('[Zero] a full board with NO equal neighbours: there is no move', () => {
    const travado = grade(2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2);
    expect(canMove(travado)).toBe(false);
    expect(mergeSpots(travado)).toEqual([]);
  });

  it('[One] a full board WITH one neighbouring pair: there is still a move, and the sonar knows where', () => {
    const umPar = grade(2, 2, 4, 8, 4, 8, 2, 4, 8, 2, 4, 8, 2, 4, 8, 2);
    expect(canMove(umPar)).toBe(true);
    expect(mergeSpots(umPar), 'both squares of the pair, for the sonar to point at').toEqual([0, 1]);
  });

  it('[Boundary] the pair may be VERTICAL, and a horizontal sieve alone would not see it', () => {
    const parVertical = grade(2, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2);
    expect(mergeSpots(parVertical)).toContain(0);
    expect(mergeSpots(parVertical)).toContain(4);
  });

  it('[Simple] with an empty square there is always a move, even with no pair at all', () => {
    expect(canMove(linha(2, 4, 8, 16))).toBe(true);
  });

  it('[Interface] maxTile returns the EXPONENT, which is what the objective compares against 11', () => {
    expect(maxTile(VAZIO)).toBe(0);
    expect(maxTile(linha(2, 4, 8, 16))).toBe(4);
    expect(maxTile(grade(2048, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)), '2^11').toBe(11);
  });
});
