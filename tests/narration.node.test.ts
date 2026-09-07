// SPDX-License-Identifier: AGPL-3.0-or-later
// THE SENTENCE THE BLIND CHILD RECEIVES — tested as a product, because that is what it is.
//
// ========================= WHY THIS FILE EXISTS, AND HOW IT CAME ABOUT =========================
// The sentence was assembled inside the boot's keydown handler, and the only way to check it was to open a
// browser and listen. The attempt to do exactly that, on 2026-09-05, hung for an instructive reason: the
// engine's `srSay` writes on the NEXT FRAME (`requestAnimationFrame` — that is how it forces a screen reader
// to re-announce repeated text), and in a hidden pane there is no next frame. The announcement looked empty
// and was merely waiting for a frame that never came.
//
// The conclusion was not "fix the measurement". It was that the TEXT should not depend on any frame in order
// to be verified — which is the same conclusion the engine's `consumer-quiz` had already reached when it
// extracted `respostaTexto()` with the justification written beside it: *"kept away from the DOM because it is
// what the blind child RECEIVES"*.
import { describe, expect, it } from 'vitest';
import { narrarJogada, narrarSemMovimento, type Jogada } from '../app/js/narration.ts';

/** A `t` that echoes the key and its parameters. It measures WHICH key was asked for and WITH WHAT — not the
 *  translation. */
const t = (k: string, p?: Record<string, string | number>) =>
  p ? `${k}(${Object.entries(p).map(([a, b]) => `${a}=${b}`).join(',')})` : k;

const jogada = (j: Partial<Jogada> = {}): Jogada => ({ merges: [], nascida: null, fim: null, ...j });

describe('the sentence for one move', () => {
  it('[Zero] a move that only pushed, without merging or spawning, invents no sentence', () => {
    expect(narrarJogada(jogada(), t)).toBe('');
  });

  it('[One] a merge is spoken with BOTH ADDENDS and the result', () => {
    const frase = narrarJogada(jogada({ merges: [{ at: 0, exponent: 3 }] }), t);
    // ⚠️ "4 and 4 became 8", not just "8". It is the difference between narrating the game and TEACHING what
    // it is about: whoever cannot see the screen gets the whole sum, which is the curricular content this
    // game carries.
    expect(frase).toContain('move.pair(a=4,b=8)');
    expect(frase).toContain('move.merged');
  });

  it('[Many] several merges go into the SAME sentence, separated — not into four announcements', () => {
    const frase = narrarJogada(jogada({
      merges: [{ at: 0, exponent: 2 }, { at: 1, exponent: 4 }],
    }), t);
    expect(frase).toContain('a=2,b=4');
    expect(frase).toContain('a=8,b=16');
    expect((frase.match(/move\.merged/g) ?? []).length, 'a single frame').toBe(1);
  });

  it('[One] the new tile is spoken with its value, ROW and COLUMN, counting from 1', () => {
    // Index 9 is row 3, column 2. Counting from zero would be correct for the machine and useless for a child.
    const frase = narrarJogada(jogada({ nascida: { board: [], at: 9, exponent: 1 } }), t);
    expect(frase).toBe('move.spawned(value=2,row=3,col=2)');
  });

  it('[Right] the order is: what MERGED, then what APPEARED, then the END', () => {
    // Not taste: whoever is listening needs the result of their own action first, then the change they did not
    // ask for.
    const frase = narrarJogada(jogada({
      merges: [{ at: 0, exponent: 2 }],
      nascida: { board: [], at: 5, exponent: 1 },
      fim: { chave: 'end.stuck', maior: 7 },
    }), t);
    expect(frase.indexOf('move.merged')).toBeLessThan(frase.indexOf('move.spawned'));
    expect(frase.indexOf('move.spawned')).toBeLessThan(frase.indexOf('end.stuck'));
  });

  it('[Interface] the win is spoken without a number — eleven doublings is the whole sentence', () => {
    expect(narrarJogada(jogada({ fim: { chave: 'end.win', maior: 11 } }), t)).toBe('end.win');
  });

  it('[Boundary] the stuck ending says the VALUE and the DOUBLINGS, which are different things', () => {
    const frase = narrarJogada(jogada({ fim: { chave: 'end.stuck', maior: 7 } }), t);
    expect(frase, '2^7 = 128, and that is 7 doublings').toBe('end.stuck(value=128,doubles=7)');
  });
});

describe('the sentence for a move that changed nothing', () => {
  it('[Right] the direction goes through the dictionary too — "left" is a word', () => {
    expect(narrarSemMovimento('left', t)).toBe('move.none(dir=dir.left)');
  });

  it('[Many] all four directions have their own key', () => {
    for (const d of ['left', 'right', 'up', 'down']) {
      expect(narrarSemMovimento(d, t)).toContain(`dir.${d}`);
    }
  });
});
