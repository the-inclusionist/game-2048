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
