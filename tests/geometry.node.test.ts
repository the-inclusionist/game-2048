// SPDX-License-Identifier: AGPL-3.0-or-later
// THE 320×180 GRID IS A PILLAR, SO FITTING INSIDE IT IS A GATE — not a "check it in the browser later".
//
// Pillar 5 of ADR-0010 fixes 320×180, and a 4×4 board with numbers of up to five digits is tight in that
// space. These assertions are the arithmetic done once and then watched: if somebody grows the tile or the gap
// "just a little", the board leaves the screen — and leaving the screen is a break that only shows up on the
// school's device, which is where nobody is looking.
//
// They also pin the property everything else depends on: the canvas and the DOM layer read the SAME numbers. A
// test that only looked at the drawing would not see the divergence; one that only looked at the DOM would not
// either.
import { describe, expect, it } from 'vitest';
import { SIZE } from '../app/js/board.ts';
import {
  BOARD, BOARD_X, BOARD_Y, GAP, HUD_W, HUD_X, LOGICAL_H, LOGICAL_W, TILE, TOP_BAND, cellRect, fontFor,
} from '../app/js/geometry.ts';

describe('the board fits inside pillar 5’s grid', () => {
  it('[Interface] the logical grid is exactly 320×180', () => {
    expect([LOGICAL_W, LOGICAL_H]).toEqual([320, 180]);
  });

  it('[Right] the board’s side is the arithmetic of tiles and gaps', () => {
    expect(BOARD).toBe(SIZE * TILE + (SIZE + 1) * GAP);
    expect(BOARD, '4·32 + 5·2').toBe(138);
  });

  it('[Boundary] no square escapes the screen — neither the first nor the last', () => {
    for (let i = 0; i < SIZE * SIZE; i++) {
      const r = cellRect(i);
      expect(r.x, `square ${i} on the left`).toBeGreaterThanOrEqual(0);
      expect(r.y, `square ${i} on the top`).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w, `square ${i} on the right`).toBeLessThanOrEqual(LOGICAL_W);
      expect(r.y + r.h, `square ${i} on the bottom`).toBeLessThanOrEqual(LOGICAL_H);
    }
  });

  it('[Right] the HUD and the board do not overlap, and a margin is left between them', () => {
    expect(HUD_X + HUD_W).toBeLessThan(BOARD_X);
    expect(HUD_W, 'too narrow and the objective will not fit on one line').toBeGreaterThan(120);
  });

  // ========================= THE BOARD IS NOT CENTRED, AND THAT IS THE GATE =========================
  // 🔴 ONE ASSERTION STOOD HERE UNTIL 2026-10-03 — «the board is vertically centred, with equal slack above
  //    and below», `BOARD_Y === LOGICAL_H - BOARD - BOARD_Y`. It was true and it was the defect: centring put
  //    the board's frame and the top of its first row under the engine's accessibility bar, which is the one
  //    row a child who needs blind mode, narration or Libras has to reach (ADR-0148 §3). The slack is
  //    deliberately UNEQUAL now, and all of it is at the top.
  it('[Right] 🔴 the board starts at or below the engine’s reserved band — never inside it', () => {
    expect(BOARD_Y).toBeGreaterThanOrEqual(TOP_BAND);
  });

  it('[Boundary] and the whole board, frame included, still ends on the screen', () => {
    // 📏 40 + 138 = 178 of 180. Two logical pixels of slack under the frame, which is what forced the gap
    //    from 4 down to 2: at a gap of 4 the board is 148 and `40 + 148 = 188` leaves the screen entirely.
    expect(BOARD_Y + BOARD, 'the frame’s bottom edge').toBeLessThanOrEqual(LOGICAL_H);
  });

  it('[Cross-check] ⚠️ the band this game reserves covers the WORST face in the 🔤 cycle', () => {
    // The engine's own measurement, taken in the browser on 2026-10-03 at k=2: `--barra-a11y-h` reads 75 px
    // (37.5 logical) for Atkinson Hyperlegible, Lexend and Andika, and 77 px (38.5 logical) for Playwrite BR,
    // whose higher floor grows the icon-name line from 16 px to 20 px (#172).
    //
    // 📌 THIS IS THE ARITHMETIC, NOT THE MEASUREMENT. A node test cannot resolve a CSS custom property; the
    // browser gate in `tests/a11y-bar.browser.test.ts` cycles every face and reads the engine's real value
    // against this same constant. What this one holds is that the constant has not been edited BELOW the
    // worst case somebody already measured — the cheap half of the pair, run on every commit.
    const PIOR_MEDIDO = 38.5;
    expect(TOP_BAND, 'measured 38.5 logical with Playwrite BR').toBeGreaterThanOrEqual(PIOR_MEDIDO);
  });

  it('[Many] the 16 squares are distinct, and neighbours in a row sit `TILE + GAP` apart', () => {
    const cantos = new Set(Array.from({ length: SIZE * SIZE }, (_, i) => `${cellRect(i).x},${cellRect(i).y}`));
    expect(cantos.size).toBe(SIZE * SIZE);
    expect(cellRect(1).x - cellRect(0).x).toBe(TILE + GAP);
    expect(cellRect(SIZE).y - cellRect(0).y).toBe(TILE + GAP);
    expect(cellRect(1).y, 'same row, same y').toBe(cellRect(0).y);
  });

  it('[Boundary] the number with the most digits still fits inside its tile', () => {
    // Rule of thumb for a proportional face: one digit takes about 0.6 of the size. Five digits is 65536,
    // already more than the round asks for — if it did not fit, the winning tile would appear clipped.
    for (const digitos of [1, 2, 3, 4, 5]) {
      const largura = digitos * fontFor(digitos) * 0.6;
      expect(largura, `${digitos} digits`).toBeLessThanOrEqual(TILE - 2);
    }
  });

  it('[Zero] the size is NOT the same for everyone: a `2` must not appear in a `2048`’s body', () => {
    expect(fontFor(1)).toBeGreaterThan(fontFor(4));
  });
});
