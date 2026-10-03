// SPDX-License-Identifier: AGPL-3.0-or-later
// THE ACCESSIBILITY BAR, MEASURED — the Dev's three findings of 2026-10-03 turned into gates (Part Five, E4).
//
// ========================= WHY THIS FILE EXISTS AT ALL =========================
// The bar is the one row a child who needs blind mode, narration, Libras, the calm level or another language
// has to reach, and on the live deploy none of those was reliably reachable. The Dev, looking at it:
//
//   «o painel de acessibilidade rápida deveria estar no topo, como na engine. Mas a pior parte foi a mensagem
//    que deveria aparecer embaixo do painel aparecendo no mouse: como você implementou de um jeito que cria
//    deslocamentos conforme a mensagem muda de tamanho no eixo horizontal, ficou impossível selecionar alguns
//    itens com o mouse.»
//
// 📏 THE CAUSE, measured: this game styled the bar's host with `display:flex; flex-wrap: wrap`, which made the
// engine's `<p class="pause-icons-cap">` — the line that names the icon under the pointer — an ordinary flex
// ITEM of the icons' own row. The caption's text changes width on every hover (measured here: from 77 px for
// «Menu» to 463 px for «Correção de daltonismo: desligado», a 386 px swing), the row reflowed, and the icons
// slid out from under the cursor — 139 px, for `idioma`.
//
// ========================= WHY IT CANNOT BE A NODE TEST =========================
// Every assertion below is a RECTANGLE. The defect was invisible to the type checker, invisible to the logic
// suite and invisible in a screenshot taken without the pointer over an icon. Only a real browser resolves
// `position:absolute; top:100%`, re-runs flex layout and hands back a box.
//
// 🔴 AND THE TWO STYLESHEETS ARE THE SUBJECT, NOT THE SETUP. The fix was to stop writing CSS for the bar and
// let the engine's own two rules apply, so a gate that did not load the engine's stylesheet would measure a
// bar with no layout at all — green, and about nothing (the trap of ADR-0106's dead control, in test form).
import '@the-inclusionist/engine/style.css';
import '../app/css/game.css';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createGame, type Engine } from '@the-inclusionist/engine';
import { createRng } from '@the-inclusionist/engine/core/rng.js';
import paginaHtml from '../app/index.html?raw';
import { cartridge } from '../src/index.ts';
import { HUD_W, HUD_X, LOGICAL_H, LOGICAL_W, TOP_BAND } from '../app/js/geometry.ts';
import type { GameInstance } from '../app/js/cartridge-types.ts';

/**
 * THE REAL PAGE, NOT A COPY OF IT — `app/index.html` parsed and adopted.
 *
 * 📌 THE ALTERNATIVE WAS A SECOND COPY OF THE MARKUP, and a second copy is how a gate stops measuring the
 * thing it names: the bar moved into `#game-region` in E2, and a hand-built harness would have gone on
 * asserting about a `<div>` the shipped page no longer has. Reading the file is what makes «the bar is inside
 * the region» a property of the DELIVERY rather than of this file.
 *
 * ⚠️ THE SCRIPTS ARE STRIPPED. `DOMParser` does not run them, but `appendChild` of a `<script>` DOES — the
 * shell would boot a second time, and this file mounts its own.
 */
function adotarAPagina(): void {
  const doc = new DOMParser().parseFromString(paginaHtml, 'text/html');
  for (const s of doc.querySelectorAll('script')) s.remove();
  document.body.replaceChildren(...[...doc.body.childNodes].map((n) => document.importNode(n, true)));
}

let motor: Engine | null = null;
let jogo: GameInstance | null = null;

/** The same chain as `src/standalone.ts`, host block included — minus `a11yBarHost`, which is the point. */
function montarShell(): void {
  motor = createGame({
    declaration: cartridge.declaration,
    ...cartridge.hooks,
    host: {
      doc: document,
      win: window,
      cvdHost: document.querySelector('#cvd'),
      pauseHost: document.querySelector('#game-region'),
    },
    declines: { noPauseActor: true, noNeuralVoice: true },
    downloadHeavy: false,
  });
  jogo = cartridge.create({
    engine: motor,
    region: document.querySelector<HTMLElement>('#game-region')!,
    rng: createRng(20261003),
    t: motor.t,
    params: new URLSearchParams(),
  });
  motor.mount(jogo.declaration, jogo.hooks);
}

beforeEach(() => {
  adotarAPagina();
  montarShell();
});

afterEach(() => {
  jogo?.teardown();
  jogo = null;
  motor = null;
});

const regiao = () => document.querySelector<HTMLElement>('#game-region')!;
const barra = () => document.querySelector<HTMLElement>('#title-icons')!;
const icones = () => [...barra().querySelectorAll<HTMLElement>('.pi-btn')];
/** The horizontal centre of every icon, which is what a cursor aims at. */
const centros = () => icones().map((b) => { const r = b.getBoundingClientRect(); return r.x + r.width / 2; });

describe('E4 (a) — pointing at an icon moves no icon', () => {
  it('[Cross-check] the bar is mounted, with icons, inside the region', () => {
    // A gate measuring an empty bar would be green about nothing — and that is exactly how the old harness
    // in `tests/factory.browser.test.ts` came to conclude that `a11yBarHost` was mandatory.
    expect(icones().length, 'the engine wrote the bar').toBeGreaterThan(5);
    expect(regiao().contains(barra()), 'and it is the region’s own child').toBe(true);
  });

  it('[Many] 🔴 hovering EVERY icon in turn leaves every centre where it was', () => {
    // The defect as a measurement. `mouseenter` is the engine's own trigger (`ui/pause-icons.js:117`), and
    // reading a rectangle right after dispatching forces layout — so no frame is needed, which also keeps
    // this honest in a hidden pane, where `requestAnimationFrame` never fires.
    const base = centros();
    const alvos = icones();
    const movidos: string[] = [];
    let larguraMin = Infinity;
    let larguraMax = 0;

    for (let i = 0; i < alvos.length; i++) {
      alvos[i].dispatchEvent(new MouseEvent('mouseenter'));
      const agora = centros();
      const legenda = barra().querySelector('.pause-icons-cap');
      if (legenda) {
        const w = legenda.getBoundingClientRect().width;
        larguraMin = Math.min(larguraMin, w);
        larguraMax = Math.max(larguraMax, w);
      }
      for (let j = 0; j < agora.length; j++) {
        const d = Math.abs(agora[j] - base[j]);
        // Half a pixel of tolerance: a sub-pixel difference is not a cursor leaving a button.
        if (d > 0.5) movidos.push(`hovering #${i} moved #${j} by ${d.toFixed(1)}px`);
      }
      alvos[i].dispatchEvent(new MouseEvent('mouseleave'));
    }

    // ⚠️ THE CAPTION HAS TO HAVE CHANGED WIDTH, or the assertion above proved nothing: a caption that is
    //    always the same size cannot push anything, so a gate that never saw it grow is a gate on an empty
    //    case. 📏 Measured on the build of 2026-10-03: 77 px («Menu») to 463 px («Correção de daltonismo:
    //    desligado»).
    expect(larguraMax - larguraMin, 'the caption’s width must actually vary across the icons')
      .toBeGreaterThan(100);
    expect(movidos, 'an icon that moves under the pointer cannot be clicked').toEqual([]);
  });

  it('[Interface] the caption is OUT OF FLOW, below the bar, and cannot be pointed at', () => {
    // The three declarations that make the property above structural instead of lucky. They are the engine's
    // (`#title-icons .pause-icons-cap`), and this game must not be overriding any of them.
    icones()[0].dispatchEvent(new MouseEvent('mouseenter'));
    const legenda = barra().querySelector<HTMLElement>('.pause-icons-cap');
    expect(legenda, 'the engine writes the caption node').toBeTruthy();
    const cs = getComputedStyle(legenda!);
    expect(cs.position, 'in flow, it is a flex item of the icons’ row').toBe('absolute');
    expect(cs.pointerEvents, 'a caption that takes the pointer steals the icon’s own hit area').toBe('none');
    expect(legenda!.getBoundingClientRect().top, 'it hangs BELOW the bar')
      .toBeGreaterThanOrEqual(barra().getBoundingClientRect().bottom - 0.5);
    expect(getComputedStyle(barra()).flexWrap, 'a wrapping bar reflows on every caption').toBe('nowrap');
  });
});

describe('E4 (c) — the room the engine reserves, and what the game does with it', () => {
  it('[Right] 🔴 `--barra-a11y-h` is a sane fraction of the region, not a page measurement', () => {
    // 📏 THE NUMBER THAT SAID THE BAR WAS IN THE WRONG PLACE. With the bar under `<main>`, the engine
    //    computed `bar.bottom - region.top` across the whole page and wrote 375 px onto a region 171 px tall
    //    — every frame, read by nobody. The band is a band; it cannot exceed its own region.
    const banda = parseFloat(getComputedStyle(regiao()).getPropertyValue('--barra-a11y-h'));
    const alturaDaRegiao = regiao().getBoundingClientRect().height;
    expect(banda, 'the engine measured something').toBeGreaterThan(0);
    expect(banda, 'a band taller than its region is a bar outside it').toBeLessThan(alturaDaRegiao);
  });

  it('[Boundary] 🔴 and it fits inside the room this game reserves for it', () => {
    // `TOP_BAND` is the canvas half's constant — the canvas draws in the fixed 320×180 grid and cannot follow
    // a CSS custom property. This is the assertion that makes the constant honest: the engine's own
    // measurement, in logical pixels, against the number `geometry.ts` holds.
    const k = regiao().getBoundingClientRect().width / LOGICAL_W;
    const banda = parseFloat(getComputedStyle(regiao()).getPropertyValue('--barra-a11y-h')) / k;
    expect(banda, `TOP_BAND is ${TOP_BAND}; raise it if the engine now asks for more`)
      .toBeLessThanOrEqual(TOP_BAND);
  });

  it('[Zero] 🔴 `motor.problems` carries no «draws over the accessibility bar» line', () => {
    // The engine's own verdict, and the plan's acceptance criterion for E3. 📏 It was there until this
    // morning, naming `h1.p2-hud__title`: the heading's box ran from logical y 16 to 40 and the bar occupied
    // y 0 to 22, so the child looking for blind mode found the game's title over the buttons.
    const sobreABarra = motor!.problems.filter((p) => p.includes('draws over the accessibility bar'));
    expect(sobreABarra, 'the engine says the game is covering the bar').toEqual([]);
  });

  it('[Interface] ⚠️ the HUD column is where `geometry.ts` says, though CSS cannot import it', () => {
    // `app/css/game.css` restates `HUD_X`, `HUD_W` and `TOP_BAND` as literals, because a stylesheet has no
    // way to read a TypeScript constant. This is the only thing standing between those two copies: the
    // ACTION is the CSS literal and the ASSERTION is the module's constant, so a drift in either shows.
    // 📏 `width` moved from 148 to 158 when the board narrowed to 138 on 2026-10-03; a stale literal would
    //    have left a 10-logical-pixel strip of dead column that nothing on screen could reveal.
    const r = regiao().getBoundingClientRect();
    const k = r.width / LOGICAL_W;
    const hud = document.querySelector<HTMLElement>('#p2-hud')!.getBoundingClientRect();
    expect(Math.round((hud.x - r.x) / k), 'HUD_X').toBe(HUD_X);
    expect(Math.round(hud.width / k), 'HUD_W').toBe(HUD_W);
    const topo = (hud.y - r.y) / k;
    expect(topo, 'the HUD starts at or below the reserved band').toBeGreaterThanOrEqual(TOP_BAND);
    expect(topo + hud.height / k, 'and the whole column stays on the screen').toBeLessThanOrEqual(LOGICAL_H);
  });

  it('[Many] ⚠️ and the band stays inside `TOP_BAND` for every face the 🔤 icon offers', () => {
    // 📏 THE REASON `TOP_BAND` IS 40 AND NOT 38. The caption is `font-size: 1em`, so a face with a higher
    //    floor grows it (#172): measured 75 px for Atkinson Hyperlegible, Lexend and Andika, and 77 px for
    //    Playwrite BR, whose caption goes from 16 px to 20 px. Cycling the whole list is what turns «I
    //    measured the default» into «I measured the worst case».
    const ciclo = icones().find((b) => b.textContent?.trim() === '🔤');
    expect(ciclo, 'the typography cycle is in the bar').toBeTruthy();
    const k = regiao().getBoundingClientRect().width / LOGICAL_W;
    const banda = () => parseFloat(getComputedStyle(regiao()).getPropertyValue('--barra-a11y-h')) / k;

    const vistas = new Map<string, number>();
    for (let i = 0; i < 10; i++) {
      vistas.set(getComputedStyle(document.documentElement).fontFamily, banda());
      ciclo!.click();
    }
    expect(vistas.size, 'the cycle actually changed the face more than once').toBeGreaterThan(1);
    for (const [face, b] of vistas) {
      expect(b, `${face} asks for ${b} logical px`).toBeLessThanOrEqual(TOP_BAND);
    }
  });
});
