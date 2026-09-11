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
import { ROTULO_DA_CORRECAO, escolhaDoBotao, linhasDoEixo } from '@the-inclusionist/engine/ui/visual-axes-panel.js';
import type { Correcao } from '@the-inclusionist/engine/render/viz-axes.js';
import { CORRECOES_OFERECIDAS, ehCorrecao, filtroCssDe } from '../visual.ts';
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

  // COLOUR VISION. The six SVG filters were already installed into `#cvd` by `createGame`; what lives here is
  // the CHOOSER, and since 2026-09-11 it is four visible rows instead of a `<select>`.
  //
  // ⚠️ THE SHAPE WAS THE DEFECT, and the engine had already written it down. `ui/visual-axes-panel`: "it keeps
  // the VISIBLE-ROW form, not a `<select>` — inside a closed box, a control whose reason to exist is to be
  // FOUND by someone who sees poorly is almost the same as not having moved it."
  //
  // The rows come from the engine's `linhasDoEixo`, so the control looks and reads the same here as in every
  // other game: same `.ctrl-row`, same `role="radio"`, same "Escolhido"/"Escolher" wording from the shared
  // dictionary. The only thing this game supplies is the WRITER — `render/viz-setters` is the engine's own,
  // and its context asks for ~34 fields of a PixiJS platformer render graph this game does not have.
  const caixaViz = $<HTMLElement>('#p2-viz');
  const alvo = $<HTMLElement>('#game-region');
  if (caixaViz && alvo && motor.cvdFilters > 0) {
    let atual: Correcao = 'tricro';

    const pintar = () => {
      // ⚠️ `innerHTML` FROM A PURE ENGINE BUILDER, and the string is not user text: `linhasDoEixo` interpolates
      // only i18n values and the axis' own literals. The old `<select>` was built with `new Option` to close
      // the injection class pre-emptively; here the equivalent guarantee is that nothing outside the engine's
      // dictionary reaches the template, and `ehCorrecao` guards the way back in.
      caixaViz.innerHTML = linhasDoEixo('correcao', CORRECOES_OFERECIDAS, ROTULO_DA_CORRECAO, atual, t);
    };

    pintar();

    // DELEGATED, so the handler survives every repaint. Re-binding per row would leak a listener each time.
    caixaViz.addEventListener('click', (e) => {
      const botao = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-eixo][data-valor]');
      if (!botao) return;
      const escolha = escolhaDoBotao(botao.dataset);
      // Two guards, and neither is ceremony: the first is the engine's (is this a row of a known axis?), the
      // second is ours (is this a correction this game offers?). `data-valor` is an attribute, and an
      // attribute is a string anyone can write — `blind` is a real engine value and must never get through.
      if (!escolha || escolha.eixo !== 'correcao' || !ehCorrecao(escolha.valor)) return;
      atual = escolha.valor;
      alvo.style.filter = filtroCssDe(atual);
      pintar();
      // The label, not the state word: "Escolhido" alone would tell a screen reader that something was
      // chosen without saying what. `aria-checked` already carries the state; the announcement carries the name.
      srSay(t(ROTULO_DA_CORRECAO[atual]));
    });
  }

  // TOUCH: the PURE half of `input/touch`. `padPxPerMm` anchors the real millimetre to the device (WCAG 2.5.5),
  // and the four buttons get 11 mm MEASURED instead of a guess in pixels. The whole `initTouch` is deliberately
  // left out: its pad is a platformer d-pad with twelve fixed ids this game does not want.
  const pxmm = padPxPerMm(matchMedia('(pointer: coarse)').matches, window.innerWidth, window.innerHeight);
  document.documentElement.style.setProperty('--alvo-toque', (11 * pxmm).toFixed(1) + 'px');
}
