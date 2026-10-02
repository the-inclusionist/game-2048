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
//   tile 32 + gap 4 → 4·32 + 5·4 = 148 on a side. That leaves 172 of width, which is the HUD column.
// The board sits on the RIGHT and the HUD on the left on purpose: somebody reading left to right meets what
// the round asks before meeting the board, and it is the same order in which the screen reader narrates.
import { SIZE } from './board.ts';

/** The engine's logical grid (pillar 5). Not this game's choice — it is the constant every game inherits. */
export const LOGICAL_W = 320;
export const LOGICAL_H = 180;

/** Side of one tile, and the gap between them. In logical pixels. */
export const TILE = 32;
export const GAP = 4;

/** Side of the whole board, frame included: `4·32 + 5·4 = 148`. */
export const BOARD = SIZE * TILE + (SIZE + 1) * GAP;

/** Top-left corner of the board. Pushed against the right, with a margin equal to the top one. */
export const BOARD_X = LOGICAL_W - BOARD - 8;
export const BOARD_Y = Math.round((LOGICAL_H - BOARD) / 2);

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
