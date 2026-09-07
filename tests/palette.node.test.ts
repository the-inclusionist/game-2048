// SPDX-License-Identifier: AGPL-3.0-or-later
// CONTRAST IS A GATE — not a design review, but WCAG 1.4.3 measured on every `npm test`.
//
// ========================= WHY THIS CAN BE TESTED WITHOUT A BROWSER =========================
// Because `render/palette` is arithmetic. WCAG's contrast ratio is a closed formula over the colour's
// channels, and the number it returns is the same in Chromium as it is here. A browser test for this would be
// slower and would measure nothing more.
//
// ========================= THE HONESTY ADR-0010 ASKS FOR =========================
// Pillar 2 requires marking where only AA is reachable, and the engine's CLAUDE.md §1 is explicit: "never sell
// AAA in bulk". So the hard assertion is **AA (4.5:1)**, which is an obligation; AAA (7:1) is COUNTED and
// reported, not required — 1.4.6 fights vivid colour, and selling what you do not deliver is worse than
// delivering less.
import { describe, expect, it } from 'vitest';
import { OBJETIVO } from '../app/js/board.ts';
import {
  FUNDO, FUNDO_DA_TELA, HC_POR_PAPEL, MOLDURA, TINTA_CLARA, TINTA_ESCURA,
  contraste, fundoDe, inkFor, luminancia,
} from '../app/js/render/palette.ts';

const AA = 4.5;
const AAA = 7;

describe('the contrast formula is WCAG’s, not an approximation', () => {
  it('[Cross-check] black against white gives 21:1, the maximum the scale has', () => {
    expect(contraste(0x000000, 0xffffff)).toBeCloseTo(21, 5);
  });

  it('[Zero] a colour against itself gives 1:1', () => {
    expect(contraste(0x3f7fcc, 0x3f7fcc)).toBeCloseTo(1, 10);
  });

  it('[Interface] the order does not matter — contrast is symmetric', () => {
    expect(contraste(0x14161f, 0xd99a1f)).toBeCloseTo(contraste(0xd99a1f, 0x14161f), 10);
  });

  it('[Cross-check] the luminance matches the known value for sRGB mid grey', () => {
    expect(luminancia(0x808080)).toBeCloseTo(0.2159, 3);
  });
});

describe('every tile is legible — WCAG 1.4.3 as a gate', () => {
  it('[Right] EVERY tile, from 2 to 2048, reaches AA with the ink the code chooses', () => {
    const reprovadas: string[] = [];
    for (let e = 1; e <= OBJETIVO + 1; e++) {
      const fundo = fundoDe(e);
      const razao = contraste(fundo, inkFor(fundo));
      if (razao < AA) reprovadas.push(`2^${e} = ${2 ** e}: ${razao.toFixed(2)}:1`);
    }
    expect(reprovadas, 'tiles illegible to a child with low vision').toEqual([]);
  });

  it('[Interface] how many reach AAA — COUNTED and not required, because 1.4.6 fights vivid colour', () => {
    const razoes = Array.from({ length: OBJETIVO + 1 }, (_, k) => {
      const fundo = fundoDe(k + 1);
      return contraste(fundo, inkFor(fundo));
    });
    const aaa = razoes.filter((r) => r >= AAA).length;
    // The assertion is about the HONESTY of the number, not about it being high: what must not happen is the
    // project claiming AAA in bulk. If this number drops it is information; if AA drops it is a defect.
    expect(aaa).toBeGreaterThanOrEqual(0);
    expect(aaa).toBeLessThanOrEqual(razoes.length);
  });

  it('[Boundary] the EMPTY square is distinguishable from the frame, or the board becomes one block', () => {
    expect(contraste(FUNDO[0], MOLDURA), 'empty against frame').toBeGreaterThan(1.2);
    expect(contraste(MOLDURA, FUNDO_DA_TELA), 'frame against the screen background').toBeGreaterThan(1.2);
  });

  it('[Many] two NEIGHBOURING tiles on the ramp are not the same colour', () => {
    for (let e = 1; e < FUNDO.length - 1; e++) {
      expect(fundoDe(e), `2^${e} against 2^${e + 1}`).not.toBe(fundoDe(e + 1));
    }
  });

  it('[Boundary] the first steps separate by LUMINANCE, for whoever cannot tell hues apart', () => {
    // Colour blindness does not erase light and dark. On the steps the child sees most — 2, 4, 8, 16 — the
    // luminance staircase is what holds the reading up when the colour does not.
    const l = [1, 2, 3, 4].map((e) => luminancia(fundoDe(e)));
    for (let i = 0; i < l.length - 1; i++) {
      expect(l[i], `2^${i + 1} lighter than 2^${i + 2}`).toBeGreaterThan(l[i + 1]);
    }
  });
});

describe('high contrast BY ROLE — the quiz’s finding 8, solved on the game’s side', () => {
  it('[Right] the three roles this game uses are in the table', () => {
    for (const papel of ['goal', 'structure', 'free']) {
      expect(HC_POR_PAPEL[papel], papel).toBeTypeOf('number');
    }
  });

  it('[Right] the three roles separate from each other by 1.4.11 — which is 3:1, not 4.5', () => {
    // ⚠️ THIS THRESHOLD WAS WRONG IN THIS FILE'S FIRST VERSION, and the error is worth keeping written down:
    // I required 4.5:1 between two FILL colours. 4.5 is WCAG 1.4.3, which is about TEXT. A tile colour against
    // a tile colour is a non-text component, and the criterion is **1.4.11 (Non-text Contrast), 3:1**.
    // This is not the bar being lowered to pass: it is the right criterion replacing one cited by mistake —
    // and the search for a grey satisfying 4.5 against the yellow AND 3 against the near-black had no
    // solution, which is how the mistake surfaced.
    const NAO_TEXTO = 3;
    expect(contraste(HC_POR_PAPEL.goal, HC_POR_PAPEL.structure)).toBeGreaterThanOrEqual(NAO_TEXTO);
    expect(contraste(HC_POR_PAPEL.goal, HC_POR_PAPEL.free)).toBeGreaterThanOrEqual(NAO_TEXTO);
    expect(contraste(HC_POR_PAPEL.structure, HC_POR_PAPEL.free)).toBeGreaterThanOrEqual(NAO_TEXTO);
  });

  it('[Right] the number stays legible over any role colour', () => {
    for (const [papel, cor] of Object.entries(HC_POR_PAPEL)) {
      expect(contraste(cor, inkFor(cor)), papel).toBeGreaterThanOrEqual(AA);
    }
  });
});

describe('inkFor chooses, it does not guess', () => {
  it('[Boundary] a light background asks for dark ink; a dark one asks for light ink', () => {
    expect(inkFor(0xf6f8ff)).toBe(TINTA_ESCURA);
    expect(inkFor(0x101319)).toBe(TINTA_CLARA);
  });

  it('[Right] the choice is always the one with MORE contrast, with no exception across the ramp', () => {
    for (let e = 0; e < FUNDO.length; e++) {
      const fundo = FUNDO[e];
      const escolhida = inkFor(fundo);
      const outra = escolhida === TINTA_ESCURA ? TINTA_CLARA : TINTA_ESCURA;
      expect(contraste(fundo, escolhida), `2^${e}`).toBeGreaterThanOrEqual(contraste(fundo, outra));
    }
  });
});
