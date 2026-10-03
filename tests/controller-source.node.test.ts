// SPDX-License-Identifier: AGPL-3.0-or-later
// THE OTHER HALF OF `tests/controller.browser.test.ts` — the one that reads the source.
//
// 🔴 WHY IT IS SEPARATE AND NOT A MISSING PIECE. The behavioural gates live in the browser project, where a
// real `createGame` presses a real controller; these read files, and `node:fs` does not exist there. Splitting
// by RUNTIME rather than by subject is what the two projects are for.
//
// 🔴 WHY THE BEHAVIOURAL HALF CANNOT COVER THIS. A second, parallel input path — the `keydown` listener this
// game carried until 2026-10-03 — delivers the same move twice, and every behavioural assertion still passes,
// because both deliveries are legal moves. 📏 It is the shape of the double boot measured on 2026-09-05: two
// canvases, 32 cells in a grid of sixteen, every arrow playing twice, and nothing visible in a screenshot
// because the two boards sit exactly on top of each other.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ========================= THE STRUCTURAL HALF =========================
describe('this game mounts no transport of its own', () => {
  /** The game's own sources, comments stripped — the trap this repository has fallen into three times. */
  const FONTES = ['app/js/boot/main.ts', 'src/standalone.ts', 'app/js/actions.ts', 'app/js/ui/a11y-bar-retract.ts']
    .map((rel) => ({
      nome: rel,
      texto: readFileSync(join(import.meta.dirname, '..', rel), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        // 🔴 CRLF FIRST, AND IT IS NOT TIDINESS. Measured on 2026-10-03: in a file with CRLF line endings,
        // every assertion below went inert without a word. JavaScript's `.` does NOT match a carriage return — it
        // is a line terminator — so `(^|[^:])//.*$` finds no match on such a line, and NOTHING is stripped. The
        // gate then reads the comments as if they were code. It surfaced as a false positive (a comment naming the
        // forbidden token reddened the gate), which is the lucky direction; a checkout with `core.autocrlf=true`
        // would leave every «this source does not contain X» gate in this repository measuring prose.
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1'))
        .join('\n'),
    }));

  it('[Cross-check] stripping the comments left the CODE, not an empty string', () => {
    // Every assertion below is a `not.toMatch`, and a file read as empty passes all of them. 📏 This exact
    // trap produced two green gates on a live mutation in G11 and two more since.
    // ⚠️ THE ANCHOR MUST NOT BE THE SUBJECT, and the first draft of this line had it backwards: it read
    //    `/export function bootar|onCommand/`, and the export is actually called `criarJogo` — so the only
    //    arm that ever matched was `onCommand`, the very thing the gates below are about. 📏 A mutation that
    //    deleted `onCommand` reddened this cross-check too, which would have read as «the file is empty»
    //    when the file was fine. An anchor has to survive every mutation the suite is meant to catch.
    const boot = FONTES.find((f) => f.nome === 'app/js/boot/main.ts')!.texto;
    expect(boot, 'the boot survives').toMatch(/export function criarJogo/);
    expect(boot, 'and so does its body').toMatch(/criarGradeDom\s*\(/);
    expect(FONTES.find((f) => f.nome === 'src/standalone.ts')!.texto).toMatch(/createGame\s*\(/);
    expect(FONTES.find((f) => f.nome === 'app/js/actions.ts')!.texto).toMatch(/criarPreset/);
  });

  // ========================= THE RULE, IN THE DEV'S WORDS =========================
  // «A única fonte de informação para o jogo vinda do meio externo é o virtualController, o jogo não pode ler
  //  teclas, botões de joystick nem nada, quem deve ler os mecanismos de hardware é o virtualController.»
  //
  // 🔴 SO THE LIST IS EVERY DEVICE EVENT, not the three this file started with. It began as
  // `keydown/keyup/touch*` — the listeners E8 happened to delete — and a list shaped by what was removed
  // measures the last defect, never the next one. A pointer, a mouse, a wheel and a gamepad are the same
  // question asked with different hardware, and the engine's controller is the answer to all of them.
  //
  // 📌 WHAT IS NOT ON THE LIST, and why. `visibilitychange` and `resize` are not input: they say the page
  // changed, not that the child did something. `focus`/`focusin` is the browser reporting where attention
  // went, which every accessible widget must know. `click` on a `<button>` is widget ACTIVATION, reached by
  // key, pointer, switch or screen reader alike — the engine's own pause card is wired that way. The rule is
  // about reading DEVICES, and these are not devices.
  const EVENTOS_DE_DISPOSITIVO = [
    'keydown', 'keyup', 'keypress',
    'touchstart', 'touchend', 'touchmove', 'touchcancel',
    'pointerdown', 'pointerup', 'pointermove', 'pointerenter', 'pointerover',
    'mousedown', 'mouseup', 'mousemove', 'wheel',
    'gamepadconnected', 'gamepaddisconnected',
  ];

  /**
   * 🔴 ONE FILE IS EXCEPTED, BY NAME AND WITH ITS REASON — which is the only kind of exception this repository
   * keeps (the same rule `tests/i18n.node.test.ts` states about its own list: «an exception with a reason is a
   * decision, an exception without one is an oversight that learned to pass»).
   *
   * `app/js/ui/a11y-bar-retract.ts` reads `pointermove` and `pointerdown`. It does it to decide whether the
   * ENGINE'S accessibility bar should fold away or come back — the Dev's request: «deve aparecer novamente
   * quando o mouse se dirige em sua direção ou se há um toque na tela no lugar onde ele deveria estar.»
   *
   * ⚠️ THAT CANNOT GO THROUGH THE CONTROLLER, and the reason is in the controller's own shape: a
   * `VirtualCommand` carries a POSITION (`up`, `action1`) and never a coordinate. «Is the pointer heading for
   * the top band?» is a question about WHERE the pointer is, which no position can answer. So the feature is
   * not expressible under this rule by any game — which is the argument, measured, for it belonging to the
   * engine, where reading the hardware is legitimate. It is written down in that file and awaits the Dev's
   * authorisation to move.
   *
   * 📌 WHAT THE EXCEPTION DOES NOT COVER is the thing the rule is about: the assertion below holds that
   * nothing this file reads ever reaches the game's play path. It moves a bar; it cannot move a tile.
   */
  const EXCECAO = 'app/js/ui/a11y-bar-retract.ts';

  it('[Zero] 🔴 the excepted file never turns a pointer into a move', () => {
    // The rule is «the only source of information for the game from outside is the virtualController». This
    // file may read a pointer to show a bar; if it ever reached `jogar`, `controller.press` or the command
    // handler, it would be a second source of game intent — exactly what the rule forbids.
    const f = FONTES.find((x) => x.nome === EXCECAO)!;
    expect(f.texto, 'it plays the game').not.toMatch(/jogar\s*\(/);
    expect(f.texto, 'it presses the controller').not.toMatch(/controller\s*\.\s*press/);
    expect(f.texto, 'it reaches the command handler').not.toMatch(/aoComando|onCommand/);
  });

  for (const escuta of EVENTOS_DE_DISPOSITIVO) {
    it(`[Zero] 🔴 the game does not listen for \`${escuta}\` — that is the controller's to read`, () => {
      const ofensas = FONTES
        .filter((f) => f.nome !== EXCECAO)
        .filter((f) => new RegExp('addEventListener\\s*\\(\\s*[\'"`]' + escuta + '[\'"`]').test(f.texto))
        .map((f) => f.nome);
      expect(ofensas, `${escuta} is hardware — press engine.controller instead of reading it`).toEqual([]);
    });
  }

  it('[Zero] 🔴 nor does it poll the gamepad, which is the one device with no event to forbid', () => {
    // `navigator.getGamepads()` is read in a loop rather than listened to, so a list of event names would
    // never catch it. The engine mounts the gamepad transport (ADR-0224) and presses the controller with it.
    for (const f of FONTES) {
      expect(f.texto, `${f.nome} reads the gamepad itself`).not.toMatch(/getGamepads\s*\(/);
    }
  });

  it('[Zero] 🔴 and it draws no touch pad of its own — `onScreenPad` asks the engine for one', () => {
    // Four `[data-dir]` buttons with their own CSS and their own `click` handlers. The engine's `initTouch`
    // sizes a pad in real millimetres, names its buttons from this game's `preset`, remaps it, and presses
    // the controller — everything the hand-built one was cut off from.
    for (const f of FONTES) {
      expect(f.texto, `${f.nome} still wires a pad by hand`).not.toMatch(/\[data-dir\]/);
    }
    const html = readFileSync(join(import.meta.dirname, '..', 'app', 'index.html'), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, ' ');
    expect(html, 'the markup still carries the hand-built pad').not.toMatch(/data-dir=/);
  });

  it('[Zero] 🔴 nor does it read keys through `keyboard.actionOf` behind the engine’s back', () => {
    // `actionOf` is a TRANSLATOR, not a door: reading it means this game is holding a key event of its own.
    // It is how the old listener looked legitimate — it used the engine's remap table and still bypassed
    // every other transport.
    for (const f of FONTES) {
      expect(f.texto, `${f.nome} translates keys itself`).not.toMatch(/keyboard\.actionOf\s*\(/);
    }
  });
});
