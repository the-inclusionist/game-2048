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
import { srAlert, srSay } from '@the-inclusionist/engine/core/a11y-sr.js';
import { t } from '@the-inclusionist/engine/core/i18n.js';
import { reseed, rnd } from '@the-inclusionist/engine/core/rng.js';
import { createGame, type Engine } from '@the-inclusionist/engine';
import { initLayout, layout } from '@the-inclusionist/engine/ui/layout.js';
import * as PIXI from 'pixi.js';

import {
  OBJETIVO, SIZE, canMove, emptyBoard, maxTile, slide, spawn,
  type Board, type Direction, type Movimento,
} from '../board.ts';
import {
  criarAnimador, duracaoDaJogada, pecasParadas, relogioDoNavegador, type Peca,
} from '../animation.ts';
import { criarPreset, direcaoDe, ehAtalhoDoSistema, ehSonar } from '../actions.ts';
import { criarDeclaracao } from '../declaration.ts';
import { narrarJogada, narrarSemMovimento } from '../narration.ts';
import { LOGICAL_H, LOGICAL_W } from '../geometry.ts';
import { registrarIdiomas } from '../i18n/index.ts';
import { pintarTabuleiro } from '../render/board-canvas.ts';
import { FUNDO_DA_TELA } from '../render/palette.ts';
import { criarGradeDom } from '../ui/board-dom.ts';
import { criarCamadaDePecas } from '../ui/tiles-layer.ts';

/**
 * Has the child asked for less motion? Then no animation — not a faster one.
 *
 * Read from the SYSTEM and not from a menu of ours: whoever needs this has already configured it on the
 * device, and making them find an option inside each game hands them work the browser has already done. It is
 * WCAG 2.3.3, and it is also why this game adds no switch of its own: two places for the same decision is one
 * place for them to disagree.
 */
const movimentoReduzido = (win: Window): boolean =>
  win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/* ===================== THE ROUND'S STATE =====================
 *
 * ⚠️ EVERYTHING HERE DIES WITH THE ROUND, and that is ADR-0037 in code rather than in prose: there is no save,
 * and the Inclusionist keeps nothing about a child. No `localStorage`, no best score, no "continue where you
 * left off" — the absence is the decision. The 2048 forks keep the best score; this one cannot.
 */
let board: Board = emptyBoard();
let pontos = 0;
let heading: 'n' | 'e' | 's' | 'w' | 'none' = 'none';
let acabou = false;

const RUMO: Record<Direction, 'n' | 'e' | 's' | 'w'> = { left: 'w', right: 'e', up: 'n', down: 's' };

/** The round's draw. Seeded from the clock at boot; the SAME seed gives the SAME round (ADR-0049). */
function novaRodada(): void {
  reseed(Date.now() & 0x7fffffff);
  board = emptyBoard();
  pontos = 0;
  heading = 'none';
  acabou = false;
  for (let i = 0; i < 2; i++) board = spawn(board, rnd)?.board ?? board;
}

export function bootar(doc: Document = document, win: Window = window): Engine | null {
  const região = doc.querySelector<HTMLElement>('#game-region');
  if (!região) return null;

  // 1. LANGUAGES BEFORE ANYTHING — even before `createGame`, which already translates markup on its first step.
  registrarIdiomas();

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

  // 3. THE WHOLE ENGINE. A board game has no pad wizard and no "pause actor" — and declining is DECLARING,
  //    not returning null from a getter and hoping.
  //
  //    ⚠️ THE PAUSE MENU IS NO LONGER DECLINABLE, and this game used to decline it. Engine 8.0.0 deleted
  //    `semMenuDePausa` from `Declinios` — not renamed, deleted — which is the Dev's instruction of
  //    2026-09-07 turned into a type error: «todo jogo da engine inclusionist deve ter o mesmo menu de pausa e
  //    ícones de acessibilidade desde a primeira [tela]». Our reasoning for declining was that a turn-based
  //    board has no phases to pause. It was reasoning about the CLOCK, and the menu is not about the clock:
  //    it is the door to the accessibility settings, and a game without it is a game where the child cannot
  //    find them.
  const motor = createGame({
    declaration,
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
      semAssistenteDePad: true,
      semAtorDePausa: true,
      // ⚠️ THE NEURAL VOICE IS DECLINED, and until engine 8.0.0 that refusal was invisible to the engine.
      //    The reasoning is fifteen lines below and unchanged — 27 MB of ONNX runtime against a school
      //    tablet's precache budget. What changed is that `Declinios` now has somewhere to say it, so a
      //    decision stops looking like an oversight. The engine's own note still lists this game among the
      //    three that DO declare `carregarVozNeural`; the warning it printed at us says otherwise.
      semVozNeural: true,
    },
    isNavigable: () => true,
    // THE WORDS FOR THE POSITIONS THIS GAME READS (`app/js/actions.ts`).
    //
    // ⚠️ WITHOUT IT THE ENGINE CANNOT NAME A KEY, and `core/actions` is explicit that naming is not
    //    decoration: `labellerFrom` returns `null` instead of `action1` precisely so an abstract name cannot
    //    reach a child (ADR-0074). It is also what lets the engine compute whether every action this game
    //    uses is REACHABLE on each input transport — a check it cannot make about a game that never said
    //    which positions it uses.
    preset: criarPreset(t),
    // ⚠️ NO HEAVY DOWNLOADS AT BOOT, and this is the SAME decision as `semVozNeural` rather than a new one.
    //    The engine's own doc says `false` is "for whoever has a reason", and that a production game turning
    //    it off decides its child goes without the neural voice offline. This game decided exactly that on
    //    2026-09-06, for 27 MB against a school tablet's precache budget — see the note just below.
    //
    //    ⚠️ AND MEASURED ON 2026-09-11, ON THIS BUILD: with the downloads on, booting the 2048 makes exactly
    //    one external request — `https://webgazer.cs.brown.edu/webgazer.js`, 1.9 MB — which fails by CORS on
    //    every load. That is a municipally-owned children's game reaching a third-party host it cannot even
    //    use, for the 👀 icon the bar itself labels "em construção". The engine records the same thing from
    //    the other side: ADR-0124 is the Dev choosing MediaPipe and writing «webgazer não», and ADR-0132 names
    //    the leftover `<script src>` as a debt. Until that debt is paid, the request happens; this line is
    //    what stops it happening HERE.
    //
    //    📌 Nothing this game uses depends on it: the voices are declined, the webcam icons are unbuilt, and
    //    the TTS the child can actually switch on is the browser's.
    baixarPesados: false,
    // ⚠️ NO `carregarVozNeural`, AND THAT IS A CHOICE RATHER THAN AN OVERSIGHT. The port exists (ADR-0094) and
    //    switching it on is one line: `carregarVozNeural: () => import('@mintplex-labs/piper-tts-web')`. The
    //    narration falls back to the BROWSER's voice, which speaks the right language.
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

  // 4. THE CANVAS, under the numbers and HIDDEN FROM THE ACCESSIBILITY TREE. It is the illustration; the real
  //    board is the DOM grid (pillar 2). Without `aria-hidden`, the screen reader would announce an image.
  const pixi = new PIXI.Application({
    width: LOGICAL_W, height: LOGICAL_H, backgroundColor: FUNDO_DA_TELA,
    antialias: false, resolution: 1, powerPreference: 'low-power',
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
  initLayout({ numJogadores: () => 1 });
  layout();
  win.addEventListener('resize', () => layout());

  // ⚠️ BECOMING VISIBLE AGAIN RECONCILES THE SCREEN WITH THE MODEL. While the document is hidden nothing is
  // animated (see `podeAnimar`), and the rescue guarantees the final frame arrives — but a tab that spent
  // minutes hidden may have lost frames for other reasons. Redrawing on return is cheap and closes the whole
  // category: whatever the reason the screen fell behind, it catches up on the way back.
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') desenhar(); });

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
    quadro(pecasParadas(board));
    grade.atualizar(declaration, t);
    const o = declaration.objectiveOf(0);
    const hud = doc.querySelector<HTMLElement>('#p2-doubles');
    if (hud) hud.textContent = t('move.doubles', { have: o.have, need: o.need });
    const placar = doc.querySelector<HTMLElement>('#p2-score');
    if (placar) placar.textContent = String(pontos);
  }

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
  const animador = criarAnimador(relogioDoNavegador(win), quadro);
  const animar = (movimentos: readonly Movimento[]): Promise<void> =>
    animador.correr(movimentos, duracaoDaJogada(movimentoReduzido(win)), doc.visibilityState !== 'hidden');

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

    const nascida = spawn(board, rnd);
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

    const acao = motor.keyboard.actionOf(e.code, 0);
    const dir = direcaoDe(acao);

    // THE SONAR — "where is a merge available?", asked as an ACTION and no longer as a chord.
    //
    // ⚠️ IT WAS `e.code === 'KeyS' && e.altKey` UNTIL ENGINE 8.0.0, and three things were wrong with that.
    //    The engine did not know the binding existed, so it could not be remapped and was not checked against
    //    any other binding; a layout that puts `S` elsewhere moved it silently; and the README promised "in
    //    one keystroke" while asking for two. Read through `actionOf`, it is the same path every other key in
    //    this game already took.
    //
    // 📌 WHAT THIS DOES NOT YET BUY, said plainly: the child cannot REACH a remapping screen from this game.
    //    Measured on 2026-09-11 — the engine's pause card hides every item it cannot action, and with no
    //    `getPauseActs` (a field `CreateGameOptions` does not have) only "♿ Acessibilidade" survives, which
    //    goes to the icon bar. The binding is now remappable by the engine's layer and will honour a mapping
    //    stored from anywhere on this origin; the screen that writes one is not ours to open yet.
    if (ehSonar(acao)) {
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
  motor.cenas.push({ nome: 'tabuleiro', draw: () => desenhar(), input: () => false });
  motor.nav.attach();
  motor.cenas.draw();
  grade.focar();
  srSay(t('a11y.instructions'));

  // The project's verification hook: checking the boot means checking this exists, and reading from it.
  (win as Window & { __incl2048?: unknown }).__incl2048 = {
    get board() { return board; },
    get pontos() { return pontos; },
    get acabou() { return acabou; },
    jogar, novaRodada: () => { novaRodada(); desenhar(); }, declaration, motor,
  };
  return motor;
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
