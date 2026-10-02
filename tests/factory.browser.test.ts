// SPDX-License-Identifier: AGPL-3.0-or-later
// THE GAME IS A FACTORY NOW — and these are the two properties that makes possible.
//
// ========================= WHY A BROWSER TEST =========================
// `boot/main.ts` mounts a real accessibility stack through `createGame`, a real PixiJS surface and a real DOM
// grid. None of that exists in the node project, which is exactly why the boot went untested for so long and
// why its state sat at module scope without anything noticing.
//
// ========================= THE TWO THINGS BEING ASSERTED =========================
//   · TWO INSTANCES SHARE NO STATE. Spec D14 and the cartridge brief's first "breaks silently": state at
//     module scope survives `teardown()` and leaks into the next game on the same page. Until 2026-09-11 the
//     board, the score, the heading and the round's end were four module-level `let`s.
//   · TEARDOWN LEAVES NOTHING. ADR-0139 §4 gives a cartridge a `region` precisely so that "anything left
//     outside it is a defect with an address" — and three things escaped it here: a `resize` listener on the
//     WINDOW, a `visibilitychange` listener on the DOCUMENT, and a `__incl2048` global.
import { beforeEach, describe, expect, it } from 'vitest';
import { createGame, type Engine } from '@the-inclusionist/engine';
import { createRng } from '@the-inclusionist/engine/core/rng.js';
import { cartridge, accommodations } from '../src/index.ts';
import type { GameInstance } from '../app/js/cartridge-types.ts';

// 📏 THE DICTIONARIES RIDE INTO THE ENGINE through `CreateGameOptions.dictionaries` since 11.0.0 (ADR-0232
// D3, note DN). The old module-level `registerDict` is gone, and so is the module-level `t`.

/**
 * A SHELL, in eight lines — which is the claim ADR-0140 §2 makes ("the shell is roughly thirty lines") put
 * under a test. If booting this game outside its own `standalone.ts` needed more than a `ctx`, the split would
 * not have worked.
 *
 * ⚠️ The delegating declaration is ADR-0139 §5's interim, here for the same reason the shell has it:
 * `createGame` wants a declaration at boot and the real one belongs to an instance that cannot exist yet.
 */
function montarShell(): GameInstance {
  // 🔴 A DELEGATING declaration — ADR-0139 §5's interim — does NOT boot on engine 9.0.0: with nothing mounted
  //    it answers `undefined` for all ten fields, and 9.0.0 THROWS on a malformed declaration instead of
  //    reporting it. So the shell boots with a well-formed one that says there is no game yet, and `mount`
  //    replaces it. `src/standalone.ts` carries the same shape and the same note.
  const semJogoAinda = {
    topology: () => ({ kind: 'hotspots' as const, order: ['vazio'] }),
    world: () => ({ kind: 'none' as const }),
    holdsAtOnce: () => 1,
    holdsKeys: () => false,
    tick: 'player' as const,
    roleAt: () => 'free' as const,
    nameAt: () => null,
    focusOf: () => null,
    objectiveOf: () => ({ have: 0, need: 1, name: { text: '', gender: 'n' as const, plural: false } }),
    targetsOf: () => [],
  };
  const motor = createGame({
    declaration: semJogoAinda as never,
    // ⚠️ `a11yBarHost` IS NOT OPTIONAL FOR A FAITHFUL SHELL. Omitting it made gate 3 count zero icons —
    //    the engine fell back to looking for `#title-icons`, found nothing, and reported a problem instead
    //    of mounting. A harness that is not a shell proves nothing about shells.
    host: {
      doc: document,
      win: window,
      cvdHost: document.querySelector('#cvd'),
      a11yBarHost: document.querySelector('#p2-a11y'),
      pauseHost: document.querySelector('#game-region'),
    },
    declines: { noPauseActor: true, noNeuralVoice: true },
    downloadHeavy: false,
    dictionaries: cartridge.dictionaries,
    accommodations,
  });
  const jogo = cartridge.create({
    engine: motor,
    region: document.querySelector<HTMLElement>('#game-region')!,
    rng: createRng(20260911),
    t: motor.t,
    params: new URLSearchParams(),
  });
  motor.mount(jogo.declaration, jogo.hooks);
  motorAtivo = motor;
  return jogo;
}

/** Kept around for the gate: a single root per test, exposed so an assertion can call `motor.setLocale`. */
let motorAtivo: Engine | null = null;

/** The markup the engine and this game require. Built fresh per test, as a shell would build it. */
function montarCasca(): void {
  document.body.replaceChildren();
  const p = (id: string, role: string, live: string) => {
    const el = document.createElement('p');
    el.id = id; el.setAttribute('role', role); el.setAttribute('aria-live', live);
    return el;
  };
  const regiao = document.createElement('section');
  regiao.id = 'game-region';
  regiao.tabIndex = -1;
  const barra = document.createElement('div');
  barra.id = 'p2-a11y';
  const cvd = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  cvd.id = 'cvd';
  document.body.append(p('sr-status', 'status', 'polite'), p('sr-alert', 'alert', 'assertive'), regiao, barra, cvd);
}

const regiao = () => document.querySelector<HTMLElement>('#game-region')!;
const global = () => (window as Window & { __incl2048?: unknown }).__incl2048;

beforeEach(montarCasca);

describe('importing the cartridge does nothing', () => {
  it('[Zero] 🔴 ADR-0139 gate 1 — no DOM, no listener, no registration until `create` is called', () => {
    // The record's words: "a cartridge that is imported and never instantiated must do nothing observable —
    // a test that imports and asserts an untouched document". This file imported `src/index.ts` at the top
    // and the shell helper has not run for this test, so the page must be exactly the shell markup.
    document.body.replaceChildren();
    expect(document.body.children).toHaveLength(0);
    expect(document.querySelector('canvas'), 'the import built no surface').toBeNull();
    expect((window as Window & { __incl2048?: unknown }).__incl2048, 'no global').toBeUndefined();
    // And the module IS loaded — otherwise this asserts nothing.
    expect(cartridge.slug).toBe('game-2048');
  });

  it('[Interface] ADR-0139 gate 3 — two cartridges in sequence leave ONE accessibility bar', () => {
    montarCasca();
    const a = montarShell();
    a.teardown();
    const b = montarShell();
    expect(document.querySelectorAll('#p2-a11y').length, 'one host').toBe(1);
    expect(document.querySelectorAll('.pi-btn').length, 'one set of icons, not two').toBeGreaterThan(0);
    const icones = document.querySelectorAll('#p2-a11y .pi-btn').length;
    expect(document.querySelectorAll('.pi-btn').length, 'and none outside the host').toBe(icones);
    b.teardown();
  });
});

describe('two instances of this game do not collide', () => {
  it('[Many] 🔴 each one owns its board — the defect spec D14 names', () => {
    // Until 2026-09-11 `board` was a module-level `let`. Two instances wrote to the same array, so the second
    // game on a page inherited the first one's round — and `teardown()` could not take it back, because it
    // never belonged to either.
    const a = montarShell();
    const primeiro = global() as { board: number[] };
    const tabuleiroA = primeiro.board.slice();
    a.teardown();

    montarCasca();
    const b = montarShell();
    const segundo = global() as { board: number[] };

    // Both boards are freshly dealt, so they are equal in SHAPE — sixteen squares with two tiles. What must
    // not happen is them being the SAME array.
    expect(segundo.board).not.toBe(tabuleiroA);
    expect(segundo.board.filter((v) => v !== 0), 'a fresh round deals two tiles').toHaveLength(2);
    b.teardown();
  });

  it('[Right] a move in one does not move the other', () => {
    const a = montarShell();
    const jogoA = global() as { board: number[]; jogar: (d: string) => void };
    jogoA.jogar('left');
    jogoA.jogar('up');
    const depoisDeA = jogoA.board.slice();
    a.teardown();

    montarCasca();
    const b = montarShell();
    const jogoB = global() as { board: number[] };
    expect(jogoB.board.filter((v) => v !== 0), 'B starts a round, not A’s round').toHaveLength(2);
    expect(jogoB.board).not.toEqual(depoisDeA);
    b.teardown();
  });
});

describe('teardown leaves nothing', () => {
  it('[Zero] the nodes this game put in the region are gone', () => {
    const jogo = montarShell();
    expect(regiao().querySelector('canvas'), 'the surface is there while it runs').toBeTruthy();
    expect(regiao().querySelector('[role="grid"]')).toBeTruthy();

    jogo.teardown();

    expect(regiao().querySelector('canvas'), 'canvas').toBeNull();
    expect(regiao().querySelector('[role="grid"]'), 'the accessible grid').toBeNull();
    expect(regiao().querySelector('.p2-tiles'), 'the tile layer').toBeNull();
  });

  it('[Zero] ⚠️ and so is the global, which would otherwise answer for a game that left', () => {
    const jogo = montarShell();
    expect(global()).toBeTruthy();
    jogo.teardown();
    expect(global(), 'a verification hook outliving its instance answers about nothing').toBeUndefined();
  });

  it('[Exception] 🔴 the listeners OUTSIDE the region are released — the three that escaped', () => {
    // This is the assertion that would have caught the leak. A `resize` on the window and a
    // `visibilitychange` on the document both outlive the region being emptied, so no amount of shell-side
    // sweeping reaches them: only the instance that added them can take them back.
    const jogo = montarShell();
    jogo.teardown();

    // After teardown the handlers must not run. Firing the events is the only honest way to ask — a listener
    // that was removed produces nothing, and one that was not will reach into a torn-down instance.
    expect(() => {
      window.dispatchEvent(new Event('resize'));
      document.dispatchEvent(new Event('visibilitychange'));
    }, 'a surviving handler would touch a destroyed PixiJS application').not.toThrow();
  });

  it('[Boundary] tearing down twice is not a crash', () => {
    // A shell that swaps games under pressure may call it twice; the second must be a no-op rather than a
    // stack trace in front of a child.
    const jogo = montarShell();
    jogo.teardown();
    expect(() => jogo.teardown()).not.toThrow();
  });
});

describe('H2 — a `setLocale` reaches every drawn label at once', () => {
  // 🔴 THE WHOLE REASON KEYS REPLACED WORDS in 11.0.0 (ADR-0232 D3, erratum of 2026-09-25). Against 10.x,
  //    a preset built with `t` in Portuguese stayed in Portuguese forever: `setLocale('en')` loaded the new
  //    dictionary, and nothing read it. The engine's own measurement showed «Acima» after an English switch.
  //    Keys are resolved by the root's translator at every drawing, so one switch moves every surface at
  //    once. This gate reads one of ours — the accessible-grid cells — through the switch.
  //
  // ⚠️ IT DOES NOT ASSERT ON A SPECIFIC WORD per language, because our dictionaries are what the gate reads
  //    FROM. The property it holds is INEQUALITY: the Portuguese sentence and the English sentence for the
  //    same cell MUST differ, or the preset's resolution did not re-run after the switch. The two sentences
  //    being specific strings is a dictionary question, not a translation-plumbing one.
  it('[Right] 🔴 a cell\'s accessible label changes language with `motor.setLocale`', async () => {
    const jogo = montarShell();
    try {
      const umaCelula = () => regiao().querySelector('[role="gridcell"][aria-label]')?.getAttribute('aria-label') ?? '';
      await motorAtivo!.setLocale('pt');
      const emPt = umaCelula();
      expect(emPt.length, 'the grid has at least one labelled cell').toBeGreaterThan(0);

      await motorAtivo!.setLocale('en');
      const emEn = umaCelula();
      expect(emEn, 'the label moved languages — the key resolved against the new dictionary')
        .not.toEqual(emPt);

      await motorAtivo!.setLocale('pt');
      expect(umaCelula(), 'and switching back returns the Portuguese sentence').toEqual(emPt);
    } finally {
      jogo.teardown();
    }
  });
});
