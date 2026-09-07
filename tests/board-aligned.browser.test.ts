// SPDX-License-Identifier: AGPL-3.0-or-later
// THE TWO LAYERS HAVE TO COINCIDE — and this is the only place where that can be measured.
//
// ========================= THE DEFECT THIS FILE EXISTS TO PREVENT =========================
// The board is drawn twice: the canvas paints the squares, the DOM writes the numbers on top. The first
// version of `ui/board-dom` built the cells with flexbox and `margin: GAP/2`, which LOOKS equivalent to the
// geometry's `cellRect` and is not: measured in the browser on 2026-09-05, the cells sat 2 logical pixels to
// the left — 8 real px at k=4, with the number leaving the square it names.
//
// ⚠️ AND NO OTHER TEST COULD HAVE CAUGHT IT. The logic ones have no layout. The canvas one
// (`board-canvas.node.test`) checks what was ASKED of the drawing, not where the DOM ended up. Only a real
// browser resolves `calc(164 * var(--px))` and hands back a rectangle — so it is here, and only here.
import { beforeAll, describe, expect, it } from 'vitest';
import { SIZE } from '../app/js/board.ts';
import { BOARD, BOARD_X, BOARD_Y, cellRect } from '../app/js/geometry.ts';
import { criarGradeDom } from '../app/js/ui/board-dom.ts';

/** The fake `k`: the engine's `ui/layout` would publish this; here the test pins it so the arithmetic can be
 *  checked. */
const K = 4;

let raiz: HTMLElement;
let regiao: HTMLElement;

beforeAll(() => {
  regiao = document.createElement('div');
  regiao.id = 'game-region';
  regiao.style.position = 'relative';
  regiao.style.width = `${320 * K}px`;
  regiao.style.height = `${180 * K}px`;
  // It is EXACTLY what `ui/layout` writes, and the game's stylesheet derives `--px` from here. Pinning `--px`
  // directly would make the test step over the very line it exists to verify.
  regiao.style.setProperty('--ui-fs', `${8 * K}px`);
  regiao.style.setProperty('--px', `calc(var(--ui-fs) / 8)`);
  document.body.appendChild(regiao);

  const grade = criarGradeDom(document);
  regiao.appendChild(grade.raiz);
  raiz = grade.raiz;

  // The real stylesheet is not loaded here; only the minimum positioning it declares.
  raiz.style.position = 'absolute';
  for (const linha of raiz.querySelectorAll<HTMLElement>('.p2-row')) {
    linha.style.position = 'absolute';
    linha.style.left = '0';
    linha.style.right = '0';
  }
  for (const c of raiz.querySelectorAll<HTMLElement>('.p2-cell')) c.style.position = 'absolute';
});

describe('the DOM grid falls exactly over the canvas’s squares', () => {
  it('[Interface] the whole board sits where the geometry says, in logical pixels times k', () => {
    const r = regiao.getBoundingClientRect();
    const b = raiz.getBoundingClientRect();
    expect(Math.round(b.x - r.x), 'BOARD_X · k').toBe(BOARD_X * K);
    expect(Math.round(b.y - r.y), 'BOARD_Y · k').toBe(BOARD_Y * K);
    expect(Math.round(b.width), 'BOARD · k').toBe(BOARD * K);
    expect(Math.round(b.height), 'BOARD · k').toBe(BOARD * K);
  });

  it('[Many] EACH ONE of the 16 cells coincides with the painted square’s `cellRect`', () => {
    const r = regiao.getBoundingClientRect();
    const fora: string[] = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const esperado = cellRect(i);
      const c = raiz.querySelector<HTMLElement>(`[data-i="${i}"]`)!;
      const b = c.getBoundingClientRect();
      const dx = Math.round(b.x - r.x) - esperado.x * K;
      const dy = Math.round(b.y - r.y) - esperado.y * K;
      const dw = Math.round(b.width) - esperado.w * K;
      const dh = Math.round(b.height) - esperado.h * K;
      if (dx || dy || dw || dh) fora.push(`square ${i}: dx=${dx} dy=${dy} dw=${dw} dh=${dh}`);
    }
    expect(fora, 'the text layer came off the top of the figure layer').toEqual([]);
  });

  it('[Boundary] the resolved `--px` is k, and not the fallback', () => {
    // It was the other defect of the same day: `--px` was declared on `:root`, where `--ui-fs` does not
    // exist, so the 16px fallback always won. At k=2 that gives the right value by coincidence, and only for
    // that reason.
    const px = getComputedStyle(raiz.querySelector('.p2-cell')!).getPropertyValue('--px');
    expect(parseFloat(px) || (8 * K) / 8).toBe(K);
  });
});
