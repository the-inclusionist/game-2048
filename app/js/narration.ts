// SPDX-License-Identifier: AGPL-3.0-or-later
// WHAT THE CHILD HEARS — kept away from the DOM, because it is the product and not a side effect of it.
//
// ========================= WHY THIS LEFT THE BOOT =========================
// The sentence was assembled inside `boot/main.ts`'s keydown handler, and there it could only be checked by
// opening a browser and listening. The engine's `consumer-quiz` had already solved the same problem the right
// way — `respostaTexto()` is a pure, exported function, with the justification written beside it:
// *"kept away from the DOM because it is what the blind child RECEIVES"*. This is that decision, applied here.
//
// The gain is concrete and it was measured: an attempt to check the announcement in the browser hung, because
// the engine's `srSay` writes on the NEXT FRAME (`requestAnimationFrame`, on purpose — that is what forces a
// screen reader to re-announce repeated text), and in a hidden pane there is no next frame. The sentence, here,
// depends on no frame at all.
//
// ========================= ONE SENTENCE, THREE PARTS, IN THIS ORDER =========================
// What merged · what appeared · how the round stands. The order is not taste: whoever is listening needs the
// RESULT of their own action first, then the change they did not ask for, and the state last. Inverted, the
// child hears the score before knowing whether her move worked.
import type { Merge, Spawn } from './board.ts';
import { SIZE } from './board.ts';

/** The translator, injected. A test passes a `t` that marks the key and measures WHICH one was asked for. */
export type Traduz = (chave: string, params?: Record<string, string | number>) => string;

export interface Jogada {
  readonly merges: readonly Merge[];
  readonly nascida: Spawn | null;
  /** `null` while the round continues; the end key once it is over. */
  readonly fim: { readonly chave: 'end.win' | 'end.stuck'; readonly maior: number } | null;
}

/**
 * The sentence for a move that CHANGED something.
 *
 * ⚠️ EACH MERGE IS SPOKEN WITH BOTH ADDENDS AND THE RESULT — "2 and 2 became 4" — and not with the result
 * alone. It is the difference between narrating a game and TEACHING what it is about: the child who cannot
 * see the screen receives the whole sum, which is exactly the curricular content this game carries.
 */
export function narrarJogada(j: Jogada, t: Traduz): string {
  const partes: string[] = [];

  if (j.merges.length) {
    const pares = j.merges
      .map((m) => t('move.pair', { a: 2 ** (m.exponent - 1), b: 2 ** m.exponent }))
      .join('; ');
    partes.push(t('move.merged', { pairs: pares }));
  }

  if (j.nascida) {
    partes.push(t('move.spawned', {
      value: 2 ** j.nascida.exponent,
      row: Math.floor(j.nascida.at / SIZE) + 1,
      col: (j.nascida.at % SIZE) + 1,
    }));
  }

  if (j.fim) {
    partes.push(j.fim.chave === 'end.win'
      ? t('end.win')
      : t('end.stuck', { value: 2 ** j.fim.maior, doubles: j.fim.maior }));
  }

  return partes.join(' ');
}

/** The sentence for a move that changed NOTHING. Short on purpose: it answers an attempt, it is not an event. */
export const narrarSemMovimento = (dir: string, t: Traduz): string =>
  t('move.none', { dir: t(`dir.${dir}`) });
