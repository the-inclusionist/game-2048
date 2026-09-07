// SPDX-License-Identifier: AGPL-3.0-or-later
// THE BROWSER ENTRY POINT — and it exists separately from `main.ts` for a mechanical reason, not an
// organisational one.
//
// `main.ts` is imported by the `node` project's tests, which have no bundler for a stylesheet: an
// `import '...css'` in there would break the whole logic suite. So the CSS and the borrowed panels come in
// HERE, in the only half that exists solely in a browser.
import '@the-inclusionist/engine/style.css';

import { srSay } from '@the-inclusionist/engine/core/a11y-sr.js';
import { t } from '@the-inclusionist/engine/core/i18n.js';
import * as store from '@the-inclusionist/engine/platform/storage.js';
import { VIZ_DOM_ONLY, VIZ_FILTER, simulatesDisability } from '@the-inclusionist/engine/render/viz-modes.js';
import { initSettingsTypo } from '@the-inclusionist/engine/ui/settings-typo.js';
import { padPxPerMm } from '@the-inclusionist/engine/input/touch.js';

import { bootar } from './main.ts';

const $ = <T extends Element = Element>(sel: string): T | null => document.querySelector<T>(sel);

const motor = bootar();
if (motor) {
  // TYPOGRAPHY — borrowed whole. The quiz measured that this panel serves outside its genre without a line of
  // change, and it is the strongest evidence that the menu stack belongs to the engine rather than to the
  // platformer.
  const typo = initSettingsTypo({ $, srSay, store, root: document.documentElement });
  $('#open-typo')?.addEventListener('click', () => {
    const ov = $<HTMLElement>('#typo');
    if (!ov) return;
    typo.render();
    ov.hidden = false;
    motor.overlays.frontOverlay(ov);
    ov.querySelector<HTMLElement>('button[data-font]:not([disabled])')?.focus();
  });
  const fechar = () => { const ov = $<HTMLElement>('#typo'); if (ov) ov.hidden = true; };
  $('#typo-close')?.addEventListener('click', fechar);
  motor.overlays.register('typo', { close: fechar, inEscapeChain: true });

  // HIGH CONTRAST BY ROLE. It belongs to this game, not to the engine — the quiz's finding 8: the engine's
  // `hcnew` modes repaint the platformer's tile textures, and this game does not have its tiles. What travels
  // is the IDEA (paint by field 2 of the contract), and it lives in `render/palette`.
  const hc = $<HTMLButtonElement>('#toggle-hc');
  hc?.addEventListener('click', () => {
    const ligado = document.documentElement.dataset.hc === '1';
    document.documentElement.dataset.hc = ligado ? '0' : '1';
    hc.setAttribute('aria-pressed', String(!ligado));
    motor.cenas.draw();
    srSay(hc.textContent ?? '');
  });

  // COLOUR VISION: the selector belongs to this game; the six filters were already installed by `createGame`.
  // `VIZ_DOM_ONLY` is the engine's DECLARED answer to "what works without a canvas" — before it, every
  // consumer recomputed it by mixing two different questions.
  const seletor = $<HTMLSelectElement>('#viz');
  const alvo = $<HTMLElement>('#game-region');
  if (seletor && alvo && motor.cvdFilters > 0) {
    const opcoes = VIZ_DOM_ONLY.filter((m) => !simulatesDisability(m.key));
    // ⚠️ VIA `new Option`, not via `innerHTML` with a template. The text here is OURS — it comes from
    // `VIZ_DOM_ONLY` and from the dictionary — so there is no injection to fear today; but the day one of
    // those sources starts accepting text from outside, the defect is born ready-made and invisible. Building
    // the node costs the same and closes the whole class. (The engine's `consumer-quiz` still uses the
    // template: same fix, on its side.)
    seletor.replaceChildren(...opcoes.map((m) => new Option(t(m.nome), m.key)));
    seletor.addEventListener('change', () => {
      alvo.style.filter = VIZ_FILTER[seletor.value] || '';
      srSay(seletor.options[seletor.selectedIndex]?.text ?? '');
    });
  }

  // TOUCH: the PURE half of `input/touch`. `padPxPerMm` anchors the real millimetre to the device (WCAG 2.5.5),
  // and the four buttons get 11 mm MEASURED instead of a guess in pixels. The whole `initTouch` is deliberately
  // left out: its pad is a platformer d-pad with twelve fixed ids this game does not want.
  const pxmm = padPxPerMm(matchMedia('(pointer: coarse)').matches, window.innerWidth, window.innerHeight);
  document.documentElement.style.setProperty('--alvo-toque', (11 * pxmm).toFixed(1) + 'px');
}
