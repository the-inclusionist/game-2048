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
  BOARD, BOARD_X, BOARD_Y, GAP, HUD_W, HUD_X, LOGICAL_H, LOGICAL_W, TILE, cellRect, fontFor,
} from '../app/js/geometry.ts';

describe('the board fits inside pillar 5’s grid', () => {
  it('[Interface] the logical grid is exactly 320×180', () => {
    expect([LOGICAL_W, LOGICAL_H]).toEqual([320, 180]);
  });

  it('[Right] the board’s side is the arithmetic of tiles and gaps', () => {
    expect(BOARD).toBe(SIZE * TILE + (SIZE + 1) * GAP);
    expect(BOARD, '4·32 + 5·4').toBe(148);
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

  it('[Interface] the board is vertically centred, with equal slack above and below', () => {
    expect(BOARD_Y).toBe(LOGICAL_H - BOARD - BOARD_Y);
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
