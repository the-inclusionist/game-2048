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
// `GameDeclaration` once imported here for the local placeholder; the cartridge owns the shape now (H9).

import { cartridge } from './index.ts';
import { MS_POR_QUADRO } from '../app/js/animation.ts';
import { montarRecolhimentoDaBarra } from '../app/js/ui/a11y-bar-retract.ts';

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
// 🔴 AND THE RECORD'S OWN ANSWER DOES NOT BOOT ON 11.0.0 either. §5 prescribes "a declaration whose members
//    forward to the mounted cartridge" — measured on 2026-09-11 and still true on 2026-10-02: a delegate
//    that answers `undefined` for all ten fields is refused outright, not reported into `problems`.
//
// 📌 THE PLACEHOLDER LIVES ON THE CARTRIDGE SINCE H9 (ADR-0253 note DV): `cartridge.declaration` is the
//    honest «there is no game yet» value, read at import time by `inclusionist-check-cartridge` and by this
//    `createGame` call. `motor.mount(instance.declaration)` replaces it the instant the cartridge exists.
const motor = createGame({
  declaration: cartridge.declaration,
  // The hooks are the game-owned half of CreateGameOptions minus `declaration`: `preset`, `accommodations`,
  // `dictionaries`, `isNavigable`. Spreading keeps `createGame` honest about what the game is passing.
  ...cartridge.hooks,
    host: {
      doc,
      win,
      cvdHost: doc.querySelector('#cvd'),
      // 🔴 NO `a11yBarHost`, AND THE ABSENCE IS THE DECISION (Part Five, E2 — 2026-10-03). Without it the
      //    engine looks for its own `A11Y_BAR_SELECTOR = '#title-icons'` (`boot/create-game.js:231`, read at
      //    `:577`), and `app/index.html` now carries exactly that id, inside `#game-region`.
      //
      //    The line used to read `a11yBarHost: doc.querySelector('#p2-a11y')`, with a host element of our own
      //    under `<main>`, and the reason given was that inside the region "everything scales by the integer
      //    `k` of ADR-0001 … these controls are chrome". The premise was simply false: nothing scales
      //    `#game-region`'s children by transform — `ui/layout` writes `width`/`height` on the region and
      //    publishes `--ui-fs`, `--tap` and `--alvo-min` ON IT. Being inside is what puts those rulers in
      //    scope, so the bar's buttons grow with the board instead of sitting at a literal 44 px while it
      //    grows past them.
      //
      //    ⚠️ AND THE HOST OPTION IS NOT A MISTAKE IN THE ENGINE — it is for a game whose first screen is
      //    somewhere else entirely. Reaching for it to escape a CSS rule we had misread is what produced the
      //    bar at the bottom of the page, the 375 px reservation nobody read, and the caption that pushed
      //    icons out from under the pointer. The whole of Part Five is that one habit.
      //
      //    📌 It is still the ENGINE that mounts and wires the bar, which is the point of the measurement
      //    behind ADR-0148: five of six games in the catalogue had no accessibility bar at all, because
      //    `initPauseIcons` had to be called by each game's composition root and five roots never remembered.
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
    //    ✅ WEBGAZER LEFT IN 11.0.0 (ADR-0214), measured 2026-10-02: `node_modules/@the-inclusionist/engine/
    //    dist-pkg` carries ONE mention of «webgazer» and it is a historical sentence inside a comment
    //    (`platform/heavy-catalogue.js:14`). The engine no longer reaches `webgazer.cs.brown.edu` at all —
    //    the vision runtime is MediaPipe (ADR-0124) and the 👀 icon's labelled «em construção» means
    //    exactly that: unbuilt, not reaching anywhere. So the webgazer half of the reasoning this flag used
    //    to carry is CLOSED by the engine itself, and the only reason left for `downloadHeavy: false` is
    //    the ONE just above — 27 MB of ONNX runtime against a school tablet's precache budget.
    //
    //    📏 PART-TWO FINDING, PRESERVED AS HISTORY. Measured on 2026-09-11 against 9.0.0: with the
    //    downloads on, booting the 2048 made exactly one external request — `https://webgazer.cs.brown.edu/
    //    webgazer.js`, 1.9 MB — which failed by CORS on every load. ADR-0132 named the leftover `<script
    //    src>` as a debt; ADR-0214 paid it.
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
// ⚠️ THE TYPOGRAPHY PANEL, THE KEYBOARD-REMAP PANEL AND THE COLOUR-VISION CHOOSER USED TO LIVE HERE.
//    All three are gone as of 2026-10-03 (Part Five, E1), because engine 11.0.0 mounts every one of them
//    itself and the duplicates were reaching the child as two of the same control:
//
//      · 🔤 typography — the engine calls `initSettingsTypo` at `boot/create-game.js:1134`, and mounts
//        the 🔤 icon in the bar.
//      · ⌨ key remapping — the engine calls `initSettingsControls` at `boot/create-game.js:2973`.
//        📌 G2 measured «NOTHING in the engine opens ui/settings-controls» against engine 8, and that
//        stayed in this file as a live claim for three weeks after 11.0.0 made it false.
//      · 🚥 colour vision — the engine mounts the icon, and it was MEASURED cycling correctly on the live
//        deploy (desligado → protanopia → deuteranopia → tritanopia → desligado). G1 predicted it would
//        stick after one click because `players` is typed without `visual`; the type is still that way and
//        the icon works anyway. 🔴 Reading a type is not measuring a behaviour.
//
//    The `semNulos` wrap went with the remap panel: the engine owns the panel, so it owns the save. The
//    engine's own null-spread defect in `migrateScheme` is unchanged and still reported — but it is no
//    longer this game's to work around, because this game no longer writes that store.

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


// THE BAR FOLDS AWAY AFTER FIVE SECONDS WITH NOBODY REACHING FOR IT (the Dev, 2026-10-03), and comes back
// when a pointer heads for the top band, when a finger lands there, or when focus enters it. Never while one
// of the engine's menus is open.
//
// ⚠️ THE SHELL WIRES IT AND THE CARTRIDGE DOES NOT, and the reason is the bar's owner: `createGame` mounts it
//    before `cartridge.create` is called and `jogo.teardown()` must leave it standing — a cartridge taking it
//    over would be a cartridge reaching past its own `region` for something it did not build (ADR-0139 §4).
//
// 📌 AND THIS IS THE ENGINE'S JOB, written down in `app/js/ui/a11y-bar-retract.ts` rather than acted on: every
//    game in the catalogue has the same twelve icons over the same top band, so one copy in the engine serves
//    all of them and twelve copies in twelve games is the `initPauseIcons` mistake ADR-0148 exists to end.
//    Writing to `the-inclusionist-engine` needs the Dev's authorisation; this change does not have it. The
//    module reaches into nothing — it takes its nodes and its clock — so moving it there is a copy of one file.
const barraA11y = $<HTMLElement>('#title-icons');
if (barraA11y) montarRecolhimentoDaBarra({ barra: barraA11y, regiao, doc, win });

// 🔴 THE SHELL NO LONGER TOUCHES INPUT AT ALL, and the three lines that stood here are why this note exists.
//    They called `padPxPerMm` and wrote `--alvo-toque` onto `:root` so that four hand-built `[data-dir]`
//    buttons could be 11 mm across. The comment that justified them said «the whole `initTouch` is
//    deliberately left out: its pad is a platformer d-pad with twelve fixed ids this game does not want».
//
//    📏 THAT PREMISE WAS NOT RE-MEASURED EITHER. `initTouch` builds its pad from the cartridge's OWN
//    `preset` — this game names five positions and gets five — and `onScreenPad` (ADR-0166) is the switch
//    that asks for it. The twelve fixed ids were the platformer's preset, not the engine's.
//
//    What the hand-built pad could not do is the part that mattered: it called `jogar()` directly, so it
//    never pressed `engine.controller`, never carried a `source` (ADR-0109), was never offered to the
//    one-button scan (ADR-0218 §4) and never asked `press()` whether a menu had taken the press (ADR-0223).
//    The cartridge asks for the engine's pad in `boot/main.ts`'s hooks now, and this file has nothing to say
//    about control.
