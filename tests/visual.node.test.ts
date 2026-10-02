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
describe('the colour-correction panel opens, rather than occupying the page', () => {
  const html = readFileSync(join(import.meta.dirname, '..', 'app', 'index.html'), 'utf8');

  it('[Cross-check] the rows are still there to be found at all', () => {
    // A gate whose subject vanished is the failure it exists to catch, wearing a green tick.
    expect(html, 'the radiogroup the engine fills').toMatch(/id="p2-viz"[^>]*role="radiogroup"/);
  });

  it('[Zero] 🔴 they sit inside an overlay that is `hidden` at rest — not in the page’s flex column', () => {
    // The overlay is `position: fixed` in the engine's stylesheet, which is the whole point: a fixed element
    // is out of flow and takes NO height from `<main>`, so the stage stops competing with it.
    const bloco = html.slice(html.indexOf('<div id="viz"'), html.indexOf('id="p2-viz"'));
    expect(bloco, 'the panel is an overlay').toContain('class="overlay"');
    expect(bloco, 'and it is closed until asked for').toContain('hidden');
  });

  it('[Right] and a LABELLED button opens it, which is what answers the engine’s objection', () => {
    // ⚠️ The reason the rows were open in the first place is real and recorded: `ui/visual-axes-panel` says a
    //    control that exists to be FOUND by someone who sees poorly, hidden in a closed box, is "almost the
    //    same as not having moved it". That was written about a `<select>`. What keeps it answered here is
    //    that the opener is a button with WORDS in the same row as «Alto contraste» — so this asserts the
    //    label, not merely the button.
    expect(html).toMatch(/id="open-viz"[\s\S]{0,160}data-i18n="axis\.correcao\.titulo"/);
    const tools = html.slice(html.indexOf('class="p2-tools"'), html.indexOf('</div>', html.indexOf('class="p2-tools"')));
    expect(tools, 'beside the other three, not off on its own').toContain('id="open-viz"');
  });
});

describe('Escape closes a panel, because the shell routes the key itself', () => {
  const bruto = readFileSync(join(import.meta.dirname, '..', 'src', 'standalone.ts'), 'utf8');

  /**
   * ⚠️ THE COMMENTS HAVE TO GO BEFORE ANYTHING IS ASKED OF THE SOURCE, and this is not tidiness — it is the
   * defect that was caught writing these very gates. The first version matched `overlays.escapeTarget(`
   * against the whole file; deleting the CALL left the gate green, because the paragraph explaining the call
   * says `overlays.escapeTarget()` three lines above it. In a repository that explains itself at this length,
   * prose and code are the same characters to a regular expression, and the prose is the larger target.
   *
   * `tests/cartridge.node.test.ts` meets the same trap from the other side and answers it by quoting
   * `createGame` in backticks wherever it is discussed. That works while everyone remembers; stripping the
   * comments works without anyone remembering.
   */
  const codigo = bruto
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((linha) => linha.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');
  const shell = codigo;

  it('[Cross-check] stripping the comments left the CODE, not an empty string', () => {
    // A filter that ate everything would make every assertion below pass by having nothing to look at.
    expect(shell, 'the engine call survives').toMatch(/createGame\s*\(/);
    expect(shell.length, 'and most of the file is prose, so this is a real reduction')
      .toBeLessThan(bruto.length * 0.6);
    expect(shell, 'and the prose is gone').not.toContain('THE ORDER IS THE ENGINE');
  });

  it('[Zero] 🔴 every `inEscapeChain: true` is matched by something that WALKS the chain', () => {
    // 📏 Measured 2026-09-12 on the shipped build: Escape closed none of the three panels. The engine's
    //    `input/keydown` is what walks `overlays.escapeTarget()`, and `createGame` never installs it for a
    //    consumer — so each `inEscapeChain: true` was a true declaration into a chain nobody walked.
    //    Registering the flag without routing the key is a claim this repository does not keep.
    const declara = [...shell.matchAll(/inEscapeChain:\s*true/g)].length;
    expect(declara, 'the panels that ask to be in the chain').toBeGreaterThan(0);
    expect(shell, 'and the shell asks the engine which one the key belongs to').toMatch(/overlays\.escapeTarget\s*\(/);
    expect(shell, 'and closes by that id, rather than picking one itself').toMatch(/overlays\.closeById\s*\(/);
  });

  it('[Exception] ⚠️ except mid-rebind, where Escape belongs to the capture flow', () => {
    // A child being asked «press a key» and pressing Escape is answering THAT question. Closing the panel
    // underneath would take the keystroke and give nothing back — the same failure shape as the capture
    // listener this guard sits beside.
    //
    // ⚠️ AND THE ASSERTION IS SCOPED TO `aoEscapar`, WHICH IS NOT PEDANTRY. The first version searched the
    //    whole file for `isCapturing()) return`, and deleting the guard left it GREEN: `aoCapturar`, twenty
    //    lines above, contains `if (!ctrl.isCapturing()) return;` and answered for it. An assertion that can
    //    be satisfied by a different call site is measuring the file's vocabulary, not its behaviour.
    const inicio = shell.indexOf('const aoEscapar');
    expect(inicio, 'the handler is still called that').toBeGreaterThan(-1);
    const corpo = shell.slice(inicio, shell.indexOf('\n};', inicio));
    expect(corpo, 'the guard is inside the Escape handler itself').toMatch(/isCapturing\s*\(\s*\)\s*\)\s*return/);
  });
});
