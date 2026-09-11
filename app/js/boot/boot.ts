// SPDX-License-Identifier: AGPL-3.0-or-later
// THE BROWSER ENTRY POINT — and it exists separately from `main.ts` for a mechanical reason, not an
// organisational one.
//
// `main.ts` is imported by the `node` project's tests, which have no bundler for a stylesheet: an
// `import '...css'` in there would break the whole logic suite. So the CSS and the borrowed panels come in
// HERE, in the only half that exists solely in a browser.
import '@the-inclusionist/engine/style.css';

import { srAlert, srSay } from '@the-inclusionist/engine/core/a11y-sr.js';
import { t } from '@the-inclusionist/engine/core/i18n.js';
import * as store from '@the-inclusionist/engine/platform/storage.js';
import { ROTULO_DA_CORRECAO, escolhaDoBotao, linhasDoEixo } from '@the-inclusionist/engine/ui/visual-axes-panel.js';
import type { Correcao } from '@the-inclusionist/engine/render/viz-axes.js';
import { CORRECOES_OFERECIDAS, ehCorrecao, filtroCssDe } from '../visual.ts';
import { initSettingsTypo } from '@the-inclusionist/engine/ui/settings-typo.js';
import { initSettingsControls } from '@the-inclusionist/engine/ui/settings-controls.js';
import { fabricaComOJogo, kb, resetKB, saveKB, setKB } from '@the-inclusionist/engine/input/keyboard.js';
import { acoesComRotulo } from '../actions.ts';
import { semNulos } from '../keyboard-save.ts';
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

  // THE KEYBOARD-REMAP PANEL — borrowed whole, like the typography one, and for the same reason: it is the
  // engine's screen and the game has no business rewriting the capture flow, the cross-player conflict lookup
  // or the reset.
  //
  // ⚠️ THE PART-ONE CAVEAT ABOUT THIS BLAMED THE WRONG THING, and the correction matters more than the
  // panel. The README and `main.ts` said the remapping screen was unreachable because `CreateGameOptions` had
  // no `getPauseActs`. Measured on 2026-09-11: remapping was never behind `getPauseActs`. The pause card's
  // options list is `caa`, `empatia`, `audio`, `motora`, `tipo`, `visual`, `anim` — none of them is the remap
  // panel — and NOTHING in the engine opens `ui/settings-controls`, exactly as nothing opens
  // `ui/settings-typo`. It was mountable on engine 8 and simply had not been mounted.
  const ctrl = initSettingsControls({
    $,
    srSay,
    srAlert,
    // ⚠️ NOT the whole `platform/storage` module: `ControlsStore` is exactly `{ saveKB, resetKB }`, and both
    //    live in `input/keyboard` beside the `kb` they persist. Passing the broad module compiled against
    //    nothing — the narrow type is what says which two functions this panel may reach.
    //
    // 🔴 AND `saveKB` IS WRAPPED, because saving what the engine hands us LOCKED THE CHILD OUT OF THE GAME.
    //    Measured on 2026-09-11: remap a key, reload, blank page. The engine's `p3`/`p4` schemes carry `null`
    //    for positions a seat cannot reach, `saveKB` persists all 42, and on the next boot `migrarEsquema`
    //    does `[...teclas]` over each one — `[...null]` throws inside `createGame`, before anything renders.
    //    `semNulos` writes only the positions that name a key; the merge on load leaves the factory's value
    //    for the rest, so nothing is lost. The whole chain is in `app/js/keyboard-save.ts`, and it is an
    //    ENGINE defect reported as one, not a disagreement.
    store: { saveKB: (esquema) => saveKB(semNulos(esquema)), resetKB },
    // The rows are this game's preset read back through the engine's own labeller, so the screen cannot name
    // an action the game does not read. See `acoesComRotulo`.
    acoesDoJogo: () => acoesComRotulo(t),
    kb,
    setKB,
    kbFor: (i) => motor.keyboard.kbFor(i),
    // ⚠️ DERIVED, because the runtime exposes no `kbPadraoFor`. `fabricaComOJogo()` is the engine's factory
    //    WITH this game's `mapeamentoDoTeclado` already folded in — which is the right "default" to offer a
    //    child pressing Reset: the factory as this game configured it, not the engine's bare table.
    kbPadraoFor: (_i) => fabricaComOJogo().solo,
    getNumPlayers: () => 1,
    applyControls: () => { motor.keyboard.refreshControls(); },
    assignControls: () => { motor.keyboard.assignControls(); },
  });
  $('#open-ctrl')?.addEventListener('click', () => {
    const ov = $<HTMLElement>('#ctrl');
    if (!ov) return;
    ctrl.render(0);   // seat 0 — this game has one player, and `getNumPlayers` says so
    ov.hidden = false;
    motor.overlays.frontOverlay(ov);
    ov.querySelector<HTMLElement>('button:not([disabled])')?.focus();
  });
  // ⚠️ THE CAPTURED KEY HAS TO BE DELIVERED BY US, and finding out why is the second half of this work.
  //    `settings-controls` does not listen for the key itself: the engine's `input/keydown` router does, and
  //    calls `ctrlPanel.handleCaptureKeydown(e)` before anything else. 📏 Measured on 2026-09-11 —
  //    `createGame` never calls `initKeydown`, so for a consumer of the composition root that router does not
  //    exist. Without this listener the panel would enter "Pressione…" and stay there for ever, which is a
  //    worse control than none: it would take the child's next keystroke and give nothing back.
  //
  // 📌 ON THE DOCUMENT, IN THE CAPTURE PHASE, and deliberately not on `#game-region`: the overlay is
  //    OUTSIDE the region, so a key pressed with the panel open never reaches the game's own listener. It is
  //    also the one listener this file adds to a node it does not own — G5 of the cartridge plan has to
  //    release it, and it is written as a named function so that it can be.
  const aoCapturar = (e: KeyboardEvent) => {
    if (!ctrl.isCapturing()) return;
    if (ctrl.handleCaptureKeydown(e)) e.preventDefault();
  };
  document.addEventListener('keydown', aoCapturar, true);

  const fecharCtrl = () => { const ov = $<HTMLElement>('#ctrl'); if (ov) ov.hidden = true; };
  $('#ctrl-close')?.addEventListener('click', fecharCtrl);
  motor.overlays.register('ctrl', { close: fecharCtrl, inEscapeChain: true });

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
