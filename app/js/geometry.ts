// SPDX-License-Identifier: AGPL-3.0-or-later
// THE GEOMETRY, IN ONE PLACE — because two layers draw the same board and they must not drift apart.
//
// ========================= THE TWO LAYERS, AND WHY THERE ARE TWO =========================
// The board is drawn TWICE, one on top of the other, and that is a decision rather than redundancy:
//
//   · the CANVAS (PixiJS, 320×180) draws the picture — frame, squares, tiles, the slide animation;
//   · the DOM draws the NUMBERS, and it is the one carrying `role="grid"`, focus and `aria-label`.
//
// Pillar 2 of ADR-0010 says "text always in the DOM". A digit painted on the canvas disappears for the screen
// reader and for the Libras avatar player (`ui/libras-avatar-player` since engine 11.0.0, note DO), which
// signs TEXT — so the accessible layer is not a caption of the drawing: it IS the board, and the canvas is
// its illustration. `aria-hidden` on the canvas says so to the machine.
//
// ========================= WHAT KEEPS THE TWO ALIGNED =========================
// This file. Both read from here, in LOGICAL PIXELS of the 320×180 grid, and CSS converts one logical pixel
// into screen pixels by the SAME integer scale the engine's `ui/layout` already computes (ADR-0001): the
// stylesheet defines `--px: calc(var(--ui-fs) / 8)`, and `--ui-fs` is `8 · k`. One logical pixel is `k` CSS
// pixels, always an integer in REAL pixels, so a number never ends up half a pixel outside its square at any
// device pixel ratio.
//
// ========================= THE MEASUREMENTS, AND WHERE THEY COME FROM =========================
// 320×180 is tight for a 4×4 board with numbers of up to four digits. The arithmetic:
//   tile 32 + gap 2 → 4·32 + 5·2 = 138 on a side. That leaves 182 of width, which is the HUD column.
// The board sits on the RIGHT and the HUD on the left on purpose: somebody reading left to right meets what
// the round asks before meeting the board, and it is the same order in which the screen reader narrates.
//
// ========================= THE TOP IS NOT THIS GAME'S (ADR-0148 §3) =========================
// 🔴 THE GAP WAS 4 UNTIL 2026-10-03 and the board was 148 on a side, vertically CENTRED — `BOARD_Y = 16`.
// That put the board's frame and the top of its first row under the engine's accessibility bar, which is the
// one row a child who needs blind mode, narration or Libras has to reach. The engine measures the bar and
// publishes the room it needs as `--barra-a11y-h` on `#game-region`; nothing here read it.
//
// 📏 THE ARITHMETIC THAT FORCED THE GAP DOWN, measured in the browser on 2026-10-03 at k=2:
//   · `--barra-a11y-h` = 75 px = 37.5 logical for Atkinson Hyperlegible, Lexend and Andika, and 77 px = 38.5
//     logical for Playwrite BR, whose higher floor grows the icon-name line from 16 px to 20 px (#172).
//   · A 148 board under a 38.5 band wants 186.5 of the 180 that exist. It does not fit, and no choice of
//     `BOARD_Y` makes it fit — the board itself had to give way.
//   · The gap gave way and the TILE DID NOT, which is the whole point of choosing it: 32 logical pixels keeps
//     the number's type size (`fontFor`) and the square's touch target exactly as they were, and both are
//     WCAG floors. A gap is separation between squares, which the painted frame already provides in a
//     contrasting role colour.
import { SIZE } from './board.ts';

/** The engine's logical grid (pillar 5). Not this game's choice — it is the constant every game inherits. */
export const LOGICAL_W = 320;
export const LOGICAL_H = 180;

/** Side of one tile, and the gap between them. In logical pixels. */
export const TILE = 32;
export const GAP = 2;

/** Side of the whole board, frame included: `4·32 + 5·2 = 138`. */
export const BOARD = SIZE * TILE + (SIZE + 1) * GAP;

/**
 * THE ROOM THE ENGINE KEEPS AT THE TOP OF THE REGION, in logical pixels — the game's copy of
 * `--barra-a11y-h` (ADR-0148 §3): the bar, the line naming the pointed icon, and a light gap.
 *
 * ⚠️ IT IS A CONSTANT AND THE ENGINE'S VALUE IS NOT, and that asymmetry is deliberate rather than lazy. The
 * DOM half of this game reads the variable itself in `app/css/game.css`, so the HUD follows the band exactly
 * and for free. The CANVAS half cannot: it draws in the 320×180 logical grid, and a grid whose origin moved
 * with a CSS custom property would no longer be the integer-scaled grid of ADR-0001 — the DOM numbers would
 * come off the squares painted under them, which is the defect `tests/board-aligned.browser.test.ts` exists
 * to catch.
 *
 * 📏 40 AND NOT 38, which is the margin over the worst case this cycle can produce (38.5 logical, Playwrite
 * BR). 🔴 A browser gate cycles every face the 🔤 icon offers and demands that the engine's own measurement
 * stay inside this number, so an engine release that grows the band fails loudly here instead of quietly
 * covering the first row of the board.
 */
export const TOP_BAND = 40;

/**
 * Top-left corner of the board. Pushed against the right with a margin equal to the HUD's, and down to the
 * floor of the engine's reserved band — `40 + 138 = 178`, which leaves 2 logical pixels under the frame.
 */
export const BOARD_X = LOGICAL_W - BOARD - 8;
export const BOARD_Y = TOP_BAND;

/** The HUD column: everything left over to the left of the board, with the same margin. */
export const HUD_X = 8;
export const HUD_W = BOARD_X - HUD_X - 8;

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** The rectangle of one square, in logical pixels, from the board index. */
export function cellRect(i: number): Rect {
  const x = i % SIZE;
  const y = Math.floor(i / SIZE);
  return {
    x: BOARD_X + GAP + x * (TILE + GAP),
    y: BOARD_Y + GAP + y * (TILE + GAP),
    w: TILE,
    h: TILE,
  };
}

/**
 * The type size that fits a number inside a tile, in logical pixels.
 *
 * ⚠️ IT SHRINKS WITH THE DIGIT COUNT, and that is what makes `2048` fit where `2` has room to spare. A single
 * measurement for every case would have to serve the worst one — five digits — and then the `2` a six-year-old
 * sees would appear tiny at the start of the round, which is exactly when she most needs to read it.
 */
export function fontFor(digits: number): number {
  if (digits <= 2) return 16;
  if (digits === 3) return 13;
  if (digits === 4) return 10;
  return 8;
}
