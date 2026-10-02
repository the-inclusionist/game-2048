// SPDX-License-Identifier: AGPL-3.0-or-later
// THE BOOT — the order in which things are switched on, and almost nothing else.
//
// ========================= ONE CALL, NOT NINE =========================
// `createGame()` wires up language, screen reader, mixer, voice, dialog stack, colour-vision filters,
// remappable keyboard, menu navigation, sonar and the scene stack. The `consumer-quiz` wrote those nine
// initialisations by hand and measured the price: one of them has a mandatory ORDER that no type declares (the
// mixer before the voice), and getting it wrong makes the narration give up SILENTLY. Here the caller has no
// way to invert them.
//
// ========================= WHAT THIS FILE DOES THAT IS THIS GAME'S =========================
// The round's state, the PixiJS surface, the DOM grid over it, and the mapping from key to move. That is all.
// Announcements go through `motor.say`/`motor.alert` since engine 11.0.0 (note CY). `core/a11y-sr`'s
// module-level `srSay`/`srAlert` are gone: the root owns the one announcer, every engine module receives
// it, and a second one would write to the same regions and carry none of this root's Libras mirror.
import { createRng, type Rng } from '@the-inclusionist/engine/core/rng.js';
import { createLayout } from '@the-inclusionist/engine/ui/layout.js';
import { readStoredScene } from '@the-inclusionist/engine/ui/motion-scene.js';
import { createStorage } from '@the-inclusionist/engine/platform/storage.js';
import * as PIXI from 'pixi.js';

import {
  OBJETIVO, SIZE, canMove, emptyBoard, maxTile, slide, spawn,
  type Board, type Direction, type Movimento,
} from '../board.ts';
import {
  criarAnimador, criarRelogioDeQuadros, duracaoDaJogada, pecasParadas, querMenosMovimento, type Peca,
} from '../animation.ts';
import { criarPreset, direcaoDe, ehAtalhoDoSistema, ehSonar } from '../actions.ts';
import type { GameCtx, GameInstance } from '../cartridge-types.ts';
import { criarDeclaracao, RESPOSTAS_DAS_ACOMODACOES } from '../declaration.ts';
import { narrarJogada, narrarSemMovimento } from '../narration.ts';
import { LOGICAL_H, LOGICAL_W } from '../geometry.ts';
import { pintarTabuleiro } from '../render/board-canvas.ts';
import { FUNDO_DA_TELA } from '../render/palette.ts';
import { criarGradeDom } from '../ui/board-dom.ts';
import { criarCamadaDePecas } from '../ui/tiles-layer.ts';

/**
 * Has the child asked for less motion? Then no animation — not a faster one.
 *
 * TWO PLACES CAN ASK, and until 2026-09-11 this game listened to only one.
 *
 * · the SYSTEM (`prefers-reduced-motion`) — whoever needs this has already configured it on the device, and
 *   making them find an option inside each game hands them work the browser has already done (WCAG 2.3.3).
 *   It is also why this game still adds no switch of its own.
 * · the ENGINE's 🧩 TEA/calm icon, which since 8.0.0 sits in this game's own accessibility bar. It writes
 *   `reducedMotion` for every scene key at once, from one level.
 *
 * 🔴 THE SECOND WAS BEING IGNORED, measured in the browser: the click wrote
 * `{"parallax":true,"decor":true,"items":true,"particles":true}` and the tiles went on sliding. The icon was
 * half a dead control — audio obeyed, motion did not — which is what ADR-0106 §5 forbids.
 *
 * 📌 ASKED FRESH EACH MOVE, never cached: `ui/motion-scene` warns that its flags object is shared by
 * reference and that holding a copy makes the switch stop working in silence. Reading per move is the other
 * side of that warning — the child flips the icon mid-game and the next move already obeys.
 */
// `readStoredScene(store, reducedByDefault)` since engine 11.0.0 (notes CS, CT, D4): the module no longer
// reads a module-level store, and `platform/storage` is a factory now. Our Store is built once from the
// window's localStorage — the same backend the engine's root uses, so the two agree on the stored flags.
const movimentoReduzido = (win: Window, store: ReturnType<typeof createStorage>): boolean => {
  const sistema = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  return querMenosMovimento(sistema, readStoredScene(store, sistema));
};

/* ===================== THE ROUND'S STATE =====================
 *
 * ⚠️ EVERYTHING HERE DIES WITH THE ROUND, and that is ADR-0037 in code rather than in prose: there is no save,
 * and the Inclusionist keeps nothing about a child. No `localStorage`, no best score, no "continue where you
 * left off" — the absence is the decision. The 2048 forks keep the best score; this one cannot.
 */

const RUMO: Record<Direction, 'n' | 'e' | 's' | 'w'> = { left: 'w', right: 'e', up: 'n', down: 's' };

/**
 * THIS GAME'S OWN RANDOM STREAM, and owning it is the whole of ADR-0141.
 *
 * ⚠️ IT USED TO BE THE ENGINE'S SHARED ONE. `core/rng` exports `rnd`, `randInt`, `shuffle` and `reseed`, all
 * bound to a single module-level stream created at import — and the import is one word shorter than the
 * correct one. In a standalone build that is harmless: one game, one stream. Inside the platform of ADR-0117
 * two cartridges importing `rnd` draw from the SAME stream, so each one's draws depend on how much the other
 * drew, and a `reseed(s)` in one repositions the other's underneath it.
 *
 * 📌 The engine solved this before anyone needed it. `createRng`'s own documentation says of the stream it
 * returns: «Reposiciona ESTA corrente. Não alcança nenhuma outra.» The defect was never in the engine.
 *
 * 📌 AND THE SEED IS CHOSEN ONCE, not per round. When this repository becomes a cartridge the shell hands
 * the stream in through `ctx.rng` (ADR-0139 §4) and choosing the seed becomes its job; until then the boot
 * picks one. Either way nothing calls `reseed` again — see `novaRodada`.
 */
export function criarJogo(ctx: GameCtx): GameInstance {
  const motor = ctx.engine;
  const região = ctx.region;
  const doc = região.ownerDocument;
  const win = doc.defaultView ?? window;
  // The announcers and the translator come off the engine since 11.0.0 — `core/a11y-sr` and `core/i18n` no
  // longer carry module-level state. The two short names are kept for readability where this file calls them.
  const t = motor.t;
  const srSay = (text: string) => motor.say(text);
  const srAlert = (text: string) => motor.alert(text);
  // The persistence port, since engine 11.0.0 (note CT): `platform/storage` is a factory now, and the Store
  // owns `get`/`set`/`getJSON`/… instead of exporting them. Read against the window's `localStorage` — the
  // same backend the engine's root is reading from, so stored motion-scene flags are the same object either
  // way, and the TypoStore the shell builds on this is just a `{get, set}` view of it.
  const store = createStorage(win.localStorage);
  // Tracks whether this instance was torn down — read by `desenhar()` (and the locale-change hook that calls
  // it) because `motor.onLocaleChange` returns no release, so the handler has to answer for itself.
  let desmontado = false;

  /* ===================== THE ROUND'S STATE, OWNED BY THIS INSTANCE =====================
   *
   * ⚠️ IT LIVED AT MODULE SCOPE UNTIL 2026-09-11, which is the defect spec D14 names and the cartridge brief
   * calls one of the two that "break silently": state at module scope survives `teardown()` and leaks into the
   * next game on the same page. It is also the engine's own user story — «I want the engine to carry no game
   * state, so that two games on one page do not collide» — read from the game's side.
   *
   * ⚠️ AND EVERYTHING HERE STILL DIES WITH THE ROUND, which is ADR-0037 unchanged: no save, no best score, no
   * "continue where you left off". What moved is WHERE it lives, not how long it lasts.
   */
  let board: Board = emptyBoard();
  let pontos = 0;
  let heading: 'n' | 'e' | 's' | 'w' | 'none' = 'none';
  let acabou = false;

  let rng: Rng = createRng(Date.now() & 0x7fffffff);

  /**
   * The round's draw.
   *
   * ⚠️ IT NO LONGER RESEEDS, and the absence is the decision. It used to call `reseed(Date.now())` on every
   * round, which on the shared stream repositioned whatever else was drawing from it. A new round simply
   * CONTINUES this game's own stream, which is exactly as random and reaches nothing else. Reproducibility, when
   * somebody wants it, comes from the seed the shell chose — which is where ADR-0141 §1 puts it.
   */
  function novaRodada(): void {
    board = emptyBoard();
    pontos = 0;
    heading = 'none';
    acabou = false;
    for (let i = 0; i < 2; i++) board = spawn(board, rng.rnd)?.board ?? board;
  }

  // 📌 NO `registrarIdiomas()` HERE ANY MORE. A cartridge never registers its own dictionaries: it EXPORTS
  //    them (`Cartridge.dicts`) and whichever shell loaded it registers them, once, before any text. Two
  //    cartridges each registering would be two writes to one table in an order nobody controls.

  novaRodada();

  const grade = criarGradeDom(doc);
  const camadaDePecas = criarCamadaDePecas(doc);

  // 2. THE DECLARATION. It OBSERVES the state; it does not own it. See the header of `declaration.ts`.
  const declaration = criarDeclaracao({
    board: () => board,
    cursor: () => ({ x: grade.cursor() % 4, y: Math.floor(grade.cursor() / 4) }),
    heading: () => heading,
    t,
  });

  // 3. THE ENGINE, RECEIVED RATHER THAN CREATED.
  //
  // ⚠️ THIS FILE CALLED `createGame` UNTIL 2026-09-11, and ADR-0139 §2 is the clause the whole contract
  //    hangs from: a cartridge NEVER calls it. It mounts an accessibility bar, a pause card, six colour-vision
  //    filters, the TTS, the sonar, the settings panel, the menu navigation and the keyboard runtime — so N
  //    cartridges calling it inside one platform would deduplicate the BYTES and multiply the RUNTIME. That
  //    failure appears as broken behaviour rather than as weight, which is the kind found late.
  //
  // 📌 The half of the options that is THIS GAME'S — `preset`, `isNavigable` — moved to `hooks` in
  //    `src/index.ts`. The half that describes the PAGE — `host`, `declines`, `baixarPesados` — moved to the
  //    shell, `src/standalone.ts`, with its reasoning intact. The split is read off `CreateGameOptions` by
  //    asking whether a page could answer the field without knowing which game is running.
  if (motor.problems.length) console.warn('[2048] host gaps:', motor.problems);

  // 4. THE CANVAS, under the numbers and HIDDEN FROM THE ACCESSIBILITY TREE. It is the illustration; the real
  //    board is the DOM grid (pillar 2). Without `aria-hidden`, the screen reader would announce an image.
  // ⚠️ `autoStart: false` SINCE 2026-09-11, and it is the frame loop leaving this file. A `PIXI.Application`
  //    starts a shared ticker of its own by default — a second loop beside the animator's, owned by the game.
  //    ADR-0139 §3: "six cartridges each opening their own frame callback is six loops competing for one
  //    frame". The host ticks `update(dt)` and this file renders there, once, on the tick it was given.
  const pixi = new PIXI.Application({
    width: LOGICAL_W, height: LOGICAL_H, backgroundColor: FUNDO_DA_TELA,
    antialias: false, resolution: 1, powerPreference: 'low-power',
    autoStart: false,
  });
  const tela = pixi.view as HTMLCanvasElement;
  tela.id = 'p2-canvas';
  tela.setAttribute('aria-hidden', 'true');
  // ⚠️ THE CANVAS GOES FIRST IN THE DOM, which puts it BEHIND everything on screen. `append` used to place it
  //    after the HUD and the touch targets — and since all of them are positioned, it PAINTED OVER THEM: the
  //    objective and score column simply disappeared. Nobody notices that reading the code, and no assertion
  //    noticed either: the HUD was still in the DOM, with the right text, covered by a painting surface.
  região.prepend(tela);
  região.append(camadaDePecas.raiz, grade.raiz);
  const figura = new PIXI.Graphics();
  pixi.stage.addChild(figura);

  // 5. SCALE. The engine's `ui/layout` locks `#game-region` to an INTEGER multiple of 320×180 in real pixels
  //    (ADR-0001) and publishes `--ui-fs = 8·k`. The stylesheet derives `--px` from it, and that is what keeps
  //    the DOM number exactly on top of the painted square at any device pixel ratio.
  // `createLayout` since engine 11.0.0 (note DD): the previous module-level `initLayout` / `layout` are gone;
  // the new factory takes `doc`/`win`/`numPlayers` through its ctx and returns a `{layout(): void}` scaler.
  // `afterScale` re-anchors the engine root's CRT scanlines to the real-pixel scale (REQUIRED).
  const stage = createLayout({ doc, win, numPlayers: () => 1, afterScale: () => motor.crt.scanVars() });
  stage.layout();
  const aoRedimensionar = () => stage.layout();
  win.addEventListener('resize', aoRedimensionar);

  // ⚠️ BECOMING VISIBLE AGAIN RECONCILES THE SCREEN WITH THE MODEL. While the document is hidden nothing is
  // animated (see `podeAnimar`), and the rescue guarantees the final frame arrives — but a tab that spent
  // minutes hidden may have lost frames for other reasons. Redrawing on return is cheap and closes the whole
  // category: whatever the reason the screen fell behind, it catches up on the way back.
  const aoVoltarAVer = () => { if (doc.visibilityState === 'visible') desenhar(); };
  doc.addEventListener('visibilitychange', aoVoltarAVer);

  const altoContraste = () => doc.documentElement.dataset.hc === '1';
  const papelDa = (i: number) => declaration.roleAt({ x: i % SIZE, y: Math.floor(i / SIZE) });

  /**
   * ONE FRAME — both layers painted from the SAME tiles.
   *
   * ⚠️ It is the only function that draws, and that is why the layers cannot come apart. The canvas receives
   * the positions and the DOM receives the same positions, in the same call. If each had its own animation —
   * one in `requestAnimationFrame`, the other in a CSS transition — they would run on different clocks and the
   * number would come unstuck from its tile mid-motion. Seeing them unstuck while STANDING STILL already cost
   * an afternoon.
   */
  function quadro(pecas: readonly Peca[]): void {
    pintarTabuleiro(figura, { papel: papelDa, altoContraste: altoContraste(), pecas });
    camadaDePecas.desenhar(pecas, altoContraste(), papelDa);
  }

  /** The board AT REST: what is seen between moves, and the final frame of every animation. */
  function desenhar(): void {
    if (desmontado) return;
    quadro(pecasParadas(board));
    grade.atualizar(declaration, t);
    const o = declaration.objectiveOf(0);
    const hud = doc.querySelector<HTMLElement>('#p2-doubles');
    if (hud) hud.textContent = t('move.doubles', { have: o.have, need: o.need });
    const placar = doc.querySelector<HTMLElement>('#p2-score');
    if (placar) placar.textContent = String(pontos);
  }

  // 🔴 LABELS DO NOT RETRANSLATE ON THEIR OWN. The grid cells, the mission line, the score — every surface
  //    this file writes carries RESOLVED words set at build time (`aria-label="Linha 1, coluna 1: vazio"`),
  //    not `data-i18n` keys the engine would re-walk on language change. The H2 gate in
  //    `tests/factory.browser.test.ts` caught this: `motor.setLocale('en')` loaded the new dictionary and
  //    the labels stayed Portuguese. The engine's `onLocaleChange` hook is the hand-off we need; `desenhar()`
  //    re-reads `t` and rebuilds every label. The guard above makes it safe to arrive after teardown.
  motor.onLocaleChange(() => desenhar());

  /**
   * THE LOOP, assembled — and it no longer lives here.
   *
   * ⚠️ It did, and it was untestable: the browser's frame clock does not run in a hidden pane, and trying to
   * observe it live returned zero frames three times in a row. The loop was not wrong; the environment would
   * not let it run. Depending on the eye to know whether CANCELLATION and the RESCUE work is exactly the gate
   * that could never go red.
   *
   * It moved to `animation.ts` with the clock INJECTED — the same discipline the engine's `core/rng` already
   * uses for randomness. What is left here are the three things that are this game's: which clock (the real
   * one), what to draw each frame (both layers together), and how long (zero, under reduced motion).
   */
  // ⚠️ THE CLOCK IS THE HOST'S TICK, not `requestAnimationFrame`. `relogioDoNavegador` still exists and is
  //    still right for a game that owns its loop; this one is driven by `update(dt)`, so the animation runs
  //    on the frame the shell already had instead of asking for one of its own. The animator does not change
  //    by a line — it took its clock injected from the day a hidden pane froze `rAF` and the gate could
  //    never be made red. That seam is what makes this a swap rather than a rewrite.
  const relogio = criarRelogioDeQuadros();
  const animador = criarAnimador(relogio.relogio, quadro);
  const animar = (movimentos: readonly Movimento[]): Promise<void> =>
    animador.correr(movimentos, duracaoDaJogada(movimentoReduzido(win, store)), doc.visibilityState !== 'hidden');

  /** A whole move: push, count, draw a tile, announce, redraw. */
  function jogar(dir: Direction): void {
    if (acabou) return;
    const r = slide(board, dir);
    if (!r.moved) {
      // A POLITE announcement (`srSay`) rather than an alert: "nothing moves" answers an attempt, it is not an
      // event that should interrupt whatever the child is listening to.
      srSay(narrarSemMovimento(dir, t));
      return;
    }

    // ⚠️ THE STATE CHANGES NOW, AND THE ANIMATION IS ONLY THE ILLUSTRATION OF IT. The model is already the next
    // board before the first frame — the animation draws the past on its way to the present, never the other
    // way round.
    //
    // The order matters for whoever does NOT see the animation: the screen reader, the test, and the child
    // playing with reduced motion get the result immediately, without waiting 110 ms of decoration. If the
    // state waited for the animation to finish, the game would lie for a tenth of a second on every move — and
    // lie longer the slower the device, which is pillar 1 upside down.
    board = r.board;
    pontos += r.gained;
    heading = RUMO[dir];

    const nascida = spawn(board, rng.rnd);
    if (nascida) board = nascida.board;

    // The animation runs with the OLD board in flight; the final frame is `desenhar()`, with the new one.
    void animar(r.movimentos).then(desenhar);

    // END OF ROUND — and it ENDS. No "keep playing" past 2048 and no score chasing: that is the compulsion
    // loop ADR-0006 names, and ADR-0049 says the only celebration is growth.
    const maior = maxTile(board);
    const fim = maior >= OBJETIVO ? { chave: 'end.win' as const, maior }
      : !canMove(board) ? { chave: 'end.stuck' as const, maior }
        : null;
    acabou = fim !== null;

    // ⚠️ THE SENTENCE IS ASSEMBLED ELSEWHERE, in `narration.ts`, and the reason is in that file's header: what
    // the blind child receives is the product, and a product gets tested. What stayed here is only the CHOICE
    // OF CHANNEL, which is this file's decision: the end of a round interrupts (`srAlert`), everything else
    // waits its turn (`srSay`).
    const dito = narrarJogada({ merges: r.merges, nascida, fim }, t);
    if (acabou) srAlert(dito); else srSay(dito);
    motor.tts.narrate(dito);
  }

  // 6. KEYBOARD, THROUGH THE ENGINE'S REMAPPABLE LAYER. No raw `e.code === 'ArrowLeft'`: `actionOf` translates
  //    a key into INTENT, respects ABNT/QWERTY/alternative layouts and whatever remapping the child has made.
  //
  //    ⚠️ SHIFT CHANGES THE VERB, and this is where the APG deviation declared in `ui/board-dom` happens: an
  //    arrow on its own PLAYS, an arrow with Shift moves the READING cursor and announces where it stopped.
  região.addEventListener('keydown', (e: KeyboardEvent) => {
    // ⚠️ A CHORD IS NOT OURS. See `ehAtalhoDoSistema`: until this line, `Ctrl+S` played a move and was
    //    swallowed, because `KeyS` is `down`. Assistive technology lives on modifier chords, so taking them
    //    is taking the tool the child uses to reach the game. Shift is the exception, and it is a verb here.
    if (ehAtalhoDoSistema(e)) return;

    const action = motor.keyboard.actionOf(e.code, 0);
    const dir = direcaoDe(action);

    // THE SONAR — "where is a merge available?", asked as an ACTION and no longer as a chord.
    //
    // ⚠️ IT WAS `e.code === 'KeyS' && e.altKey` UNTIL ENGINE 8.0.0, and three things were wrong with that.
    //    The engine did not know the binding existed, so it could not be remapped and was not checked against
    //    any other binding; a layout that puts `S` elsewhere moved it silently; and the README promised "in
    //    one keystroke" while asking for two. Read through `actionOf`, it is the same path every other key in
    //    this game already took.
    //
    // ✅ AND THE CHILD CAN REACH THE SCREEN THAT WRITES ONE, since 2026-09-11: `⌨ Teclas` opens the
    //    engine's `ui/settings-controls`, mounted in `boot/boot.ts`. Measured end to end — rebinding the
    //    sonar to another key makes the old key dead and the new one fire it, and the choice persists.
    //
    // ⚠️ THIS NOTE USED TO BLAME THE WRONG THING, and the correction is worth more than the panel. It
    //    said the screen was unreachable because `CreateGameOptions` had no `getPauseActs`. 📏 Measured:
    //    remapping was never behind `getPauseActs`. The pause card's options list is `caa`, `empatia`,
    //    `audio`, `motora`, `tipo`, `visual`, `anim` — none of them is the remap panel — and NOTHING in the
    //    engine opens `ui/settings-controls`, exactly as nothing opens `ui/settings-typo`, which this game
    //    has mounted itself since the beginning. It was mountable on engine 8; nobody had mounted it.
    if (ehSonar(action)) {
      const f = declaration.focusOf(0);
      // ⚠️ NO `viz` SINCE ENGINE 8.0.0, and the field did not move — it was DELETED. `platform/audio-sonar`
      //    used to read `ctx.VIZ_BY_KEY[pl.viz]`, a table of RENDER modes consulted from inside `platform/`;
      //    issue #104 made it take the injected boolean instead, and the module got smaller rather than
      //    migrated. Checked in the published 8.0.0-rc.1 before deleting the argument: `sonar()` does not gate
      //    on vision at all — the gate is on the continuous GUIDE — so this keystroke sounds and speaks
      //    exactly as it did. Passing `viz: 'cego'` was us forcing a flag that no longer has a reader.
      if (f) motor.sonar.sonar({ i: 0, x: f.at.x, y: f.at.y });
      e.preventDefault();
      return;
    }
    if (!dir) return;
    e.preventDefault();

    if (e.shiftKey) {
      const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir] as [number, number];
      const i = grade.mover(d[0], d[1]);
      grade.focar();
      srSay(grade.raiz.querySelector<HTMLElement>(`[data-i="${i}"]`)?.getAttribute('aria-label') ?? '');
      return;
    }
    jogar(dir);
  });

  // 7. TOUCH: a swipe, and four large targets for whoever does not swipe. The buttons exist in the markup;
  //    here they only gain the intent. The engine's `padPxPerMm` already sizes them in REAL millimetres.
  let toqueX = 0, toqueY = 0;
  região.addEventListener('touchstart', (e: TouchEvent) => {
    toqueX = e.changedTouches[0].clientX; toqueY = e.changedTouches[0].clientY;
  }, { passive: true });
  região.addEventListener('touchend', (e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - toqueX;
    const dy = e.changedTouches[0].clientY - toqueY;
    if (Math.hypot(dx, dy) < 24) return; // a tap is not a swipe
    jogar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });
  for (const b of doc.querySelectorAll<HTMLButtonElement>('[data-dir]')) {
    b.addEventListener('click', () => jogar(b.dataset.dir as Direction));
  }

  doc.querySelector('#p2-again')?.addEventListener('click', () => {
    novaRodada();
    desenhar();
    grade.focar();
    srAlert(t('game.tagline'));
  });

  // 8. THE SCENE STACK. One scene, and it is not invented for the test: `desenhar` was already the `draw`.
  motor.scenes.push({ name: 'tabuleiro', draw: () => desenhar(), input: () => false });
  motor.nav.attach();
  motor.scenes.draw();
  grade.focar();
  srSay(t('a11y.instructions'));

  // The project's verification hook: checking the boot means checking this exists, and reading from it.
  // ⚠️ IT IS A GLOBAL, so `teardown` deletes it. A verification hook that outlived the instance would answer
  //    questions about a game that is no longer on the page — which is worse than not being there.
  const janela = win as Window & { __incl2048?: unknown };
  janela.__incl2048 = {
    get board() { return board; },
    get pontos() { return pontos; },
    get acabou() { return acabou; },
    jogar, novaRodada: () => { novaRodada(); desenhar(); }, declaration, motor,
  };

  return {
    // 📌 THE DECLARATION TRAVELS WITH THE INSTANCE, and `cartridge-types.ts` says why at length: it OBSERVES
    //    per-instance state, so it cannot be a module-level value without a module-level "current instance"
    //    pointer — the very thing spec D14 forbids. The shell mounts it with `engine.mount` (ADR-0142).
    declaration,

    // 📌 AND THE HOOKS TRAVEL WITH IT, for a second reason worth saying out loud since 11.0.0 (ADR-0232 D3):
    //    `preset` carries the KEYS of this game's words. The engine's root resolves them against its own
    //    `dictionaries` at every drawing, so a `setLocale` changes every row at once and the preset itself
    //    is immutable. Measured on 10.x: a preset built with a resolved `t` at boot stayed in the boot
    //    language forever — «Acima» after `setLocale('en')`. H2 moved us to keys.
    hooks: { preset: criarPreset(), isNavigable: () => true, accommodations: RESPOSTAS_DAS_ACOMODACOES },

    /**
     * ONE TICK OF THE HOST'S LOOP.
     *
     * 📌 `dt` IS IN FRAMES. The clock converts once, by a named constant, and `MS_POR_QUADRO` is the only
     * place the two units meet.
     */
    update: (dt: number) => {
      relogio.avancar(dt);
      pixi.render();
    },

    /**
     * EVERYTHING THIS INSTANCE CREATED OR ATTACHED, RELEASED.
     *
     * ⚠️ THE LIST IS THE POINT, and it was measured rather than remembered: three things escaped the
     * region — a `resize` listener on the WINDOW, a `visibilitychange` listener on the DOCUMENT, and the
     * `__incl2048` global. A cartridge that leaves those behind poisons the next game on the page, and
     * ADR-0139 §4 is explicit that `region` exists so "anything left outside it is a defect with an address".
     *
     * 📌 The nodes go too. The shell empties `region` after this returns, but the three this file PUT there
     * are this file's to take back — relying on the shell to sweep is how a teardown becomes a promise.
     */
    teardown: () => {
      // ⚠️ IDEMPOTENT, AND A GATE CAUGHT THAT IT WAS NOT. The first run of
      //    `tests/factory.browser.test.ts` failed with `TypeError: this.cancelResize is not a function` —
      //    PixiJS's `destroy` called a second time. A shell swapping games under pressure may well call this
      //    twice, and the second call must be a no-op rather than a stack trace in front of a child.
      if (desmontado) return;
      desmontado = true;

      win.removeEventListener('resize', aoRedimensionar);
      doc.removeEventListener('visibilitychange', aoVoltarAVer);
      delete janela.__incl2048;
      tela.remove();
      camadaDePecas.raiz.remove();
      grade.raiz.remove();
      // `true` also destroys the view and the stage's children: the WebGL context is the expensive half, and
      // a context left open per swap is how a catalogue of games runs out of them.
      pixi.destroy(true);
    },
  };
}

// ⚠️ NO AUTO-BOOT HERE, and the line that used to be here was a defect measured in the browser on 2026-09-05.
//
// This file carried, copied from the engine's `consumer-quiz`, an
//     `if (document.getElementById('game-region')) bootar();`
// at the end. There it is correct, because the quiz is the page's own entry point. Here it is not: the entry
// is `boot/boot.ts`, which imports this module AND calls `bootar()` — so the game booted TWICE. Measured: two
// `<canvas>` elements and 32 `role="gridcell"` cells in a grid of sixteen, two keyboard listeners, and every
// arrow key playing two moves.
//
// None of that shows in a logic test, and none of it shows in a screenshot — the two boards sit exactly on top
// of each other. It showed up because this project's boot check counts `canvas` elements and reads the global
// object instead of looking at the image, which is the reason that rule exists.
