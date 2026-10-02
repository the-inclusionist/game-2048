// SPDX-License-Identifier: AGPL-3.0-or-later
// THE STANDALONE SHELL — one of the two things this repository builds from one source (ADR-0140).
//
// ========================= WHAT A SHELL IS =========================
// It calls `createGame` ONCE, builds a `ctx`, calls the cartridge's factory, mounts its declaration and runs
// the frame loop. The platform is simply a different shell around the same factory, and nothing in the game
// knows which one it got — which is what makes one source serve both modes (ADR-0139 §2, ADR-0140 §2).
//
// ⚠️ AND THIS ARTIFACT IS A DEVELOPMENT ROUTE, NEVER A DELIVERY ROUTE. ADR-0140 §3 draws that line itself:
// a standalone build exists so this repository can be developed, tested, audited and demonstrated with no
// platform in existence. Deployed to children it becomes a second origin, and every word of ADR-0117 applies
// — the cache partitions, and the child's accessibility settings stop following her between games.
import '@the-inclusionist/engine/style.css';

import { createGame } from '@the-inclusionist/engine';
import { createRng } from '@the-inclusionist/engine/core/rng.js';
import { createStorage } from '@the-inclusionist/engine/platform/storage.js';
import { CORRECTION_LABEL, buttonChoice, axisRows } from '@the-inclusionist/engine/ui/visual-axes-panel.js';
import type { Correction } from '@the-inclusionist/engine/render/viz-axes.js';
import type { GameDeclaration } from '@the-inclusionist/engine/core/contract.js';
import { initSettingsTypo } from '@the-inclusionist/engine/ui/settings-typo.js';
import { initSettingsControls } from '@the-inclusionist/engine/ui/settings-controls.js';
// The module-level `kb`, `resetKB`, `setKB`, `initKB` are gone in engine 11.0.0 (note DA); they live on
// `motor.keyboardConfig` now. `saveKB` stays exported, but with a `(store, kb)` signature; the engine's
// root-provided `motor.keyboardConfig.save()` is the one we use, so this import carries no live symbol.
import { padPxPerMm } from '@the-inclusionist/engine/input/touch.js';

import { cartridge, accommodations } from './index.ts';
import { CORRECOES_OFERECIDAS, ehCorrecao, filtroCssDe } from '../app/js/visual.ts';
import { acoesComRotulo } from '../app/js/actions.ts';
import { semNulos } from '../app/js/keyboard-save.ts';
import { MS_POR_QUADRO } from '../app/js/animation.ts';

const $ = <T extends Element = Element>(sel: string): T | null => document.querySelector<T>(sel);

// 1 · THE DICTIONARIES RIDE INTO `createGame`. H2 of Part Three: engine 11 removed the module-level
//     `registerDict` and reads the game's words through `CreateGameOptions.dictionaries` instead (ADR-0232 D3,
//     note DN). Two cartridges each registering on the same root used to be two writes to one table in an
//     order nobody controlled; the engine's own rule now ADDS a cartridge's words to the root's at `mount`
//     time, and keys unknown to every language go into `problems` named.

// The two the lifted `host` block refers to. They were `bootar`'s parameters; in a shell they are the page.
const doc = document;
const win = window;

const regiao = $<HTMLElement>('#game-region');
if (!regiao) throw new Error('#game-region is missing — the shell has nowhere to put the game');

// 2 · THE ENGINE, ONCE.
//
// ⚠️ THE DECLARATION IS A PROBLEM OF ORDER, and ADR-0139 §5 names it: `createGame` takes `declaration` as a
//    VALUE and checks it at boot — but the declaration belongs to an instance that does not exist until
//    `create(ctx)` is called, and `create` needs the engine.
//
// 🔴 AND THE RECORD'S OWN ANSWER DOES NOT BOOT ON ENGINE 9.0.0. §5 prescribes "a declaration whose members
//    forward to the mounted cartridge" — measured on 2026-09-11, that THROWS: with nothing mounted yet a
//    delegate answers `undefined` for all ten fields, and 9.0.0 refuses a malformed declaration outright
//    («LANÇA numa declaração malformada, e não a põe em `problems`») rather than reporting it. The interim was
//    written against 8.x, where the check only filled `problems`.
//
// 📌 SO THE SHELL BOOTS WITH A DECLARATION THAT IS HONEST RATHER THAN EMPTY: a well-formed one that says there
//    is no game yet. `world: {kind:'none'}` is exactly right here and nowhere else — the contract warns that
//    `none` must not be what happens when somebody FORGETS, and this is the one moment when "there is no space
//    because there is no game" is the truth. `mount` replaces it the instant the cartridge exists.
const semJogoAinda: GameDeclaration = {
  topology: () => ({ kind: 'hotspots', order: ['vazio'] }),
  world: () => ({ kind: 'none' }),
  holdsAtOnce: () => 1,
  holdsKeys: () => false,
  tick: 'player',
  roleAt: () => 'free',
  nameAt: () => null,
  focusOf: () => null,
  objectiveOf: () => ({ have: 0, need: 1, name: { text: '', gender: 'n' as const, plural: false } }),
  targetsOf: () => [],
};

const motor = createGame({
  // The placeholder above. Replaced by `mount` as soon as the cartridge exists.
  declaration: semJogoAinda,
  // THE DICTIONARIES, THE ONE PLACE A GAME'S WORDS LIVE SINCE 11.0.0 (ADR-0232 D3, note DN). The three
  // languages the cartridge exports — pt, en, es — reach the root's translator here, before any text. A
  // declared key missing in every language becomes a line of `problems` and the field is left out.
  dictionaries: cartridge.dictionaries,
  // See the note on `accommodations` in `src/index.ts`: every GAME_KEYED entry is `false` because this
  // game's vocabulary for them is empty. The GENERAL ones (typography, narration, highContrast, …) are
  // CONTRACT_KEYED and the engine derives them from the declaration.
  accommodations,
    host: {
      doc,
      win,
      cvdHost: doc.querySelector('#cvd'),
      // WHERE THE ACCESSIBILITY BAR GOES. Outside `#game-region` on purpose: inside it, everything scales by
      // the integer `k` of ADR-0001 along with the 320×180 board, and these controls are not part of the
      // picture — they are chrome, and `ui/layout` keeps chrome at 16 px text and 44 px touch.
      //
      // ⚠️ AND IT IS THE ENGINE THAT MOUNTS THE BAR NOW. Measured by the engine across the local catalogue:
      // five of six games had no accessibility bar at all, this one among them, because `initPauseIcons` had
      // to be called by each game's composition root and five roots never remembered. The child who depends
      // on blind mode, TTS or Libras opened those five and had nowhere to go.
      a11yBarHost: doc.querySelector('#p2-a11y'),
      // WHERE THE PAUSE CARD HANGS. `#game-region` is the engine's own fallback, and naming it explicitly
      // costs one line and removes a guess.
      pauseHost: doc.querySelector('#game-region'),
    },
    declines: {
      // ⚠️ `semAssistenteDePad` RETIRED IN 11.0.0 (ADR-0231, note CQ). The field had no reader on the engine
      //    side for several releases; the decline is gone from the type entirely, so this game simply says
      //    nothing about it. The absence of a pad assistant comes from `GamepadCtx` not being hand-built
      //    (we go through `createGame`), which is the whole mechanism.
      //
      // ⚠️ `noPauseActor` — RENAMED FROM `semAtorDePausa` IN 10.0.0 (note CN). The reason is unchanged: a
      //    cartridge installed in the platform shares one pause card with every other, so the actor must
      //    come from the platform rather than from any single game. The standalone has no actor to name.
      noPauseActor: true,
      // ⚠️ `noNeuralVoice` — RENAMED FROM `semVozNeural` IN 10.0.0 (note CN). The decision below (27 MB of
      //    ONNX runtime against a school tablet's precache budget) is unchanged. 📌 The matching decision
      //    on the other side — not opt in to the `uses.neuralVoice` port — stays implicit: `uses` is absent
      //    entirely here, so the engine does not load the Kokoro runtime. A test holds the pair together, so
      //    enabling one half later cannot leave the other half declaring the opposite.
      noNeuralVoice: true,
    },

    // ⚠️ NO HEAVY DOWNLOADS AT BOOT — RENAMED FROM `baixarPesados` IN 10.0.0 (note CN). This is the SAME
    //    decision as `noNeuralVoice` rather than a new one. The engine's own doc says `false` is "for whoever
    //    has a reason", and that a production game turning it off decides its child goes without the neural
    //    voice offline. This game decided exactly that on 2026-09-06, for 27 MB against a school tablet's
    //    precache budget — see the note just below.
    //
    //    ⚠️ AND MEASURED ON 2026-09-11, ON THIS BUILD: with the downloads on, booting the 2048 makes exactly
    //    one external request — `https://webgazer.cs.brown.edu/webgazer.js`, 1.9 MB — which fails by CORS on
    //    every load. That is a municipally-owned children's game reaching a third-party host it cannot even
    //    use, for the 👀 icon the bar itself labels "em construção". The engine records the same thing from
    //    the other side: ADR-0124 is the Dev choosing MediaPipe and writing «webgazer não», and ADR-0132 names
    //    the leftover `<script src>` as a debt. Until that debt is paid, the request happens; this line is
    //    what stops it happening HERE. 📏 H11 re-measures whether 11.0.0 closed it.
    //
    //    📌 Nothing this game uses depends on it: the voices are declined, the webcam icons are unbuilt, and
    //    the TTS the child can actually switch on is the browser's.
    downloadHeavy: false,
    // ⚠️ NO `uses.neuralVoice`, AND THAT IS A CHOICE RATHER THAN AN OVERSIGHT. The port opt-in exists in
    //    11.0.0 (ADR-0255, note DW): `uses: { neuralVoice: true }` carries Kokoro via a lazy import at the
    //    first neural utterance. Omitting it (as this file does) means the engine does not load the 371 MB
    //    runtime. The narration falls back to the BROWSER's voice, which speaks the right language.
    //
    //    What it would cost, measured in this repository on 2026-09-06 while upgrading the engine from 6.36.1
    //    to 7.0.1: `dist/` went from **28.9 MB to 1.6 MB**. The 27 MB was the ONNX runtime riding along — and
    //    pillar 1 is a school tablet, while pillar 8 is an offline PWA whose precache budget is the reason
    //    ADR-0068 §2 has the catalogue SELECT games instead of shipping them all.
    //
    //    ⚠️ AND WHAT IS LOST IS REAL, not nothing: the browser's voice may not exist offline on that tablet,
    //    and offline is exactly where this game has to work. A 2048 is playable without speech — the whole
    //    board is in `aria-label` and the system's screen reader reads it. The trade would be different in a
    //    literacy game, where speech IS the content. Here it is a BUDGET choice, written down so it can be
    //    revisited once the target hardware actually exists.
});
if (motor.problems.length) console.warn('[2048] host gaps:', motor.problems);

// 3 · THE CARTRIDGE.
const jogo = cartridge.create({
  engine: motor,
  region: regiao,
  // ⚠️ ONE STREAM PER CARTRIDGE, and the SHELL chooses the seed (ADR-0141 §1). The game never imports
  //    `rnd`, `randInt`, `shuffle` or `reseed` — a source gate holds that, because a standalone build has one
  //    stream and would pass either way.
  rng: createRng(Date.now() & 0x7fffffff),
  // The engine's own `t` reaches the cartridge through `engine.t`; the ctx member mirrors it for games that
  // prefer the short name, and the `GameCtx` type says so.
  t: motor.t,
  // This game reads nothing from the address; the door exists so nobody reaches past it to `location.search`.
  params: new URLSearchParams(),
});
motor.mount(jogo.declaration, jogo.hooks);

// A `(key) → string | null` reader, the shape `wordsOf` and the engine's own `labellerFrom` ask for. The
// Engine exposes `t` (which returns the key when missing) and not `word` directly, so we read fallback-to-key
// as «unknown», which is what the labeller then drops. Our dictionaries declare every key the preset reads,
// so this helper only exists for safety's sake — a mismatch would surface as a mute row in the remap panel.
const word = (chave: string): string | null => {
  const palavra = motor.t(chave);
  return palavra === chave ? null : palavra;
};

// ⚠️ ONE STORE PER ROOT (ADR-0232 D4, note CT). `platform/storage` is a factory now — the page-wide `get`/
// `set` / `getJSON` members are gone, and the engine's root builds one from `host.storage` (the window's
// `localStorage` by default). The shell builds its own on top of the same backend, so stored motion flags
// and font choices are the same object either way. `TypoStore` is a narrow `{get, set}` view of this.
const store = createStorage(window.localStorage);


// ============================ THE SHELL RUNS THE LOOP ============================
// ⚠️ ONE LOOP, AND IT IS THIS FILE'S. ADR-0139 §3 puts it here rather than in the game: "six cartridges
// each opening their own frame callback is six loops competing for one frame". `boot/main.ts` no longer asks
// for a frame at all — it exposes `update(dt)` and the Pixi application is `autoStart: false`.
//
// 📌 `dt` IS IN FRAMES, never seconds, which is the inherited convention the cartridge brief says breaks
// most often. One frame at sixty is `MS_POR_QUADRO`, and dividing by it is the whole conversion.
//
// 📌 `maxDt` CAPS A RETURNING TAB. A pane that spent a minute hidden hands back an enormous delta; without
// the cap the animator would be told a whole minute passed in one tick. Four frames is two visible frames of
// slack and nothing a child can perceive.
const MAX_DT = 4;
let anterior = performance.now();
let vivo = true;
const tick = (agora: number) => {
  if (!vivo) return;
  const dt = Math.min((agora - anterior) / MS_POR_QUADRO, MAX_DT);
  anterior = agora;
  // ⚠️ THE ERROR BOUNDARY IS SPEC D16: "one broken game must stay distinguishable from a broken engine".
  //    A cartridge that throws stops ITSELF — it does not take the loop, and it says so out loud rather than
  //    leaving a child in front of a board that quietly stopped moving.
  try {
    jogo.update(dt);
  } catch (e) {
    vivo = false;
    motor.alert(motor.t('a11y.instructions'));
    console.error('[2048] the game stopped itself:', e);
    return;
  }
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
// TYPOGRAPHY — borrowed whole. The quiz measured that this panel serves outside its genre without a line of
// change, and it is the strongest evidence that the menu stack belongs to the engine rather than to the
// platformer.
const typo = initSettingsTypo({ $, srSay: motor.say, store, root: document.documentElement, t: motor.t });
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
  t: motor.t,
  srSay: motor.say,
  srAlert: motor.alert,
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
  // 🔴 `saveKB` IS STILL WRAPPED. The engine's `p3`/`p4` factory schemes carry `null` for positions a seat
  //    cannot reach; saving them unwrapped used to lock the child out on the next boot (`migrarEsquema`
  //    threw on `[...null]`). H11 is where we check whether 11.0.0 fixed that; until then, the wrap stays.
  //    The method we wrap is `motor.keyboardConfig.save` instead of the free `saveKB` — the module function
  //    now takes a store first, which this panel does not have, and `.save()` is the engine's own door.
  store: {
    saveKB: (esquema) => motor.keyboardConfig.save(semNulos(esquema)),
    resetKB: () => motor.keyboardConfig.reset(),
  },
  // The rows are this game's preset read back through the engine's own labeller, so the screen cannot name
  // an action the game does not read. See `acoesComRotulo`.
  gameActions: () => acoesComRotulo(word),
  // The live keyboard config — the engine's own since 11.0.0 (note DA). Mutated in place by successful
  // remaps; `set` replaces it wholesale, which is what Reset needs.
  kb: motor.keyboardConfig.kb(),
  setKB: motor.keyboardConfig.set,
  kbFor: (i) => motor.keyboard.kbFor(i),
  // ⚠️ `factoryWithGame()` without args returns the engine's factory WITH this game's `keyboardMapping`
  //    already folded in. The 10.0.0 rename (note DA) moved it to a method on `Engine.keyboardConfig`; the
  //    module-level function is still exported with a required `mapping` arg, but the panel's "right
  //    default" is the GAME's factory, which only the engine knows.
  defaultSchemeFor: (_i) => motor.keyboardConfig.factoryWithGame().solo,
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

// ⚠️ ESCAPE HAS TO BE ROUTED BY US TOO, and it is the SAME wall as the captured key above rather than a new
//    one: `overlays.escapeTarget()` is walked by the engine's `input/keydown`, and `createGame` never installs
//    that router for a consumer. 📏 Measured 2026-09-12, opening each panel in turn on the shipped build:
//    Escape closed NONE of the three. So `inEscapeChain: true` — which every one of them passes to `register`
//    — was a true declaration into a chain nobody walked, and this repository does not keep claims like that.
//
//    It was never a keyboard trap (WCAG 2.1.2): each card's «Fechar» is reachable by Tab, which is why the
//    axe gate had nothing to say. It was the cost of leaving: a child who opens a panel by accident had to
//    find a button instead of pressing the key every dialog on the web answers to.
//
// 📌 THE ORDER IS THE ENGINE'S AND NOT OURS. `escapeTarget()` walks the REGISTRATION order and returns the
//    first dialog that is in the chain and actually visible — its own note says this is deliberately NOT
//    "the top one". The shell routes the key and declines to decide which panel wins.
const aoEscapar = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  // A child mid-rebind is being asked «press a key»; Escape belongs to that flow, and `aoCapturar` has
  // already seen it in the capture phase. Closing the panel underneath would answer the wrong question.
  if (ctrl.isCapturing()) return;
  const aberto = motor.overlays.escapeTarget();
  if (!aberto) return;
  motor.overlays.closeById(aberto);
  // The documented pair of `frontOverlay`: the focus goes back to the button that opened the card, instead
  // of to the top of the document. Without it, closing with the keyboard loses the child's place.
  motor.overlays.restoreFocus(aberto);
  e.preventDefault();
};
document.addEventListener('keydown', aoEscapar);

// HIGH CONTRAST BY ROLE. It belongs to this game, not to the engine — the quiz's finding 8: the engine's
// `hcnew` modes repaint the platformer's tile textures, and this game does not have its tiles. What travels
// is the IDEA (paint by field 2 of the contract), and it lives in `render/palette`.
const hc = $<HTMLButtonElement>('#toggle-hc');
hc?.addEventListener('click', () => {
  const ligado = document.documentElement.dataset.hc === '1';
  document.documentElement.dataset.hc = ligado ? '0' : '1';
  hc.setAttribute('aria-pressed', String(!ligado));
  motor.scenes.draw();
  motor.say(hc.textContent ?? '');
});

// COLOUR VISION. The six SVG filters were already installed into `#cvd` by `createGame`; what lives here is
// the CHOOSER, and since 2026-09-11 it is four visible rows instead of a `<select>`.
//
// ⚠️ THE SHAPE WAS THE DEFECT, and the engine had already written it down. `ui/visual-axes-panel`: "it keeps
// the VISIBLE-ROW form, not a `<select>` — inside a closed box, a control whose reason to exist is to be
// FOUND by someone who sees poorly is almost the same as not having moved it."
//
// The rows come from the engine's `axisRows`, so the control looks and reads the same here as in every
// other game: same `.ctrl-row`, same `role="radio"`, same "Escolhido"/"Escolher" wording from the shared
// dictionary. The only thing this game supplies is the WRITER — `render/viz-setters` is the engine's own,
// and its context asks for ~34 fields of a PixiJS platformer render graph this game does not have.
const caixaViz = $<HTMLElement>('#p2-viz');
const alvo = $<HTMLElement>('#game-region');
const abrirViz = $<HTMLButtonElement>('#open-viz');
if (caixaViz && alvo && motor.cvdFilters > 0) {
  let atual: Correction = 'tricro';

  const pintar = () => {
    // ⚠️ `innerHTML` FROM A PURE ENGINE BUILDER, and the string is not user text: `axisRows` interpolates
    // only i18n values and the axis' own literals. The old `<select>` was built with `new Option` to close
    // the injection class pre-emptively; here the equivalent guarantee is that nothing outside the engine's
    // dictionary reaches the template, and `ehCorrecao` guards the way back in.
    caixaViz.innerHTML = axisRows('correcao', CORRECOES_OFERECIDAS, CORRECTION_LABEL, atual, motor.t);
  };

  pintar();

  // DELEGATED, so the handler survives every repaint. Re-binding per row would leak a listener each time.
  caixaViz.addEventListener('click', (e) => {
    const botao = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-eixo][data-valor]');
    if (!botao) return;
    const escolha = buttonChoice(botao.dataset);
    // Two guards, and neither is ceremony: the first is the engine's (is this a row of a known axis?), the
    // second is ours (is this a correction this game offers?). `data-valor` is an attribute, and an
    // attribute is a string anyone can write — `blind` is a real engine value and must never get through.
    if (!escolha || escolha.axis !== 'correcao' || !ehCorrecao(escolha.value)) return;
    atual = escolha.value;
    alvo.style.filter = filtroCssDe(atual);
    pintar();
    // The label, not the state word: "Escolhido" alone would tell a screen reader that something was
    // chosen without saying what. `aria-checked` already carries the state; the announcement carries the name.
    motor.say(motor.t(CORRECTION_LABEL[atual]));
  });

  // THE DOOR. Same three lines as `#open-typo` and `#open-ctrl`, and the sameness is the point: three panels
  // that open the same way are one thing to learn instead of three.
  abrirViz?.addEventListener('click', () => {
    const ov = $<HTMLElement>('#viz');
    if (!ov) return;
    ov.hidden = false;
    motor.overlays.frontOverlay(ov);
    // The CHOSEN row, not the first — a child who opens this panel a second time lands on what they picked,
    // and a screen reader reads the current state instead of the top of a list.
    (ov.querySelector<HTMLElement>('[aria-checked="true"]') ??
      ov.querySelector<HTMLElement>('button:not([disabled])'))?.focus();
  });
  const fecharViz = () => { const ov = $<HTMLElement>('#viz'); if (ov) ov.hidden = true; };
  $('#viz-close')?.addEventListener('click', fecharViz);
  motor.overlays.register('viz', { close: fecharViz, inEscapeChain: true });
} else if (abrirViz) {
  // ⚠️ NO FILTERS MEANS NO PANEL, AND THEREFORE NO BUTTON. `cvdFilters` is 0 when the engine could not mount
  //    the SVG colour matrices, and the card would open on an empty radiogroup — a control that answers
  //    nothing is worse than an absent one, because the child spends a press finding that out. The old
  //    always-open section had this defect too: it showed a heading over four rows that were never painted.
  abrirViz.hidden = true;
}

// TOUCH: the PURE half of `input/touch`. `padPxPerMm` anchors the real millimetre to the device (WCAG 2.5.5),
// and the four buttons get 11 mm MEASURED instead of a guess in pixels. The whole `initTouch` is deliberately
// left out: its pad is a platformer d-pad with twelve fixed ids this game does not want.
const pxmm = padPxPerMm(matchMedia('(pointer: coarse)').matches, window.innerWidth, window.innerHeight);
document.documentElement.style.setProperty('--alvo-toque', (11 * pxmm).toFixed(1) + 'px');
