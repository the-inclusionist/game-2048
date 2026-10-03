// SPDX-License-Identifier: AGPL-3.0-or-later
// EVERY TRANSPORT REACHES THIS GAME THROUGH THE ENGINE'S CONTROLLER — or it does not reach it at all.
//
// The Dev, 2026-10-03: «Não é para usar meios próprios de entender controle, por favor, use o
// virtualController.»
//
// ========================= WHAT WAS WRONG, MEASURED BEFORE ANY OF THIS WAS WRITTEN =========================
// This game mounted three transports by hand — a `keydown` on the region, a `touchstart`/`touchend` pair
// doing swipe arithmetic, and `click` handlers on four `[data-dir]` buttons — and each ended in `jogar(dir)`,
// the game delivering to itself. None of them pressed `engine.controller`, and the cartridge declared no
// `onCommand`.
//
// 📏 The engine mounts the keyboard, the gamepad (ADR-0224), touch, the eyes, the face, the hands, the voice
// and the one-button scan (ADR-0218 §4); every one of them presses the controller, and the controller carries
// a `VirtualCommand` to `onCommand`. With no `onCommand` those commands went nowhere: the 📷 and 👄 icons sit
// in the bar at the top of this game, a child presses them, and the board does not move. The keyboard only
// appeared to work because of the duplicate listener.
//
// ========================= THE TWO GATES, AND WHY IT TAKES TWO =========================
//   · BEHAVIOURAL — a press on `engine.controller` moves this board, and a real key arrives as exactly one
//     command. That proves the door is open and wired.
//   · STRUCTURAL — in `tests/controller-source.node.test.ts`, because it reads files and this project is a
//     browser one. This game's source mounts NO input listener of its own. That is the one the behavioural
//     gate cannot give: a second, parallel path would deliver the same move twice and every behavioural
//     assertion would still pass, because both paths produce a legal move. 📏 It is the shape of the double
//     boot measured on 2026-09-05 — two canvases, 32 cells in a grid of sixteen, every arrow playing twice —
//     which no screenshot shows, because the two boards sit exactly on top of each other.
import '@the-inclusionist/engine/style.css';
import '../app/css/game.css';

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createGame, type Engine } from '@the-inclusionist/engine';
import { createRng } from '@the-inclusionist/engine/core/rng.js';
import paginaHtml from '../app/index.html?raw';
import { cartridge } from '../src/index.ts';
import { ACAO_DE_LER, ACAO_DO_SONAR, ACOES_USADAS } from '../app/js/actions.ts';
import type { GameInstance } from '../app/js/cartridge-types.ts';

let motor: Engine;
let jogo: GameInstance;
/** Every command the engine delivered to the game, counted by wrapping the instance's own handler. */
let comandos: { action: string; pressed: boolean; source: string | undefined }[] = [];

const mundo = () => (window as Window & { __incl2048?: { board: number[] } }).__incl2048!;

/**
 * ONE ENGINE FOR THE WHOLE FILE, and the cartridge remounted per test.
 *
 * 🔴 IT WAS ONE `createGame` PER TEST UNTIL THE GATE BELOW CAUGHT IT: one `ArrowLeft` produced FOUR commands,
 * and the number was the test's index in the file. `createGame` has no `destroy` — the engine root is meant to
 * live as long as the page, which is what `src/standalone.ts` does — so every extra root left its keyboard
 * listener on the `document` and answered the same key again. 📏 The count was the harness, not the product,
 * and a gate that had been written to tolerate it would have measured nothing ever after.
 *
 * `mount` is the supported way to swap the cartridge under one root (ADR-0142), which is what the platform
 * does too — so this harness is closer to the delivery than the per-test root was.
 */
beforeAll(() => {
  const doc = new DOMParser().parseFromString(paginaHtml, 'text/html');
  for (const s of doc.querySelectorAll('script')) s.remove();
  document.body.replaceChildren(...[...doc.body.childNodes].map((n) => document.importNode(n, true)));

  motor = createGame({
    declaration: cartridge.declaration,
    ...cartridge.hooks,
    host: {
      doc: document, win: window,
      cvdHost: document.querySelector('#cvd'),
      pauseHost: document.querySelector('#game-region'),
    },
    declines: { noPauseActor: true, noNeuralVoice: true },
    downloadHeavy: false,
  });
});

beforeEach(() => {
  comandos = [];
  jogo = cartridge.create({
    engine: motor,
    region: document.querySelector<HTMLElement>('#game-region')!,
    rng: createRng(20261003),
    t: motor.t,
    params: new URLSearchParams(),
  });
  // 🔴 THE WRAP IS HOW THE COUNT IS TAKEN, and it is the instance's OWN handler that runs underneath — not a
  //    stand-in. A test that replaced `onCommand` would measure the engine talking to the test.
  const doJogo = (jogo.hooks as { onCommand?: (c: never) => void }).onCommand;
  motor.mount(jogo.declaration, {
    ...jogo.hooks,
    onCommand: (c: { action: string; pressed: boolean; source: string | undefined }) => {
      comandos.push({ action: c.action, pressed: c.pressed, source: c.source });
      doJogo?.(c as never);
    },
  } as never);
});

afterEach(() => { jogo?.teardown(); });

describe('the game receives through the engine’s controller', () => {
  it('[Cross-check] the cartridge DECLARES the door — without it nothing below means anything', () => {
    // 📌 `onCommand` HAS TO RIDE ON THE HOOKS `mount` RECEIVES, not on the shell's `createGame` call.
    //    Measured with a probe on 2026-10-03: given to `createGame` alone it received 0 commands, because
    //    `motor.mount(declaration, hooks)` replaces the whole game half (`GameHalf`) and `onCommand` is in
    //    it. Given through `mount`, all of them arrived. Nothing reports the first case — it is just silent.
    expect(typeof (jogo.hooks as { onCommand?: unknown }).onCommand, 'the cartridge answers for input')
      .toBe('function');
    expect((jogo.hooks as { onScreenPad?: unknown }).onScreenPad, 'and asks the engine for the pad (ADR-0166)')
      .toBe(true);
  });

  it('[Right] 🔴 a press on `engine.controller` moves this board', () => {
    // The whole point, in one assertion: a transport the engine mounts presses the controller, and the board
    // answers. A fresh round has two tiles, so at least one of the four directions moves something.
    const antes = mundo().board.slice();
    for (const dir of ['left', 'up', 'right', 'down'] as const) {
      expect(motor.controller.press(dir, 'toque', 0), `${dir} reached play`).toBe(true);
    }
    expect(mundo().board, 'four pushes through the controller and the board never moved')
      .not.toEqual(antes);
  });

  it('[Interface] ⚠️ the press carries its SOURCE, which is what ADR-0109 asks of a mounted transport', () => {
    // «Pressing a position by hand is telling the engine that the child's device produced that position —
    // with the source». The latch, the edges and «the child is using this device» all hang off it.
    motor.controller.press('left', 'toque', 0);
    const comToque = comandos.filter((c) => c.source === 'toque' && c.pressed);
    expect(comToque.length, 'the touch press arrived unstamped').toBeGreaterThan(0);
    expect(comToque[0].action).toBe('left');
  });

  it('[Right] 🔴 a real key arrives as EXACTLY ONE command', () => {
    // 📏 The engine's own keyboard presses the controller and delivers here with `source: undefined` — a real
    //    key carries no stamp (ADR-0109), which is why `markKeyWithoutSource` exists. One key, one command.
    document.querySelector<HTMLElement>('#game-region')!.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
    const descidas = comandos.filter((c) => c.pressed && c.action === 'left');
    expect(descidas.length, 'one ArrowLeft produced more than one command').toBe(1);
    expect(descidas[0].source, 'a real key has no stamp').toBeUndefined();
  });

  it('[Many] every position this game declares can be pressed, and reaches play', () => {
    for (const a of ACOES_USADAS) {
      expect(motor.controller.press(a, 'gestos', 0), a).toBe(true);
    }
    const chegaram = new Set(comandos.filter((c) => c.pressed).map((c) => c.action));
    for (const a of ACOES_USADAS) expect(chegaram, `${a} never arrived`).toContain(a);
  });

  it('[Exception] 🔴 the reading mode is reachable by a transport with no Shift to hold', () => {
    // ⚠️ THIS IS WHY `ACAO_DE_LER` EXISTS. It was `Shift` + arrow until 2026-10-03, and a `VirtualCommand`
    //    carries `{ action, pressed, source, player }` with no modifiers — because the eyes, the face, the
    //    hands, the voice, the gamepad and the on-screen pad have no Shift. Pressed here as the HANDS, which
    //    is a child who could never have held it.
    const antes = mundo().board.slice();
    expect(motor.controller.press(ACAO_DE_LER, 'gestos', 0), 'reading reached play').toBe(true);
    // In reading mode the four directions walk the squares instead of pushing: the board must NOT change.
    for (const dir of ['left', 'up', 'right', 'down'] as const) motor.controller.press(dir, 'gestos', 0);
    expect(mundo().board, 'the arrows pushed the board while the child was reading it').toEqual(antes);
    // And switching back restores the verb.
    motor.controller.press(ACAO_DE_LER, 'gestos', 0);
    for (const dir of ['left', 'up', 'right', 'down'] as const) motor.controller.press(dir, 'gestos', 0);
    expect(mundo().board, 'reading mode never switched off').not.toEqual(antes);
  });

  it('[Zero] a RELEASE is not a move — this game acts on the edge', () => {
    const antes = mundo().board.slice();
    for (const dir of ['left', 'up', 'right', 'down'] as const) motor.controller.release(dir, 'toque', 0);
    expect(mundo().board, 'letting go of a direction played a move').toEqual(antes);
  });

  it('[Interface] the sonar is a position too, and asking it does not move a tile', () => {
    const antes = mundo().board.slice();
    motor.controller.press(ACAO_DO_SONAR, 'fala', 0);
    expect(mundo().board, 'asking where a merge is should not play one').toEqual(antes);
  });
});
