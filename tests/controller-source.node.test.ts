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
  const FONTES = ['app/js/boot/main.ts', 'src/standalone.ts', 'app/js/actions.ts']
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

  for (const escuta of ['keydown', 'keyup', 'touchstart', 'touchend', 'touchmove']) {
    it(`[Zero] 🔴 it does not listen for \`${escuta}\` — the engine owns that transport`, () => {
      const ofensas = FONTES
        .filter((f) => new RegExp(`addEventListener\\(\\s*['"\`]${escuta}['"\`]`).test(f.texto))
        .map((f) => f.nome);
      expect(ofensas, `${escuta} is the engine's to hear — press engine.controller instead`).toEqual([]);
    });
  }

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
