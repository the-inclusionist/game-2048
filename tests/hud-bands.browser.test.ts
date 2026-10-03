// SPDX-License-Identifier: AGPL-3.0-or-later
// THE SCORE AND THE DOUBLES ARE THE ENGINE'S HUD NOW — and this is what says they keep up.
//
// 📏 WHAT THIS REPLACED. Until 2026-10-03 `desenhar()` did `querySelector('#p2-score').textContent = …` and
// the same for `#p2-doubles`, on every draw. The engine mounts both from the cartridge's `hud` declaration
// (ADR-0168/0175) and refreshes them on its own frame; its note names this exact situation — «six sibling
// games, six HUDs of their own, none in the bands» — and this game was one of the six.
//
// ========================= 🔴 WHY THIS CANNOT BE CHECKED IN THE BROWSER PANE =========================
// The engine refreshes the bands inside `requestAnimationFrame` (`create-game.js:2135`). Measured in the
// desktop app's preview pane on 2026-10-03: **zero rAF callbacks in 700 ms** — the pane does not run the
// frame loop, so the bands sat at «00000» while the game's score reached 204 and it looked exactly like a
// frozen HUD. `document.hidden` was no help either: it read `true` with the tab fronted.
//
// So the question «does the engine's HUD keep up with this game?» can only be answered where a real frame
// loop runs, which is here. 📌 And it is worth a gate rather than one observation: the `value` closures are
// read every frame, and a future refactor that made them read a stale `pontos` would be invisible
// everywhere else.
import '@the-inclusionist/engine/style.css';
import '../app/css/game.css';

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createGame, type Engine } from '@the-inclusionist/engine';
import { createRng } from '@the-inclusionist/engine/core/rng.js';
import paginaHtml from '../app/index.html?raw';
import { cartridge } from '../src/index.ts';
import type { GameInstance } from '../app/js/cartridge-types.ts';

let motor: Engine;
let jogo: GameInstance;

const mundo = () => (window as Window & {
  __incl2048?: { board: number[]; pontos: number; jogar: (d: string) => void };
}).__incl2048!;

/** One engine root for the file: `createGame` has no `destroy`, and a second root answers every key twice. */
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
  jogo = cartridge.create({
    engine: motor,
    region: document.querySelector<HTMLElement>('#game-region')!,
    rng: createRng(20261003),
    t: motor.t,
    params: new URLSearchParams(),
  });
  motor.mount(jogo.declaration, jogo.hooks);
});

afterEach(() => { jogo?.teardown(); });

/** Waits for the engine's own refresh to have run — two frames, because `refresh()` is called inside one. */
const doisQuadros = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

describe('the engine mounts this game’s numbers', () => {
  it('[Cross-check] 🔴 the frame loop actually runs here — every assertion below depends on it', () => {
    // The guard the pane taught. A suite where rAF never fires would pass «the band did not change» and fail
    // «the band kept up» for the same reason, and neither answer would be about the game.
    return new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('requestAnimationFrame did not fire — this file proves nothing')), 2000);
      requestAnimationFrame(() => { clearTimeout(t); resolve(); });
    });
  });

  it('[Right] both bands are mounted, and they are the ENGINE’s elements', () => {
    expect(document.querySelector('.hud-faixa.hud-points'), 'the identity band').toBeTruthy();
    expect(document.querySelector('.hud-faixa.hud-esquerda'), 'the mission band').toBeTruthy();
    // and this game no longer carries its own
    expect(document.querySelector('#p2-score'), 'our score node is gone').toBeNull();
    expect(document.querySelector('#p2-doubles'), 'and our doubles node').toBeNull();
  });

  it('[Right] 🔴 the score band KEEPS UP with the round', async () => {
    const banda = () => document.querySelector<HTMLElement>('.hud-points')!.textContent ?? '';
    await doisQuadros();
    expect(Number(banda()), 'a fresh round scores nothing').toBe(0);

    // play until something merges — a merge is the only thing that scores
    for (let i = 0; i < 60 && mundo().pontos === 0; i++) mundo().jogar(['left', 'up', 'right', 'down'][i % 4]);
    expect(mundo().pontos, 'the harness never managed to score').toBeGreaterThan(0);

    await doisQuadros();
    expect(Number(banda()), 'the band is showing a score the round left behind').toBe(mundo().pontos);
  });

  it('[Interface] ⚠️ the score is FIVE DIGITS on screen and a sentence to a listener (ADR-0238)', async () => {
    for (let i = 0; i < 60 && mundo().pontos === 0; i++) mundo().jogar(['left', 'up', 'right', 'down'][i % 4]);
    await doisQuadros();
    const p = document.querySelector<HTMLElement>('.hud-points p')!;
    expect(p.textContent, 'the digits are padded').toMatch(/^\d{5}$/);
    // 📌 THE WHOLE POINT OF THE PAIR: a listener must hear «12 pontos», never «zero zero zero um dois».
    expect(p.getAttribute('aria-label'), 'the sentence carries the number, not the padding')
      .toContain(String(mundo().pontos));
    expect(p.getAttribute('aria-label')).not.toMatch(/^0{4}/);
  });

  it('[Right] the doubles band counts EXPONENTS, which is what makes it teach something', async () => {
    // `declaration.ts` carries the argument: with values it reads «16 de 2048», which is true and teaches
    // nothing; with exponents it reads «4 de 11 dobras», and 11 is exactly what 2048 is.
    await doisQuadros();
    const texto = document.querySelector<HTMLElement>('.hud-esquerda')!.textContent ?? '';
    expect(texto, 'the need is the number of doublings, not the tile').toMatch(/\b11\b/);
    expect(texto, 'and never the tile value').not.toMatch(/2048/);
  });
});
