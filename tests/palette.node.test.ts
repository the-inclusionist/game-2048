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
  FUNDO, FUNDO_DA_TELA, FUNDO_DA_TELA_POR_NIVEL, MOLDURA, MOLDURA_POR_NIVEL, TINTA_CLARA, TINTA_ESCURA,
  contraste, corDoPapel, fundoDe, inkFor, luminancia, type Nivel,
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
    //
    // ⚠️ AND THE EXACT NUMBER IS PINNED SINCE 2026-09-11, which it was not before. The two bounds below said
    // only `0 <= aaa <= 13` — true of every possible palette, including one where the count had silently
    // fallen to zero — while the README stated "seven of thirteen reach AAA" in two places. A number quoted
    // to a reader with nothing holding it is a claim waiting to go stale, and this project's whole argument
    // is that its accessibility numbers are MEASURED rather than asserted.
    //
    // 📌 A CHANGE HERE IS NOT A FAILURE. If a colour moves for a good reason and the count changes, this line
    // and the README change together, in the same commit — which is the point: they can no longer drift apart
    // in silence.
    expect(aaa, 'the count the README quotes — change both together or neither').toBe(7);
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

// ========================= THE CONTRAST AXIS IS THE ENGINE'S, AND THIS IS ITS ARITHMETIC =========================
// 🔴 A DESCRIBE CALLED «high contrast BY ROLE» STOOD HERE, around a single `HC_POR_PAPEL` table, and beside it
// in `tests/visual.node.test.ts` stood the argument that kept this game's own `◐ Alto contraste` button alive
// for a month: three roles pairwise at 7:1 would need 49:1 between the extremes, the WCAG scale stops at 21,
// therefore `hc7` was «not hard but IMPOSSIBLE».
//
// 📏 THE ARITHMETIC WAS RIGHT AND THE QUESTION WAS WRONG. The engine states what its levels mean, in the
// sentences a child reads (`i18n/en.js:570`): «platform vs background ~3:1», «lighter platforms and a darker
// background», «almost black and white». FIGURE against BACKGROUND — one pair — never role against role. And
// role against role is not even a pair that exists on this board: two tiles never touch, because `GAP` of
// FRAME runs between them, which is why the frame is what every role is measured against below.
//
// The four demands are solved simultaneously in `app/js/render/palette.ts`; these assertions are the solver's
// constraints, kept where they can fail.
describe('the three contrast levels the engine offers, measured', () => {
  const EXIGE: Readonly<Record<Nivel, number>> = { hc3: 3, hc45: 4.5, hc7: 7 };
  const NAO_TEXTO = 3;                           // WCAG 1.4.11, for a component against what surrounds it
  const NIVEIS = ['hc3', 'hc45', 'hc7'] as const;
  const PAPEIS = ['goal', 'structure'] as const; // `free` IS the background; it is handled on its own below

  it('[Cross-check] 🔴 `hc7` is REACHABLE — the claim that killed this axis for a month', () => {
    // The single assertion that retires the old argument. If this ever fails, the levels are wrong, not the
    // engine — and the fix is a palette, not a button of our own.
    const r = contraste(corDoPapel('goal', 'hc7'), FUNDO_DA_TELA_POR_NIVEL.hc7);
    expect(r, 'goal against the screen at hc7').toBeGreaterThanOrEqual(7);
    expect(r, 'and it is not even tight — the scale stops at 21').toBeGreaterThan(20);
  });

  it('[Many] 🔴 every figure meets its level against the SCREEN — the engine’s own definition', () => {
    for (const n of NIVEIS) {
      for (const p of PAPEIS) {
        expect(contraste(corDoPapel(p, n), FUNDO_DA_TELA_POR_NIVEL[n]), `${p} at ${n}`)
          .toBeGreaterThanOrEqual(EXIGE[n]);
      }
    }
  });

  it('[Many] the NUMBER inside a tile meets the level too — the levels are named after a text threshold', () => {
    for (const n of NIVEIS) {
      for (const p of PAPEIS) {
        const cor = corDoPapel(p, n);
        expect(contraste(cor, inkFor(cor)), `number on ${p} at ${n}`).toBeGreaterThanOrEqual(EXIGE[n]);
      }
    }
  });

  it('[Many] 🔴 every role separates from the FRAME at 1.4.11 — the pair that actually exists', () => {
    // Two tiles never touch: `GAP` logical pixels of frame run between them. Measuring `goal` against
    // `structure` — which the old argument did — measures a pair the child never sees adjacent.
    for (const n of NIVEIS) {
      for (const p of [...PAPEIS, 'free'] as const) {
        expect(contraste(corDoPapel(p, n), MOLDURA_POR_NIVEL[n]), `${p} against the frame at ${n}`)
          .toBeGreaterThanOrEqual(NAO_TEXTO);
      }
    }
  });

  it('[Zero] 🔴 and the EMPTY square never disappears into the frame', () => {
    // 📏 The defect this is born from: the first palette had `free` equal to the background and the frame
    //    nearly so, which at `hc7` gave exactly 1.00 — the grid gone, the child looking for sixteen squares
    //    that were not drawn. It is the same assertion as the row above for `free`, stated on its own because
    //    it is the one that was actually broken.
    for (const n of NIVEIS) {
      expect(contraste(FUNDO_DA_TELA_POR_NIVEL[n], MOLDURA_POR_NIVEL[n]), `empty square at ${n}`)
        .toBeGreaterThanOrEqual(NAO_TEXTO);
    }
  });

  it('[Many] the levels are a STAIRCASE, not three names for one palette', () => {
    // Each level demands more than the one below, so each must deliver more: a child who moves up and sees
    // nothing change has been given a dead control (ADR-0106 §5).
    const r = NIVEIS.map((n) => contraste(corDoPapel('structure', n), FUNDO_DA_TELA_POR_NIVEL[n]));
    for (let i = 0; i < r.length - 1; i++) {
      expect(r[i + 1], `${NIVEIS[i + 1]} harder than ${NIVEIS[i]}`).toBeGreaterThan(r[i]);
    }
  });

  it('[Right] every role this game draws has a colour at every level', () => {
    for (const n of NIVEIS) {
      for (const p of ['goal', 'structure', 'free']) {
        expect(corDoPapel(p, n), `${p} at ${n}`).toBeTypeOf('number');
      }
    }
  });

  it('[Zero] an unknown role falls back to `free`, never to nothing', () => {
    for (const n of NIVEIS) expect(corDoPapel('nao-existe', n)).toBe(corDoPapel('free', n));
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
