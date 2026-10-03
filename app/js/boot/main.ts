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
// it, and a second one would write to the same regions as the root's. 📌 Note DG retired the «Libras
// mirror» the previous versions carried: the deaf-mode interpreter signs what the sonar finds, not an
// announcement queue, so the mirror-to-signing hop this comment used to describe no longer exists.
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
import { criarPreset, direcaoDe, ehLer, ehSonar } from '../actions.ts';
import { SLIDES } from '../how-to-play.ts';
import type { GameCtx, GameInstance } from '../cartridge-types.ts';
import { criarDeclaracao, RESPOSTAS_DAS_ACOMODACOES } from '../declaration.ts';
import { narrarJogada, narrarSemMovimento } from '../narration.ts';
import { LOGICAL_H, LOGICAL_W } from '../geometry.ts';
import { pintarTabuleiro } from '../render/board-canvas.ts';
import { FUNDO_DA_TELA, type Nivel } from '../render/palette.ts';
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
  /**
   * Are the four directions moving the READING CURSOR instead of pushing the board?
   *
   * 📌 PER INSTANCE, like everything else in this block, and for the reason spec D14 names: a module-level
   * `let` here would mean the second game on a page inherited the first child's reading mode.
   *
   * ⚠️ It is a MODE and not a modifier since 2026-10-03. `Shift` + arrow could only ever be held by a child
   * with a keyboard; the position (`ACAO_DE_LER`) is reachable from the gamepad, the eyes, the face, the
   * hands, the voice, the on-screen pad and the one-button scan, because all of them press the same
   * controller.
   */
  let lendo = false;

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

  /**
   * THE REDRAW THE THEME NEEDS. `src/index.ts`'s `setPlayerTheme` writes `data-tema` on the root element and
   * has no way to reach this instance; this is the other end of that seam.
   *
   * 📌 A `MutationObserver` AND NOT A POLL, and not a callback the cartridge hands upward either: the
   * attribute is already the shared truth (the stylesheet could read it too), and observing it keeps the
   * per-instance half entirely inside the instance — `teardown` disconnects it, so a swapped cartridge does
   * not leave a second observer repainting a board that left the page.
   */
  const observadorDoTema = new MutationObserver(() => desenhar());
  observadorDoTema.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-tema'] });

  /**
   * THE CONTRAST THEME, READ WHERE THE ENGINE PUT IT.
   *
   * 🔴 `setPlayerTheme` IS CAPTURED ONCE, AT `createGame`. `boot/create-game.js:812` does
   * `const setGameTheme = cartridge.setPlayerTheme` and hands that closure to `initPauseIcons` on the next
   * line, so the writer the engine calls for the rest of the page's life is the one declared on the
   * CARTRIDGE's module-level hooks — a `mount` cannot replace it. That writer cannot close over an instance
   * (spec D14 forbids a module-level «current instance»), so `src/index.ts` writes the chosen theme onto
   * `documentElement.dataset.tema` and this instance reads it. The attribute is the seam.
   *
   * ⚠️ AND `data-tema` IS ALSO THE REDRAW SIGNAL, which is why the observer exists below: nothing in the
   * engine calls back into this game's drawing after a theme change, and without it the child would press
   * 🌗, hear «Alto contraste, 7:1» and see the old board until her next move.
   *
   * 📌 It replaced `dataset.hc === '1'` — a boolean of this game's own, written by a `◐ Alto contraste`
   * button that duplicated the engine's icon.
   */
  const temaAtual = (): Nivel | null => {
    const v = doc.documentElement.dataset.tema;
    return v === 'hc3' || v === 'hc45' || v === 'hc7' ? v : null;
  };
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
    const tema = temaAtual();
    pintarTabuleiro(figura, { papel: papelDa, tema, pecas });
    camadaDePecas.desenhar(pecas, tema, papelDa);
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

  // ============================ 6. EVERY TRANSPORT, THROUGH ONE DOOR ============================
  //
  // 🔴 THREE LISTENERS STOOD HERE UNTIL 2026-10-03 and all three were this game understanding control by
  //    itself: a `keydown` on the region, a `touchstart`/`touchend` pair doing swipe arithmetic, and a
  //    `click` on four `[data-dir]` buttons. Each ended in `jogar(dir)` — the game delivering to itself.
  //    The Dev, finding it: «Não é para usar meios próprios de entender controle, use o virtualController».
  //
  // 📏 WHAT IT COST, MEASURED. The engine mounts the keyboard, the gamepad (ADR-0224), touch, the eyes, the
  //    face, the hands, the voice and the one-button scan, and every one of them presses `engine.controller`,
  //    which carries a `VirtualCommand` here. With no `onCommand` the commands went nowhere: the 📷 and 👄
  //    icons sit in the bar this game just put back at the top, a child presses them, and the board does not
  //    move. The keyboard appeared to work only because of the duplicate listener.
  //
  // ⚠️ AND THE DUPLICATE WAS THE MIGRATION'S TRAP. Measured with a probe before any of this was written: the
  //    engine's keyboard ALREADY delivers `left` here, with `source: undefined` — a real key carries no stamp
  //    (ADR-0109). Wiring `onCommand` without deleting the listener makes every arrow play TWICE, which is
  //    invisible in a screenshot, exactly like the double boot of 05/09.
  //
  // 📌 `onCommand` MUST TRAVEL ON THE HOOKS THIS FUNCTION RETURNS, not on the shell's `createGame` call. The
  //    same probe: passed to `createGame` alone it received 0 commands, because `motor.mount(declaration,
  //    hooks)` replaces the whole game half (`GameHalf`) and `onCommand` is in it. Passed through `mount` it
  //    received all of them. There is no error for the first case — it is simply silent.
  const aoComando = (c: { readonly action: string; readonly pressed: boolean }): void => {
    // A release is not a move. This game acts on the EDGE, as a board game does: holding `left` pushes once.
    if (!c.pressed) return;

    // THE SONAR — "where is a merge available?", asked as a position. It was `e.code === 'KeyS' && e.altKey`
    // until engine 8.0.0: invisible to the engine, unremappable, unchecked against other bindings, and moved
    // in silence by any layout that puts `S` elsewhere.
    //
    // ⚠️ NO `viz` SINCE ENGINE 8.0.0 — the field was DELETED, not moved. Checked in 8.0.0-rc.1 before the
    //    argument went: `sonar()` does not gate on vision at all (the gate is on the continuous GUIDE), so
    //    this sounds and speaks exactly as it did. Passing `viz: 'cego'` was forcing a flag with no reader.
    if (ehSonar(c.action)) {
      const f = declaration.focusOf(0);
      if (f) motor.sonar.sonar({ i: 0, x: f.at.x, y: f.at.y });
      return;
    }

    // THE READING MODE — what `Shift` + arrow used to be. `actions.ts` carries the reason at length: a
    // command has no `shiftKey`, because the eyes, the face, the voice and the pad have no Shift to hold, so
    // the chord was a reading mode for keyboard children and for nobody else.
    if (ehLer(c.action)) {
      lendo = !lendo;
      motor.say(motor.t(lendo ? 'a11y.reading.on' : 'a11y.reading.off'));
      if (lendo) grade.focar();
      return;
    }

    const dir = direcaoDe(c.action);
    if (!dir) return;

    if (lendo) {
      const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir] as [number, number];
      const i = grade.mover(d[0], d[1]);
      grade.focar();
      srSay(grade.raiz.querySelector<HTMLElement>(`[data-i="${i}"]`)?.getAttribute('aria-label') ?? '');
      return;
    }
    jogar(dir);
  };

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
    //    🔴 AND `onCommand` IS WHY THIS OBJECT MATTERS MORE THAN IT LOOKS. `mount` replaces the whole game
    //    half, so a handler given to `createGame` and not repeated here is silently dropped — measured with
    //    a probe on 2026-10-03: 0 commands that way, all of them this way. It is the game's ONE door for
    //    input, and it is what makes the gamepad, the eyes, the face, the hands, the voice and the scan
    //    reach this board at all.
    //
    //    📌 `onScreenPad` ASKS THE ENGINE FOR THE PAD (ADR-0166) instead of this game drawing one. Four
    //    `[data-dir]` buttons lived in `app/index.html` with their own CSS and their own `click` handlers,
    //    and `src/standalone.ts` sized them through `padPxPerMm` by hand. The engine's `initTouch` mounts
    //    the pad, sizes it in real millimetres, names its buttons from this `preset`, remaps it, and presses
    //    the controller — so the pad arrives wired to everything a hand-built one was cut off from.
    hooks: {
      preset: criarPreset(),
      isNavigable: () => true,
      accommodations: RESPOSTAS_DAS_ACOMODACOES,
      onCommand: aoComando,
      onScreenPad: true,
      //    🔴 `declines` IS IN THE GAME HALF TOO, AND LEAVING IT OUT COST A REAL LINE. Measured on the built
      //    page on 2026-10-03: `motor.problems` carried «there is no neural voice: a child who cannot read
      //    gets the system voice, which a school Chromebook may not have for the child's language». The
      //    shell DOES pass `declines: { noPauseActor, noNeuralVoice }` to `createGame` — and `mount`
      //    replaced the whole half, so the decline was erased a few milliseconds later. The console only
      //    ever showed the PRE-MOUNT snapshot, which is why it looked clean for weeks.
      //
      //    📌 ONLY `noNeuralVoice`, because only that one is the GAME's. The 27 MB of ONNX runtime against a
      //    school tablet's precache budget is this cartridge's decision and travels with it into any shell.
      //    `noPauseActor` is the SHELL's — a cartridge in the platform shares one pause card with every
      //    other game, so the actor comes from the platform and a cartridge that declared it would be
      //    answering for a card it does not own.
      declines: { noNeuralVoice: true },
      //    📌 `howToPlay` REPEATED FROM `src/index.ts`'s frozen array for the same reason as `declines`:
      //    `mount` replaces the game half, and the slides would vanish the moment this cartridge mounted.
      howToPlay: SLIDES,
    },

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
      observadorDoTema.disconnect();
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
