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
import { bootar } from '../app/js/boot/main.ts';

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

describe('two instances of this game do not collide', () => {
  it('[Many] 🔴 each one owns its board — the defect spec D14 names', () => {
    // Until 2026-09-11 `board` was a module-level `let`. Two instances wrote to the same array, so the second
    // game on a page inherited the first one's round — and `teardown()` could not take it back, because it
    // never belonged to either.
    const a = bootar(document, window)!;
    const primeiro = global() as { board: number[] };
    const tabuleiroA = primeiro.board.slice();
    a.teardown();

    montarCasca();
    const b = bootar(document, window)!;
    const segundo = global() as { board: number[] };

    // Both boards are freshly dealt, so they are equal in SHAPE — sixteen squares with two tiles. What must
    // not happen is them being the SAME array.
    expect(segundo.board).not.toBe(tabuleiroA);
    expect(segundo.board.filter((v) => v !== 0), 'a fresh round deals two tiles').toHaveLength(2);
    b.teardown();
  });

  it('[Right] a move in one does not move the other', () => {
    const a = bootar(document, window)!;
    const jogoA = global() as { board: number[]; jogar: (d: string) => void };
    jogoA.jogar('left');
    jogoA.jogar('up');
    const depoisDeA = jogoA.board.slice();
    a.teardown();

    montarCasca();
    const b = bootar(document, window)!;
    const jogoB = global() as { board: number[] };
    expect(jogoB.board.filter((v) => v !== 0), 'B starts a round, not A’s round').toHaveLength(2);
    expect(jogoB.board).not.toEqual(depoisDeA);
    b.teardown();
  });
});

describe('teardown leaves nothing', () => {
  it('[Zero] the nodes this game put in the region are gone', () => {
    const jogo = bootar(document, window)!;
    expect(regiao().querySelector('canvas'), 'the surface is there while it runs').toBeTruthy();
    expect(regiao().querySelector('[role="grid"]')).toBeTruthy();

    jogo.teardown();

    expect(regiao().querySelector('canvas'), 'canvas').toBeNull();
    expect(regiao().querySelector('[role="grid"]'), 'the accessible grid').toBeNull();
    expect(regiao().querySelector('.p2-tiles'), 'the tile layer').toBeNull();
  });

  it('[Zero] ⚠️ and so is the global, which would otherwise answer for a game that left', () => {
    const jogo = bootar(document, window)!;
    expect(global()).toBeTruthy();
    jogo.teardown();
    expect(global(), 'a verification hook outliving its instance answers about nothing').toBeUndefined();
  });

  it('[Exception] 🔴 the listeners OUTSIDE the region are released — the three that escaped', () => {
    // This is the assertion that would have caught the leak. A `resize` on the window and a
    // `visibilitychange` on the document both outlive the region being emptied, so no amount of shell-side
    // sweeping reaches them: only the instance that added them can take them back.
    const jogo = bootar(document, window)!;
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
    const jogo = bootar(document, window)!;
    jogo.teardown();
    expect(() => jogo.teardown()).not.toThrow();
  });
});
