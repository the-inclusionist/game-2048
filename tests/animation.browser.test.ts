// SPDX-License-Identifier: AGPL-3.0-or-later
// THE ANIMATION ACTUALLY HAPPENING — in a real browser, which is the only place it exists.
//
// ========================= WHY THIS FILE IS NECESSARY =========================
// `tests/animation.node.test.ts` proves the ARITHMETIC: `t` goes in, a position comes out. This one proves
// the other half, which no arithmetic can prove — that the `calc(N * var(--px))` written by the JavaScript
// becomes the right pixel once the browser resolves the variable, and that the tile really CROSSES the board
// instead of jumping.
//
// ⚠️ And it exists because manual verification was not available: this session's browser pane stays HIDDEN,
// and in a hidden document `requestAnimationFrame` does not run — that is how the stale-screen defect turned
// up (see `podeAnimar`). Here the page is alive, so the frame happens.
import { beforeEach, describe, expect, it } from 'vitest';
import { pecasNoInstante, pecasParadas, posicaoDe } from '../app/js/animation.ts';
import { SIZE, slide, type Board } from '../app/js/board.ts';
import { BOARD, BOARD_X, BOARD_Y, cellRect } from '../app/js/geometry.ts';
import { criarCamadaDePecas } from '../app/js/ui/tiles-layer.ts';

/** The `k` that `ui/layout` would publish. Pinned so the arithmetic can be checked. */
const K = 4;
const grade = (...v: number[]): Board => v.map((x) => (x === 0 ? 0 : Math.log2(x)));
const linha = (...v: number[]): Board => grade(...v, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const papelFixo = () => 'free';

let regiao: HTMLElement;
let camada: ReturnType<typeof criarCamadaDePecas>;

beforeEach(() => {
  document.body.replaceChildren();
  regiao = document.createElement('div');
  regiao.style.position = 'relative';
  regiao.style.width = `${320 * K}px`;
  regiao.style.height = `${180 * K}px`;
  // Exactly what `ui/layout` writes, with `--px` derived the way the game's stylesheet derives it. Pinning
  // `--px` directly would step over the very line this test exists to verify.
  regiao.style.setProperty('--ui-fs', `${8 * K}px`);
  regiao.style.setProperty('--px', 'calc(var(--ui-fs) / 8)');
  document.body.appendChild(regiao);

  // ⚠️ THE LAYER IS NOT POSITIONED HERE, and it used to be — this test wrote `left`/`top`/`width`/`height` on
  // its root before measuring. It was therefore doing the work the production code had FORGOTTEN: the real
  // layer covered the whole region and the numbers appeared 164 by 16 logical pixels to the left of the
  // tiles. The test passed green with the screen wrong, and only a screenshot showed it.
  //
  // Now only the `position: absolute` the stylesheet would give goes in — the real sheet is not loaded here —
  // and EVERYTHING else has to come from the module.
  camada = criarCamadaDePecas(document);
  camada.raiz.style.position = 'absolute';
  regiao.appendChild(camada.raiz);
  for (const el of camada.raiz.children) (el as HTMLElement).style.position = 'absolute';
});

/** A tile's box, in logical pixels relative to the region — undoing the `k`. */
function caixaLogica(el: HTMLElement) {
  const r = regiao.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return { x: (b.x - r.x) / K, y: (b.y - r.y) / K };
}

const visiveis = () => [...camada.raiz.querySelectorAll<HTMLElement>('.p2-tile')].filter((e) => !e.hidden);

describe('the drawn tile lands on the pixel the arithmetic asked for', () => {
  it('[Right] the LAYER positions itself over the board — with nobody helping it', () => {
    // The gate for the 2026-09-05 defect: it was the test that positioned it, so it could be wrong in
    // production.
    const r = regiao.getBoundingClientRect();
    const b = camada.raiz.getBoundingClientRect();
    expect(Math.round(b.x - r.x), 'BOARD_X · k').toBe(BOARD_X * K);
    expect(Math.round(b.y - r.y), 'BOARD_Y · k').toBe(BOARD_Y * K);
    expect(Math.round(b.width), 'BOARD · k').toBe(BOARD * K);
  });

  it('[Right] at rest it sits exactly over the square — as the canvas would draw it', () => {
    const pecas = pecasParadas(linha(2, 0, 0, 8));
    camada.desenhar(pecas, false, papelFixo);
    for (const el of visiveis()) {
      // ⚠️ `position: absolute` is applied by the test because the real stylesheet is not loaded; what is
      // being verified is the TRANSFORM the module wrote, resolved by the browser.
      el.style.position = 'absolute';
    }
    const caixas = visiveis().map(caixaLogica);
    expect(caixas[0]).toEqual({ x: cellRect(0).x, y: cellRect(0).y });
    expect(caixas[1]).toEqual({ x: cellRect(3).x, y: cellRect(3).y });
  });

  it('[Many] MID-slide it is between two squares, and never over one', () => {
    const r = slide(linha(0, 0, 0, 2), 'left');
    const casas = Array.from({ length: SIZE * SIZE }, (_, i) => cellRect(i).x);
    const vistos: number[] = [];
    for (const t of [0.2, 0.4, 0.6, 0.8]) {
      camada.desenhar(pecasNoInstante(r.movimentos, t), false, papelFixo);
      for (const el of visiveis()) el.style.position = 'absolute';
      const x = caixaLogica(visiveis()[0]).x;
      vistos.push(x);
      expect(casas, `t=${t} landed on top of a square — that is a jump, not a slide`).not.toContain(x);
    }
    // And it always travels the same way: the tile does not go backwards mid-path.
    for (let i = 1; i < vistos.length; i++) expect(vistos[i]).toBeLessThan(vistos[i - 1]);
  });

  it('[Cross-check] the browser agrees with the pure arithmetic, pixel by pixel', () => {
    // It is the seam between `animation.ts` (arithmetic) and the CSS (resolving the `calc`). If they
    // diverged, the drawn tile and the computed tile would be in different places — and no node test would
    // see it.
    const r = slide(linha(0, 0, 0, 4), 'left');
    for (const t of [0, 0.35, 0.7, 1]) {
      const esperado = posicaoDe(r.movimentos[0], t);
      camada.desenhar([esperado], false, papelFixo);
      for (const el of visiveis()) el.style.position = 'absolute';
      const medido = caixaLogica(visiveis()[0]);
      expect(medido.x, `t=${t}`).toBeCloseTo(esperado.x, 5);
      expect(medido.y, `t=${t}`).toBeCloseTo(esperado.y, 5);
    }
  });

  it('[Zero] tiles left over from the previous frame disappear instead of hanging around', () => {
    camada.desenhar(pecasParadas(linha(2, 4, 8, 16)), false, papelFixo);
    expect(visiveis()).toHaveLength(4);
    camada.desenhar(pecasParadas(linha(2, 0, 0, 0)), false, papelFixo);
    expect(visiveis(), 'three ghost tiles would stay on screen').toHaveLength(1);
  });

  it('[Interface] the number is TEXT in the DOM, and the element leaves the accessibility tree', () => {
    camada.desenhar(pecasParadas(linha(2048, 0, 0, 0)), false, papelFixo);
    expect(visiveis()[0].textContent, 'real text, not a painted glyph').toBe('2048');
    expect(camada.raiz.getAttribute('aria-hidden'), '`board-dom` is what answers for the grid').toBe('true');
  });

  it('[Boundary] the pool REUSES the elements — it does not recreate sixteen nodes per frame', () => {
    camada.desenhar(pecasParadas(linha(2, 4, 0, 0)), false, papelFixo);
    const primeiro = visiveis()[0];
    camada.desenhar(pecasParadas(linha(8, 16, 0, 0)), false, papelFixo);
    expect(visiveis()[0], 'a new node every frame loses state and makes the text flicker').toBe(primeiro);
    expect(visiveis()[0].textContent).toBe('8');
  });
});
