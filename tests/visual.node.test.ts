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
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CORRECOES_OFERECIDAS, SIMULACOES_CONHECIDAS, ehCorrecao, estadoDa, filtroCssDe,
} from '../app/js/visual.ts';

// ========================= THE ARGUMENT THAT STOOD HERE WAS WRONG, AND IT COST A MONTH =========================
// 🔴 A DESCRIBE CALLED «why the CONTRAST axis is not mounted — arithmetic, not preference» held four
// assertions proving that three roles pairwise at 7:1 would need 49:1 between the extremes while the WCAG
// scale stops at 21. The arithmetic was correct. It was answering a question the engine never asked.
//
// 📏 WHAT THE ENGINE ACTUALLY ASKS, in the sentences a child reads (`i18n/en.js:570`):
//     hc3  — «Background recedes + outlines + colour by role; platform vs background ~3:1 (AA graphics)»
//     hc45 — «More contrast (AA text): lighter platforms and a darker background»
//     hc7  — «Maximum contrast (AAA text): almost black and white»
// FIGURE against BACKGROUND. One pair. «Almost black and white» is the engine telling anyone who reads it
// how `hc7` is reached — and measured with this game's own `contraste()`, `hc7` reaches 21.00:1.
//
// 🔴 AND THE AXIS WAS NEVER MISSING FROM THE ENGINE. `iconsThatAct` mounts the 🌗 icon for whoever hands in
// `setPlayerTheme` (`contrast: (w) => w.theme`); this cartridge handed in none, so the control was absent
// because of US. The engine's own words for the shape: «a gap the consumer reads as a choice is the worst
// kind». I read our gap as the engine's choice and wrote a test to defend it.
//
// 📌 WHERE THE ARITHMETIC LIVES NOW: `tests/palette.node.test.ts`, around the four pairs that are real —
// figure vs screen at the level's ratio, number vs tile at the same, every role vs the FRAME at 1.4.11, and
// the empty square vs the frame. The Dev found it in one sentence: «Por que ainda há botão de alto contraste
// na parte de baixo da tela? Isso é redundante, não?»

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
    // The key comes from `howItApplies().filter` and its meaning from `VIZ_FILTER`. If this game wrote its own
    // matrix, it would drift from the six SVG filters `createGame` installs into `#cvd`.
    expect(filtroCssDe('protan')).toContain('url(');
  });
});

describe('the value arriving from the DOM is data, not a promise', () => {
  it('[Right] a real correction passes', () => {
    for (const c of CORRECOES_OFERECIDAS) expect(ehCorrecao(c), c).toBe(true);
  });

  it('[Exception] ⚠️ a SIMULATION key is refused, even though it is a real engine value', () => {
    // This is the one that matters: `data-value` is an attribute, and an attribute is a string anybody can
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

// ========================= WHERE THE CONTROL LIVES, AND WHY THAT IS A GATE =========================
// It was an always-open section in the page until 2026-09-12, and that cost the board its screen: `<main>`
// is a flex column with `overflow: hidden` whose only flexible item is `#stage-wrap`, so the panel's 311 px
// came out of the game's height alone. `scripts/layout-check.mjs` measures the consequence on four real
// screens; these two assertions hold the SHAPE that produced it, because a future panel added to the page
// would reproduce the defect long before anyone re-ran a browser.
// ========================= WHAT THIS SHELL NO LONGER MOUNTS (E1, Part Five) =========================
// Two describes stood here until 2026-10-03: one for the `#viz` colour-correction overlay (built in G11,
// whose layout fix was correct work on a panel that should not have existed) and one for the Escape chain
// across our three overlays. Both lost their subject when E1 deleted the panels — engine 11.0.0 mounts
// every one of them itself.
//
// 📌 THE GATE THAT REPLACES THEM HOLDS THE OPPOSITE PROPERTY, and that is the point: the old ones asserted
// our panels were well formed; this one asserts they are ABSENT. A regression here is somebody re-adding a
// control the child would then meet twice — which is the defect the Dev found on the live deploy.
describe('E1 — the shell mounts no panel the engine already mounts', () => {
  const SHELL = readFileSync(join(import.meta.dirname, '..', 'src', 'standalone.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    // 🔴 CRLF FIRST, AND IT IS NOT TIDINESS. Measured on 2026-10-03: in a file with CRLF line endings,
    // every assertion below went inert without a word. JavaScript's `.` does NOT match a carriage return — it
    // is a line terminator — so `(^|[^:])//.*$` finds no match on such a line, and NOTHING is stripped. The
    // gate then reads the comments as if they were code. It surfaced as a false positive (a comment naming the
    // forbidden token reddened the gate), which is the lucky direction; a checkout with `core.autocrlf=true`
    // would leave every «this source does not contain X» gate in this repository measuring prose.
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((linha) => linha.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');
  const HTML = readFileSync(join(import.meta.dirname, '..', 'app', 'index.html'), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  it('[Cross-check] stripping comments left the CODE, not an empty string', () => {
    expect(SHELL, 'the engine call survives').toMatch(/createGame\s*\(/);
    expect(HTML, 'the markup survives').toContain('<title>');
  });

  it('[Zero] 🔴 it does not call `initSettingsTypo` — the engine does, at create-game.js:1134', () => {
    expect(SHELL).not.toMatch(/initSettingsTypo\s*\(/);
  });

  it('[Zero] 🔴 nor `initSettingsControls` — the engine does, at create-game.js:2973', () => {
    // 📌 G2 recorded «nothing in the engine opens ui/settings-controls» against engine 8. True then, false
    //    since 11.0.0 — and it stayed in the shell as a live justification for three weeks.
    expect(SHELL).not.toMatch(/initSettingsControls\s*\(/);
  });

  it('[Zero] 🔴 and the markup carries none of the three overlays', () => {
    for (const id of ['typo', 'ctrl', 'viz']) {
      expect(HTML, `#${id} belongs to the engine now`).not.toMatch(new RegExp(`id="${id}"`));
    }
  });

  it('[Zero] 🔴 nor the ◐ contrast button — the last one, and the one I argued hardest to keep', () => {
    // This assertion is the INVERSE of what stood here hours ago: «✅ but the ◐ contrast button STAYS — its
    // reason is arithmetic, not a version». The arithmetic measured role against role; the engine's levels
    // measure figure against background. The header of this file has the correction in full.
    expect(HTML, 'the engine mounts 🌗 for a cartridge that declares `setPlayerTheme`')
      .not.toMatch(/id="toggle-hc"/);
    expect(SHELL, 'and the shell no longer flips a theme of its own').not.toMatch(/dataset\.hc\b/);
  });

  it('[Right] ✅ and the cartridge hands in the writer that mounts the engine’s icon', () => {
    // The other half, and the one that makes the deletion a MOVE rather than a loss: `iconsThatAct` asks
    // `contrast: (w) => w.theme`, answered from `Boolean(ctx.setPlayerTheme)`. Without this the control
    // would simply be gone, which is worse than the duplicate it replaced.
    const CARTUCHO = readFileSync(join(import.meta.dirname, '..', 'src', 'index.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((linha) => linha.replace(/(^|[^:])\/\/.*$/, '$1'))
      .join('\n');
    expect(CARTUCHO, 'the 🌗 icon exists only for a game that hands in this writer')
      .toMatch(/setPlayerTheme\s*:/);
    // 📌 ON THE MODULE-LEVEL HOOKS AND NOT THE INSTANCE'S: `create-game.js:812` captures the writer once, at
    //    `createGame`, and hands it to `initPauseIcons` on the next line — a `mount` cannot replace it.
    expect(CARTUCHO.indexOf('setPlayerTheme'), 'it has to be in the cartridge-level hooks')
      .toBeGreaterThan(CARTUCHO.indexOf('const hooks'));
  });
});
