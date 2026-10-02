// SPDX-License-Identifier: AGPL-3.0-or-later
// THE BOARD AS DRAWN, TESTED WITHOUT A BROWSER — and it is ADR-0035's port that makes that possible.
//
// `pintarTabuleiro` receives a `Drawing` (the engine's renderer port) instead of importing PixiJS. What goes
// in here is a FAKE drawing that merely notes what was asked of it, and the assertions become assertions
// about the ORDER and the GEOMETRY of the painting — which is everything one can claim without looking at
// real pixels.
//
// ========================= THE PAINTING HAS THREE LAYERS, AND THE ORDER IS THE CLAIM =========================
//   1. the screen background;
//   2. the frame and the SIXTEEN EMPTY SQUARES — the board's holes, which always exist and depend on no tile
//      at all. They are what keeps the board a board while the tiles are in flight;
//   3. the TILES, on top, at the positions `animation.ts` computed — which may be BETWEEN two squares.
//
// The separation between 2 and 3 is what let the animation exist. While the painting read the board and drew
// by index, the most it could do was teleport tiles from one frame to the next.
//
// What this file does NOT prove, said so nobody trusts it too far: that the thing looks good on screen. That
// is the browser test and the screenshot. What it proves is that the drawing happens inside the grid, that
// high contrast swaps the colour by ROLE and not by value, and that no number is painted.
import type { Drawing } from '@the-inclusionist/engine/render/port.js';
import { describe, expect, it } from 'vitest';
import { SIZE, slide, type Board } from '../app/js/board.ts';
import { pecasNoInstante, pecasParadas } from '../app/js/animation.ts';
import { BOARD, BOARD_X, BOARD_Y, LOGICAL_H, LOGICAL_W, TILE, cellRect } from '../app/js/geometry.ts';
import { pintarTabuleiro } from '../app/js/render/board-canvas.ts';
import { FUNDO_DA_TELA, HC_POR_PAPEL, MOLDURA, fundoDe } from '../app/js/render/palette.ts';

interface Retangulo { cor: number; x: number; y: number; w: number; h: number }

/** A `Drawing` that does not draw: it takes notes. The port's minimum, and not one method more. */
function desenhoDeMentira() {
  const rects: Retangulo[] = [];
  let limpezas = 0;
  let cor = 0;
  const g: Drawing = {
    clear() { limpezas++; rects.length = 0; return this; },
    beginFill(c: number) { cor = c; return this; },
    drawRect(x: number, y: number, w: number, h: number) { rects.push({ cor, x, y, w, h }); return this; },
    endFill() { return this; },
  };
  return { g, rects, limpezas: () => limpezas };
}

const grade = (...v: number[]): Board => v.map((x) => (x === 0 ? 0 : Math.log2(x)));
const linha = (...v: number[]): Board => grade(...v, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const VAZIO = grade(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const COM_PAR = grade(2, 2, 4, 8, 4, 8, 2, 4, 8, 2, 4, 8, 2, 4, 8, 2);
const papelFixo = () => 'free' as const;

/** Where the empty squares start, and where the tiles start. */
const CASAS = 2;
const PECAS = CASAS + SIZE * SIZE;

describe('pintarTabuleiro — the figure, and only the figure', () => {
  it('[Right] it clears before drawing, or the previous frame stays underneath for ever', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas: [] });
    expect(d.limpezas()).toBe(1);
  });

  it('[Zero] a board with no tiles: background, frame and the 16 empty squares — nothing else', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas: [] });
    expect(d.rects).toHaveLength(PECAS);
    expect(d.rects[0]).toEqual({ cor: FUNDO_DA_TELA, x: 0, y: 0, w: LOGICAL_W, h: LOGICAL_H });
    expect(d.rects[1]).toEqual({ cor: MOLDURA, x: BOARD_X, y: BOARD_Y, w: BOARD, h: BOARD });
  });

  it('[Right] the EMPTY squares always exist, in the hole’s colour, and in no tile’s colour', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas: pecasParadas(COM_PAR) });
    for (let i = 0; i < SIZE * SIZE; i++) {
      const casa = d.rects[CASAS + i];
      expect({ x: casa.x, y: casa.y, w: casa.w, h: casa.h }, `square ${i}`).toEqual(cellRect(i));
      expect(casa.cor, `square ${i} is a hole, even with a tile on top`).toBe(fundoDe(0));
    }
  });

  it('[Many] each tile becomes ONE rectangle, over the squares, in the colour of its value', () => {
    const d = desenhoDeMentira();
    const pecas = pecasParadas(COM_PAR);
    pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas });
    expect(d.rects).toHaveLength(PECAS + pecas.length);
    pecas.forEach((p, k) => {
      expect(d.rects[PECAS + k]).toEqual({ cor: fundoDe(p.exponent), x: p.x, y: p.y, w: TILE, h: TILE });
    });
  });

  it('[Interface] MID-slide the tile is painted BETWEEN two squares — which is the point of the animation', () => {
    const r = slide(linha(0, 0, 0, 2), 'left');
    const meio = pecasNoInstante(r.movimentos, 0.5);
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas: meio });
    const pintada = d.rects[PECAS];
    expect(pintada.x).toBeGreaterThan(cellRect(0).x);
    expect(pintada.x).toBeLessThan(cellRect(3).x);
    // And it coincides with no square: if it did, the "animation" would be a jump between valid positions.
    const casas = Array.from({ length: SIZE * SIZE }, (_, i) => cellRect(i).x);
    expect(casas).not.toContain(pintada.x);
  });

  it('[Boundary] nothing is painted outside the 320×180 grid, neither at rest nor in flight', () => {
    const r = slide(COM_PAR, 'left');
    for (const pecas of [pecasParadas(COM_PAR), pecasNoInstante(r.movimentos, 0.5)]) {
      const d = desenhoDeMentira();
      pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas });
      for (const rect of d.rects) {
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.w).toBeLessThanOrEqual(LOGICAL_W);
        expect(rect.y + rect.h).toBeLessThanOrEqual(LOGICAL_H);
      }
    }
  });

  it('[Right] in HIGH CONTRAST the colour comes from the ROLE, and the value stops being in charge', () => {
    const d = desenhoDeMentira();
    const papel = (i: number) => (i === 0 || i === 1 ? 'goal' as const : 'structure' as const);
    const pecas = pecasParadas(COM_PAR);
    pintarTabuleiro(d.g, { papel, altoContraste: true, pecas });
    expect(d.rects[CASAS + 0].cor, 'SQUARE 0 follows the role too').toBe(HC_POR_PAPEL.goal);
    expect(d.rects[CASAS + 2].cor).toBe(HC_POR_PAPEL.structure);
    // ⚠️ The proof that the VALUE stopped being in charge: tile 0 is worth 2 and tile 3 is worth 8, and both
    // come out in the colour of THEIR ROLE. Without this line, a high contrast that kept looking at the value
    // would go unnoticed.
    expect(d.rects[PECAS + 0].cor, 'tile worth 2, role goal').toBe(HC_POR_PAPEL.goal);
    expect(d.rects[PECAS + 3].cor, 'tile worth 8, role structure').toBe(HC_POR_PAPEL.structure);
  });

  it('[Zero] an unknown role falls back to `free` instead of vanishing — painting nothing is worse than painting the background', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, { papel: () => 'nonexistent' as never, altoContraste: true, pecas: [] });
    expect(d.rects[CASAS].cor).toBe(HC_POR_PAPEL.free);
  });

  it('[Exception] an empty board paints no tile, and it is not a special case in the code', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas: pecasParadas(VAZIO) });
    expect(d.rects).toHaveLength(PECAS);
  });
});
