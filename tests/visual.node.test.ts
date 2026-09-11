// SPDX-License-Identifier: AGPL-3.0-or-later
// THE CONTROL A CHILD USES TO SEE THE BOARD — checked without a screen.
//
// ========================= THE PROPERTY THAT MATTERS MOST HERE =========================
// That the control can never offer a SIMULATION. The engine ships ten of them — protanopia, blur, tunnel,
// blind — and they exist to show an adult what an impairment is like. Handing one to the child who opened
// this menu in order to be able to play would make her vision worse, in the menu she went to for help.
//
// The old `<select>` avoided that by FILTERING: it took `VIZ_DOM_ONLY` and removed whatever
// `simulatesDisability` flagged. A filter is a promise someone has to keep. On the correction axis the
// simulations are a different field of a different type, so they cannot appear at all — and the assertion
// below is what keeps that structural difference from being quietly undone.
import { describe, expect, it } from 'vitest';
import {
  CORRECOES_OFERECIDAS, SIMULACOES_CONHECIDAS, ehCorrecao, estadoDa, filtroCssDe,
} from '../app/js/visual.ts';
import { contraste } from '../app/js/render/palette.ts';

describe('why the CONTRAST axis is not mounted — arithmetic, not preference', () => {
  // Engine 9.0.0 added `setTemaDoJogador`, so the door this game once cited as missing is open. The axis is
  // still not mounted, and the reason changed from "no door" to something a test can hold: the three themes
  // are named after ratios — `hc3` (3:1), `hc45` (4.5:1), `hc7` (7:1) — and this game answers an axis with
  // ROLE colours, of which it has three: goal, structure, free.
  it('[Cross-check] the WCAG scale stops at 21:1, and that is the whole argument', () => {
    expect(contraste(0x000000, 0xffffff)).toBeCloseTo(21, 5);
  });

  it('[Boundary] 🔴 three roles CANNOT be pairwise 7:1 — it would need 49:1 between the extremes', () => {
    // For luminances A > B > C, contrast is multiplicative across the middle:
    //   c(A,C) = (A+0.05)/(C+0.05) = c(A,B) · c(B,C)
    // So demanding 7:1 on both neighbouring pairs demands 49:1 end to end, and the scale has 21.
    // ⚠️ THIS IS NOT "HARD", IT IS IMPOSSIBLE, and the difference matters: no palette anyone designs later
    // can satisfy `hc7` with three roles. Mounting that row would be offering the child a setting that
    // cannot exist — the dead control of ADR-0106 §5, dressed as a colour choice.
    const TETO = contraste(0x000000, 0xffffff);
    expect(7 * 7).toBeGreaterThan(TETO);
  });

  it('[Boundary] and 4.5:1 pairwise survives only as a hairline', () => {
    // 4.5 · 4.5 = 20.25 against a ceiling of 21, so the extremes are forced to very near pure black and pure
    // white, and the middle role is pinned into a luminance band about 0.008 wide. A palette with one usable
    // grey is not a palette; it is a coincidence waiting for someone to adjust a colour.
    const TETO = contraste(0x000000, 0xffffff);
    expect(4.5 * 4.5).toBeLessThan(TETO);
    const alto = (1 + 0.05) / 4.5 - 0.05;   // the middle's highest allowed luminance
    const baixo = 4.5 * 0.05 - 0.05;        // and its lowest
    expect(alto - baixo, 'the whole room a third colour has').toBeLessThan(0.01);
  });

  it('[Right] 3:1 is the level this game already answers, and it is the one it offers', () => {
    // `tests/palette.node.test.ts` asserts the three roles separate by 1.4.11's 3:1 with the real colours.
    // Here the point is only that 3:1 is the level the arithmetic leaves room for.
    const TETO = contraste(0x000000, 0xffffff);
    expect(3 * 3).toBeLessThan(TETO);
  });
});

describe('what the control offers', () => {
  it('[Many] the four values of the axis, and the default is a NAME rather than an absence', () => {
    expect(CORRECOES_OFERECIDAS).toEqual(['tricro', 'protan', 'deuter', 'tritan']);
    expect(CORRECOES_OFERECIDAS[0], 'trichromatic vision is a name, not "no impairment"').toBe('tricro');
  });

  it('[Zero] 🔴 NOT ONE of them is a simulation', () => {
    // ADR-0076's rule, kept as a gate: no default's label diagnoses the reader, and no offered value makes
    // the child's sight worse. `sim-protan` and `blind` live in a different field and must stay there.
    for (const c of CORRECOES_OFERECIDAS) {
      expect(SIMULACOES_CONHECIDAS, c).not.toContain(c);
    }
  });

  it('[Right] choosing a correction never starts a simulation', () => {
    for (const c of CORRECOES_OFERECIDAS) {
      expect(estadoDa(c).simulacao, c).toBeNull();
    }
  });

  it('[Interface] and it never moves the OTHER axis', () => {
    // The whole reason the engine split them: while `p.viz` held one value, choosing the correction erased
    // the contrast the child had set, in silence. Two axes only help if writing one leaves the other alone.
    for (const c of CORRECOES_OFERECIDAS) {
      expect(estadoDa(c).tema, c).toBe('padrao');
    }
  });
});

describe('the filter each choice applies', () => {
  it('[Zero] trichromatic vision applies NO filter, rather than an identity one', () => {
    // An identity filter is not free: it forces the element onto its own compositing layer, and on the school
    // hardware of pillar 1 that is a cost paid by a child who asked for nothing.
    expect(filtroCssDe('tricro')).toBe('');
  });

  it('[Many] each of the other three applies a filter, and no two are the same', () => {
    const css = (['protan', 'deuter', 'tritan'] as const).map(filtroCssDe);
    for (const c of css) expect(c.length).toBeGreaterThan(0);
    expect(new Set(css).size, 'two corrections that render identically would be one lying about the other')
      .toBe(css.length);
  });

  it('[Cross-check] the filter is the ENGINE’s declaration, not a string this game invented', () => {
    // The key comes from `aplicacao().filtro` and its meaning from `VIZ_FILTER`. If this game wrote its own
    // matrix, it would drift from the six SVG filters `createGame` installs into `#cvd`.
    expect(filtroCssDe('protan')).toContain('url(');
  });
});

describe('the value arriving from the DOM is data, not a promise', () => {
  it('[Right] a real correction passes', () => {
    for (const c of CORRECOES_OFERECIDAS) expect(ehCorrecao(c), c).toBe(true);
  });

  it('[Exception] ⚠️ a SIMULATION key is refused, even though it is a real engine value', () => {
    // This is the one that matters: `data-valor` is an attribute, and an attribute is a string anybody can
    // write. The guard is what stops "blind" reaching `estadoDa` and blanking the screen of the child who
    // came here to see it better.
    expect(ehCorrecao('sim-protan')).toBe(false);
    expect(ehCorrecao('blind')).toBe(false);
    expect(ehCorrecao('lv-blur')).toBe(false);
  });

  it('[Boundary] and so is anything else', () => {
    expect(ehCorrecao('')).toBe(false);
    expect(ehCorrecao('hc7'), 'a value from the OTHER axis').toBe(false);
    expect(ehCorrecao(null)).toBe(false);
    expect(ehCorrecao(undefined)).toBe(false);
    expect(ehCorrecao('constructor')).toBe(false);
  });
});
