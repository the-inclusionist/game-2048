// SPDX-License-Identifier: AGPL-3.0-or-later
// THE SEVEN FIELDS, ANSWERED BY A GRID — and this is what this game gives the engine in return for what it gets.
//
// ========================= WHY THIS FILE MATTERS BEYOND THIS GAME =========================
// ADR-0030 chose the seven fields of `core/contract` as the engine's axis and said, inside the decision
// itself, that "the contract is enough" stops being a hypothesis ONLY WHEN TWO PRESETS EXIST. There was one:
// the `consumer-quiz`, with the `hotspots` topology — an ordered list, the poorest case there is, with no
// space at all. This is the second, and it is `grid`: the project's first.
//
// The difference is not a count. `hotspots` has nowhere to point, and finding 9 of the quiz records that the
// sonar there was "correct and useless". A grid has distance, neighbourhood and direction — so fields 1, 4 and
// 5 start being exercised for real, and the question "is the shape of the question right?" can finally be
// answered by something other than a reading.
//
// ========================= THE OBJECTIVE IS IN DOUBLINGS, AND THAT IS A DECISION =========================
// The engine's HUD frame is `'{have} de {need} {nome}'`. With values it would say "16 of 2048", which is true
// and teaches nothing. With EXPONENTS it says **"4 of 11 doublings"** — and 11 is exactly what 2048 is: eleven
// doublings. The game's counter starts stating the subject matter instead of merely keeping score, and it cost
// no new field in the engine: it is the same `have`/`need` that used to count coins.
import {
  conformanceProblems, distance, speakableProblems, type Heading,
} from '@the-inclusionist/engine/core/contract.js';
import { describe, expect, it } from 'vitest';
import { OBJETIVO, SIZE, type Board } from '../app/js/board.ts';
import { criarDeclaracao, type Observado } from '../app/js/declaration.ts';

const grade = (...valores: number[]): Board => valores.map((v) => (v === 0 ? 0 : Math.log2(v)));
/**
 * A fake `t` that MARKS whatever went through it.
 *
 * ⚠️ It used to return the raw key, and a mutation went through that hole GREEN: with `t = (k) => k`, `t('8')`
 * gives `'8'`, indistinguishable from never calling `t` at all. The test could not separate "the numeral does
 * NOT go through the dictionary" — a decision recorded in `declaration.ts`, and an expensive one: sending
 * numerals to `t()` would create 2048 keys to translate a digit — from "it goes through, and the translation
 * happens to be identical". With the mark, going through the dictionary leaves a trace, and the decision
 * becomes a gate instead of a comment.
 */
const chave = (k: string) => `t:${k}`;

/** A game at rest, observed by the declaration. Only what the seven fields ask for. */
function observar(board: Board, cursor = { x: 0, y: 0 }, heading: Heading = 'none') {
  const o: Observado = { board: () => board, cursor: () => cursor, heading: () => heading, t: chave };
  return criarDeclaracao(o);
}

const VAZIO = grade(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
/** A pair of 2s at the top left; the rest with no equal neighbour anywhere. */
const COM_PAR = grade(2, 2, 4, 8, 4, 8, 2, 4, 8, 2, 4, 8, 2, 4, 8, 2);
/** A chequerboard of 2s and 4s: full, and without a single merge available. */
const TRAVADO = grade(2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2);

describe('the declaration is well formed in the engine’s own eyes', () => {
  it('[Interface] `conformanceProblems` finds nothing — on an empty, a full and a stuck board', () => {
    for (const b of [VAZIO, COM_PAR, TRAVADO]) {
      expect(conformanceProblems(observar(b))).toEqual([]);
    }
  });

  it('[Right] the topology is a 4×4 GRID, orthogonal and in compass frame', () => {
    expect(observar(VAZIO).topology()).toEqual({
      kind: 'grid', size: [SIZE, SIZE], move: 'orthogonal', frame: 'compass',
    });
  });

  it('[Right] the WORLD is declared, and it is not `none`', () => {
    // `none` exists for an activity with no space — painting, a form — and the contract warns that it must not
    // be what happens when somebody forgets. A board has space, and declaring `none` would switch off the
    // sonar and the empathy in a game where they are the mechanic.
    expect(observar(VAZIO).world()).toEqual({ kind: 'element', selector: '#game-region' });
  });

  it('[Right] the turn belongs to the PLAYER, so WCAG 2.2.1 is satisfied by construction', () => {
    expect(observar(VAZIO).tick, 'with no clock, nothing presses').toBe('player');
  });

  it('[One] ONE position is held at once — a move is a press that finishes before the next is read', () => {
    // Required by the contract since engine 8.0.0 (ADR-0104 §A), and mandatory precisely because silence
    // would answer it: a game that forgets gets its accessibility decided by whoever did not think about it.
    // A child on a tablet that registers one finger at a time can play this game in full.
    expect(observar(VAZIO).holdsAtOnce()).toBe(1);
  });

  it('[Zero] NOTHING is held down — and the answer REMOVES a control rather than hiding one', () => {
    // ⚠️ THIS IS NOT THE SAME QUESTION AS THE ONE ABOVE, which is the finding that forced a second field
    // (ADR-0115): `holdsAtOnce` counts simultaneous positions and refuses zero, so "one at a time" and "one
    // HELD" come out as the same number while meaning different things.
    //
    // The latch (☝️) exists for a child who cannot keep a key pressed: one press to start, one to stop. Here
    // there is nothing to latch, so the engine leaves the icon out of the accessibility bar entirely instead
    // of offering her a switch that does nothing — the dead button ADR-0106 §5 forbids, and the worse of the
    // two failures: she turns on the adjustment she depends on and learns it is broken.
    expect(observar(VAZIO).holdsKeys()).toBe(false);
  });

  it('[Interface] both new answers are FUNCTIONS, not values, because a value goes stale in silence', () => {
    // ADR-0084's defect: a memorised field cannot follow a game whose phases differ. This game's answers never
    // change, which is exactly when the shape looks like ceremony and is not — the type is the contract's.
    const d = observar(VAZIO);
    expect(typeof d.holdsAtOnce).toBe('function');
    expect(typeof d.holdsKeys).toBe('function');
  });
});

describe('field 2 — the ROLE of each square, which is where high contrast comes from', () => {
  it('[Zero] an empty square is `free`: crossable and with no meaning of its own', () => {
    expect(observar(VAZIO).roleAt({ x: 2, y: 1 })).toBe('free');
  });

  it('[Right] a tile that CAN merge is `goal` — it is what the round asks for', () => {
    const d = observar(COM_PAR);
    expect(d.roleAt({ x: 0, y: 0 })).toBe('goal');
    expect(d.roleAt({ x: 1, y: 0 })).toBe('goal');
  });

  it('[Boundary] a tile that CANNOT merge is `structure`: it is there, and it is in the way', () => {
    expect(observar(COM_PAR).roleAt({ x: 3, y: 0 }), 'the 8 with no pair').toBe('structure');
    expect(observar(TRAVADO).roleAt({ x: 1, y: 1 }), 'on a stuck board, none is goal').toBe('structure');
  });

  it('[Exception] outside the grid is `free`, and not an exception — the engine sweeps the edges', () => {
    const d = observar(COM_PAR);
    expect(d.roleAt({ x: -1, y: 0 })).toBe('free');
    expect(d.roleAt({ x: SIZE, y: SIZE })).toBe('free');
  });
});

describe('field 3 — the SPEAKABLE name, which is the same data Libras translates', () => {
  it('[One] a tile is named by its NUMBER, which does not depend on a language', () => {
    const n = observar(COM_PAR).nameAt({ x: 3, y: 0 });
    expect(n?.text).toBe('8');
    expect(speakableProblems(n)).toEqual([]);
  });

  it('[Zero] an empty square is named by a KEY — because "empty" is a word, and a word translates', () => {
    expect(observar(VAZIO).nameAt({ x: 0, y: 0 })?.text).toBe('t:cell.empty');
  });

  it('[Boundary] outside the grid there is no name: `null`, which is what the contract asks for', () => {
    expect(observar(VAZIO).nameAt({ x: SIZE, y: 0 })).toBeNull();
  });
});

describe('field 5 — objective and target, the two halves', () => {
  it('[Interface] the objective counts DOUBLINGS: `{have} de {need}` becomes "0 of 11"', () => {
    const o = observar(VAZIO).objectiveOf(0);
    expect(o.have).toBe(0);
    expect(o.need).toBe(OBJETIVO);
    expect(o.need, '2^11 = 2048').toBe(11);
    expect(o.name.text).toBe('t:hud.nome.dobras');
    expect(speakableProblems(o.name)).toEqual([]);
  });

  it('[Right] `have` is the EXPONENT of the largest tile, not its value', () => {
    const b = grade(64, 2, 4, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    expect(observar(b).objectiveOf(0).have, '64 = 2^6, so six doublings').toBe(6);
  });

  it('[Right] `targetsOf` points at the squares of an available merge, in grid coordinates', () => {
    expect(observar(COM_PAR).targetsOf(0)).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
  });

  it('[Zero] with no merge available, `targetsOf` is EMPTY — and empty is an answer, not an error', () => {
    expect(observar(TRAVADO).targetsOf(0)).toEqual([]);
  });
});

describe('field 4 — the focus, and what the sonar does with it', () => {
  it('[One] the focus is the keyboard cursor, carrying the last direction played', () => {
    const f = observar(COM_PAR, { x: 2, y: 3 }, 'e').focusOf(0);
    expect(f).toEqual({ id: 'p0', at: { x: 2, y: 3 }, heading: 'e' });
  });

  it('[Cross-check] the distance measures in CELLS, and the diagonal costs TWO steps', () => {
    // ⚠️ This assertion used to say "one step" and was wrong about this game. The published engine took the
    // metric from `move`, and by declaring `orthogonal` — which is how a 2048 tile travels — the diagonal
    // comes to cost two. This is not the engine changing its mind: it is the contract forcing the game to say
    // how one moves inside it, and the right answer making the sonar stop calling "very close" a square the
    // tile cannot reach.
    const t = observar(VAZIO).topology();
    expect(distance(t, { x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
    expect(distance(t, { x: 0, y: 0 }, { x: 1, y: 1 }), 'with no diagonal, it is L¹').toBe(2);
  });

  it('[Interface] the sonar gets what it needs with no tile at all: topology, target and name', () => {
    // This is finding 9 of the quiz turned inside out. There, switching the sonar on would have required
    // inventing fake tiles; here the three questions have true answers.
    //
    // ⚠️ The cursor is `(3,0)` and not just any corner, and the reason is the METRIC: under the king steps
    // this file was first written against, from `(3,3)` both squares of the pair sit at the SAME distance (3),
    // and the test would have been measuring the stability of `sort` rather than the sonar. From `(3,0)` the
    // difference is real — 3 against 2 — so there genuinely is a "nearest one".
    const de = { x: 3, y: 0 };
    const d = observar(COM_PAR, de);
    const perto = d.targetsOf(0)
      .map((a) => ({ a, dist: distance(d.topology(), de, a) }))
      .sort((p, q) => p.dist - q.dist)[0];
    expect(perto.dist).toBe(2);
    expect(perto.a).toEqual({ x: 1, y: 0 });
    expect(d.nameAt(perto.a)?.text).toBe('2');
  });
});
