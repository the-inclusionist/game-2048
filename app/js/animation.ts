// SPDX-License-Identifier: AGPL-3.0-or-later
// THE SLIDE ANIMATION — the half that is ARITHMETIC, kept apart from the half that is a clock.
//
// ========================= ONE CLOCK, ONE CURVE, TWO PAINTERS =========================
// The board is drawn by two layers: the canvas paints the picture, the DOM writes the numbers. An animation
// turns that into a new risk — if each layer had its own animation (one in `requestAnimationFrame`, the other
// in a CSS transition), they would run on different clocks and the number would come unstuck from its tile
// mid-move. An afternoon was already lost to the two layers measured by different rulers while STANDING
// STILL; in motion it would be worse and harder to see.
//
// So: **one `requestAnimationFrame`, one `t`, one curve** — and both layers receive the SAME coordinates,
// computed here. Staying together stops being discipline and becomes construction.
//
// ========================= PURE, BECAUSE THE CLOCK IS NOT TESTABLE AND THE MATHS IS =========================
// Nothing here knows what `requestAnimationFrame`, `Date` or a canvas is. A `t` between 0 and 1 goes in, a
// position in logical pixels comes out. The loop lives below, with the clock injected.
import type { Movimento } from './board.ts';
import { SIZE, type Board } from './board.ts';
import { cellRect } from './geometry.ts';

/**
 * The duration of a move, in milliseconds.
 *
 * ⚠️ SHORT ON PURPOSE. This is a player-turn game (field 6 of the contract: `tick: 'player'`), and a child who
 * plays well chains moves quickly. A long animation in a turn-based game becomes waiting, and waiting becomes
 * the child pressing the key again thinking it did not work. 110 ms is enough for the eye to follow the tile
 * and short enough to stay out of the way.
 */
export const DURACAO_MS = 110;

/**
 * ⚠️ AND IT IS ZERO UNDER `prefers-reduced-motion`, with no menu in between.
 *
 * That is WCAG 2.3.3 (Animation from Interactions), and the decision not to require the child to find an
 * option: whoever needs this has already configured it in the operating system, and the game has to obey
 * without being asked.
 *
 * ⚠️ THIS NOTE USED TO SAY THE ENGINE'S FLAGS COULD NOT BE READ, and it was overtaken by measurement on
 * 2026-09-11. It argued that `reducedMotion` holds flags belonging to the PLATFORMER — `parallax`, `decor`,
 * `items`, `particles` — so picking one of them to decide about board tiles would be guessing the shape of
 * the question. That was true while the four looked like four independent scene layers.
 *
 * They are not. `calmMotionPlan(nivel)` returns `{ sceneReduced: nivel >= 1 }` and the engine writes THE SAME
 * VALUE into all four at once, from ONE control: the 🧩 TEA/calm icon, which since 8.0.0 sits in this game's
 * own accessibility bar. So the flags are not four genre-specific questions — they are one answer, written
 * four times, and the answer is "reduce scene motion".
 */
export const duracaoDaJogada = (movimentoReduzido: boolean): number => (movimentoReduzido ? 0 : DURACAO_MS);

/**
 * Has the child asked for less motion, in EITHER of the two places she can ask?
 *
 * 🔴 THE DEFECT THIS CLOSES, measured in the browser on 2026-09-11: clicking 🧩 in this game's accessibility
 * bar wrote `{"parallax":true,"decor":true,"items":true,"particles":true}` into the engine's storage — the
 * child asking, in as many words, for less motion — and the tiles went on sliding, because this game read
 * only `prefers-reduced-motion`. The icon was half a dead control: its audio half worked and its motion half
 * did nothing. ADR-0106 §5 is about exactly that, and the engine's own note calls a menu that offers a path
 * and then refuses it worse than one that never offered.
 *
 * ⚠️ IT IS AN `OR`, AND THE ASYMMETRY IS DELIBERATE. Either source asking is enough; neither can switch the
 * other off. A child who set the system preference and then happens to have `false` flags stored from some
 * earlier session must not have her operating system overruled by this game — and WCAG 2.3.3 has only one
 * safe direction to err in.
 *
 * 📌 READ PER MOVE, NEVER CACHED. `ui/motion-scene` warns that its flags object is shared BY REFERENCE and
 * that holding a copy makes the switch stop working in silence. Asking fresh each move is the other side of
 * that warning: the child flips the icon mid-game and the very next move obeys.
 */
export const querMenosMovimento = (
  sistema: boolean,
  cena: Readonly<Record<string, boolean>> | null | undefined,
): boolean => sistema || Object.values(cena ?? {}).some(Boolean);

/**
 * Is it worth animating RIGHT NOW?
 *
 * ⚠️ NOTHING IS ANIMATED IN A HIDDEN TAB, and this is a MEASURED defect rather than a precaution. In a hidden
 * document the browser STOPS `requestAnimationFrame` — it does not delay it, it stops it. The loop waiting for
 * the next frame is never called, the promise never resolves, and the final frame — the one that draws the NEW
 * board — never arrives.
 *
 * Observed on 2026-09-05 with the browser pane hidden: the model already at `4:4 12:4` and the screen still
 * showing the two previous tiles, with the counter reading "1 of 11" instead of "2 of 11". For the child that
 * is switching tabs (or the tablet blanking its screen) mid-move and coming back to a board that lies — until
 * she plays again.
 *
 * The right answer is not to animate faster: it is NOT TO ANIMATE. Nobody is watching, and what matters is
 * that the drawn state catches up with the real one immediately.
 */
export const podeAnimar = (duracao: number, documentoVisivel: boolean): boolean =>
  duracao > 0 && documentoVisivel;

/**
 * How long to wait before giving up on the clock and going straight to the final frame.
 *
 * `podeAnimar` covers the NAMED case (a hidden tab). This covers the rest: a browser throttling frames for
 * battery, a device stuttering, a minimised window that does not count as `hidden`. Three times the duration
 * is ample slack for an honest animation and short enough that nobody sees the board sitting still.
 *
 * ⚠️ And the rescue is the FINAL FRAME, never an intermediate state: arriving late at the right place is
 * acceptable, stopping halfway is not.
 */
export const socorroMs = (duracao: number): number => duracao * 3 + 50;

/**
 * The curve. A quadratic `easeOut`: leaves fast and brakes at the end.
 *
 * The choice is not decorative. For a tile sliding into a wall, braking on arrival is what makes the eye
 * understand that it TOUCHED rather than being teleported — and it is the opposite of an `easeIn`, which
 * would make the tile look like it was falling.
 */
export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

/** Where a tile is, in logical pixels, at instant `t` (0 = departure, 1 = arrival). */
export interface Peca {
  readonly x: number;
  readonly y: number;
  readonly exponent: number;
  /**
   * THE SQUARE IT BELONGS TO — the destination for a tile in flight; its own square for one at rest.
   *
   * ⚠️ It travels along because whoever draws has to ask the declaration for that square's ROLE (field 2 of
   * the contract), and deriving the index back from `x`/`y` would mean undoing the geometry's arithmetic with
   * division and rounding — a second implementation of the same thing, in the easiest place to get it wrong.
   */
  readonly at: number;
}

/** Clamps `t` to [0,1]. A `t` outside the range comes from a clock that jumped, and extrapolating throws the
 *  tile off the board. */
const travar = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

/** The position of ONE tile at instant `t`. */
export function posicaoDe(mov: Movimento, t: number): Peca {
  const a = cellRect(mov.from);
  const b = cellRect(mov.to);
  const p = easeOut(travar(t));
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, exponent: mov.exponent, at: mov.to };
}

/**
 * ALL the tiles in motion, at instant `t`.
 *
 * The two halves of a merge remain TWO tiles until `t = 1`, one on top of the other on arrival. It is what a
 * well-made 2048 shows: the two meet and only then become one — and it is why `slide` returns both paths
 * instead of one.
 */
export const pecasNoInstante = (movimentos: readonly Movimento[], t: number): Peca[] =>
  movimentos.map((m) => posicaoDe(m, t));

/* ===================== THE LOOP =====================
 *
 * ⚠️ IT USED TO LIVE INSIDE `bootar()`, and it moved here for a measured reason: in there it was UNTESTABLE.
 * The browser's frame clock does not run in a hidden pane, and trying to observe it live returned zero frames
 * three times in a row — not because the loop was wrong, but because the environment would not let it run.
 * Depending on the eye to know whether cancellation and the rescue work is what this project calls a gate
 * that could never go red.
 *
 * The way out is the one the engine's `core/rng` already uses for randomness: **the clock ENTERS as a
 * parameter**. With it injected, a node test advances time by hand and checks what only happens at the edges
 * — the move that cancels the previous one, the rescue that saves the final frame, the `t` that never exceeds 1.
 */

/** The clock, injected. In a browser these are the native functions; in a test, a fake one. */
export interface Relogio {
  readonly agora: () => number;
  readonly proximoQuadro: (fn: (agora: number) => void) => void;
  readonly depoisDe: (fn: () => void, ms: number) => number;
  readonly cancelarEspera: (id: number) => void;
}

export interface Animador {
  /** Runs one move. Resolves when the motion ends — by arrival, by cancellation or by rescue. */
  correr(movimentos: readonly Movimento[], duracao: number, documentoVisivel: boolean): Promise<void>;
}

/**
 * The loop, with the clock and the painter injected.
 *
 * `aoQuadro` receives the tiles for each instant and draws BOTH layers with them — which is what guarantees
 * canvas and DOM move together by construction rather than by discipline.
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

        // THE RESCUE: if the frame clock stops, the promise resolves anyway and the caller draws the final
        // frame. Arriving late at the right place is acceptable; stopping halfway is not.
        espera = relogio.depoisDe(terminar, socorroMs(duracao));

        const passo = (agora: number): void => {
          // ⚠️ A NEW MOVE CANCELS THE PREVIOUS ONE instead of queueing. A child holding the arrow key produces
          // moves faster than the animation lasts, and queueing would leave the board OWING animations — the
          // state on screen lagging the real one, which is the worst way a turn-based game can lie.
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

/** The real clock. One line, and the only part of this a test cannot exercise. */
export const relogioDoNavegador = (win: Window): Relogio => ({
  agora: () => win.performance.now(),
  proximoQuadro: (fn) => { win.requestAnimationFrame(fn); },
  depoisDe: (fn, ms) => win.setTimeout(fn, ms),
  cancelarEspera: (id) => win.clearTimeout(id),
});

/** The tiles of a board AT REST — the final frame, and what is drawn when there is no animation. */
export function pecasParadas(board: Board): Peca[] {
  const out: Peca[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (board[i] === 0) continue;
    const r = cellRect(i);
    out.push({ x: r.x, y: r.y, exponent: board[i], at: i });
  }
  return out;
}
