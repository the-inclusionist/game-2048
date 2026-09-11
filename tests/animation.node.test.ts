// SPDX-License-Identifier: AGPL-3.0-or-later
// THE ANIMATION, TESTED WITHOUT A CLOCK — because the part that matters is not the clock.
//
// ========================= THE CUT, AND WHY IT PAYS =========================
// `animation.ts` does not know what `requestAnimationFrame`, `performance.now` or a canvas is: a `t` between 0
// and 1 goes in, a position in logical pixels comes out. Everything else — when to call, how many times, when
// to stop — lives in `boot/main.ts`, which is where time lives.
//
// The cut is what makes these assertions possible. A test that had to wait 110 real milliseconds would be
// slow, flaky, and would measure the browser's timer fidelity rather than the interpolation's arithmetic.
//
// ========================= WHAT IT DOES NOT PROVE =========================
// That the animation LOOKS good, and that the loop really calls this sixty times a second. The first is the
// eye; the second is `tests/animacao.browser.test.ts`, which runs the real thing.
import { describe, expect, it } from 'vitest';
import {
  DURACAO_MS, MS_POR_QUADRO, criarRelogioDeQuadros, duracaoDaJogada, easeOut, pecasNoInstante,
  pecasParadas, podeAnimar, posicaoDe, querMenosMovimento, socorroMs,
} from '../app/js/animation.ts';
import { SIZE, slide, type Board, type Movimento } from '../app/js/board.ts';
import { cellRect } from '../app/js/geometry.ts';

const grade = (...v: number[]): Board => v.map((x) => (x === 0 ? 0 : Math.log2(x)));
const linha = (...v: number[]): Board => grade(...v, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const mov = (from: number, to: number, exponent = 1, merged = false): Movimento => ({ from, to, exponent, merged });

describe('the curve', () => {
  it('[Boundary] starts at 0 and ends at 1 — or the tile jumps on the first or the last pass', () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
  });

  it('[Right] it BRAKES at the end: the second half of the path takes longer than the first', () => {
    // It is what makes the eye understand that the tile TOUCHED the wall rather than being teleported. An
    // `easeIn` would do the opposite and the tile would look like it was falling.
    expect(easeOut(0.5), 'half the time, more than half the path').toBeGreaterThan(0.5);
  });

  it('[Many] it is monotonic — the tile never moves backwards mid-motion', () => {
    let anterior = -1;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = easeOut(t);
      expect(v).toBeGreaterThan(anterior);
      anterior = v;
    }
  });
});

describe('a tile’s position at instant t', () => {
  it('[Zero] at t=0 it sits exactly on the ORIGIN square', () => {
    const p = posicaoDe(mov(3, 0), 0);
    expect({ x: p.x, y: p.y }).toEqual({ x: cellRect(3).x, y: cellRect(3).y });
  });

  it('[One] at t=1 it sits exactly on the DESTINATION square', () => {
    const p = posicaoDe(mov(3, 0), 1);
    expect({ x: p.x, y: p.y }).toEqual({ x: cellRect(0).x, y: cellRect(0).y });
  });

  it('[Interface] in between it is BETWEEN the two, and on no square at all', () => {
    const p = posicaoDe(mov(3, 0), 0.5);
    expect(p.x).toBeGreaterThan(cellRect(0).x);
    expect(p.x).toBeLessThan(cellRect(3).x);
    const casas = Array.from({ length: SIZE * SIZE }, (_, i) => cellRect(i).x);
    expect(casas, 'landing on a square would make it a jump, not a slide').not.toContain(p.x);
  });

  it('[Boundary] a `t` outside [0,1] is CLAMPED, not extrapolated', () => {
    // A clock that jumps — a backgrounded tab, a slow device — produces a `t` above 1. Extrapolating would
    // throw the tile off the board, and that is the worst failure mode: visible, ugly, and on a device that is
    // not mine.
    expect(posicaoDe(mov(3, 0), 2).x).toBe(cellRect(0).x);
    expect(posicaoDe(mov(3, 0), -1).x).toBe(cellRect(3).x);
  });

  it('[Right] a STATIONARY tile (from === to) does not move at any instant', () => {
    for (const t of [0, 0.3, 0.7, 1]) {
      expect(posicaoDe(mov(5, 5), t).x).toBe(cellRect(5).x);
    }
  });

  it('[Interface] it carries the SQUARE it belongs to, so whoever draws can ask for the role', () => {
    expect(posicaoDe(mov(3, 0), 0.4).at, 'the destination, not the origin').toBe(0);
  });

  it('[Right] vertical motion uses `y` and not `x`', () => {
    const p = posicaoDe(mov(12, 0), 0.5);
    expect(p.x).toBe(cellRect(0).x);
    expect(p.y).toBeGreaterThan(cellRect(0).y);
  });
});

describe('the tiles of a whole move', () => {
  it('[Many] the two halves of a merge ARRIVE TOGETHER on the same square', () => {
    const r = slide(linha(2, 0, 0, 2), 'left');
    const fim = pecasNoInstante(r.movimentos, 1);
    expect(fim).toHaveLength(2);
    expect(fim[0].x).toBe(fim[1].x);
    expect(fim[0].y).toBe(fim[1].y);
  });

  it('[Boundary] and ON THE WAY they are apart — otherwise there is no meeting to watch', () => {
    const r = slide(linha(2, 0, 0, 2), 'left');
    const meio = pecasNoInstante(r.movimentos, 0.5);
    expect(meio[0].x).not.toBe(meio[1].x);
  });

  it('[Interface] the number that travels is the one from BEFORE the merge', () => {
    const r = slide(linha(8, 8, 0, 0), 'left');
    expect(pecasNoInstante(r.movimentos, 0.5).map((p) => p.exponent)).toEqual([3, 3]);
  });

  it('[Cross-check] the frame at t=1 holds the SAME positions as the board at rest, minus the merged', () => {
    // It is the seam between the animation and the resting frame: if they diverged, the tile would twitch on
    // the last frame.
    const r = slide(linha(0, 0, 4, 2), 'left');
    const fim = pecasNoInstante(r.movimentos, 1).map((p) => `${p.x},${p.y}`).sort();
    const paradas = pecasParadas(r.board).map((p) => `${p.x},${p.y}`).sort();
    expect(fim).toEqual(paradas);
  });
});

describe('when NOT to animate — the half the browser taught', () => {
  it('[Zero] a HIDDEN document does not animate, however positive the duration', () => {
    // ⚠️ A defect measured on 2026-09-05 with the browser pane hidden: in a hidden document the browser STOPS
    // `requestAnimationFrame` — it does not delay it, it stops it. The loop never received the next frame, the
    // promise never resolved, and the final frame never arrived: the model already at `4:4 12:4` and the
    // screen still showing the two previous tiles, with the counter reading "1 of 11" instead of "2 of 11".
    //
    // For the child that is switching tabs, or the tablet blanking its screen, mid-move — and coming back to a
    // board that LIES until she plays again. The right answer is not to animate faster: it is not to animate.
    expect(podeAnimar(DURACAO_MS, false)).toBe(false);
  });

  it('[One] a visible document with a positive duration: it animates', () => {
    expect(podeAnimar(DURACAO_MS, true)).toBe(true);
  });

  it('[Boundary] a zero duration does not animate even with the document in view', () => {
    expect(podeAnimar(0, true)).toBe(false);
  });

  it('[Interface] the rescue is LONGER than the animation, or it would cut it in half', () => {
    // It exists for the UNNAMED case — battery, a minimised window, a stuttering device. Firing before the
    // natural end would trade a rare defect for a constant one.
    expect(socorroMs(DURACAO_MS)).toBeGreaterThan(DURACAO_MS);
  });

  it('[Boundary] and it is not so long that anybody sees the board sitting still', () => {
    expect(socorroMs(DURACAO_MS)).toBeLessThan(1000);
  });
});

describe('the clock a SHELL drives, for when this game stops owning a loop', () => {
  it('[Interface] ⚠️ `dt` is FRAMES and the clock is MILLISECONDS — one named conversion, not a 16.7', () => {
    // The cartridge brief calls this the inherited convention that breaks most often: "physics copied from a
    // seconds-based tutorial runs wrong". A ticker's `deltaTime` of 1.0 means ONE frame at sixty.
    expect(MS_POR_QUADRO).toBeCloseTo(1000 / 60, 10);
    const c = criarRelogioDeQuadros();
    c.avancar(60);
    expect(c.relogio.agora(), 'sixty frames is one second').toBeCloseTo(1000, 6);
  });

  it('[Zero] time does not move on its own — nothing here reads a wall clock', () => {
    const c = criarRelogioDeQuadros();
    expect(c.relogio.agora()).toBe(0);
    expect(c.relogio.agora()).toBe(0);
  });

  it('[One] a frame callback runs on the NEXT tick, with the new time', () => {
    const c = criarRelogioDeQuadros();
    const vistos: number[] = [];
    c.relogio.proximoQuadro((agora) => vistos.push(agora));
    expect(vistos, 'not during the call that queued it').toEqual([]);
    c.avancar(1);
    expect(vistos).toHaveLength(1);
    expect(vistos[0]).toBeCloseTo(MS_POR_QUADRO, 6);
  });

  it('[Right] 🔴 a callback that asks for another frame waits for the NEXT tick', () => {
    // This is the one that would spin the whole animation out inside a single `update`. The animator asks for
    // the next frame from INSIDE a frame callback; draining the live queue would run the continuation in the
    // same tick, and again, and again — a loop inside the host's loop, with `t` racing to 1 in one frame.
    const c = criarRelogioDeQuadros();
    let voltas = 0;
    const pedir = () => { voltas++; if (voltas < 10) c.relogio.proximoQuadro(pedir); };
    c.relogio.proximoQuadro(pedir);
    c.avancar(1);
    expect(voltas, 'exactly one turn per tick').toBe(1);
    c.avancar(1);
    expect(voltas).toBe(2);
  });

  it('[Boundary] a timer fires when its time HAS COME, not a tick early', () => {
    const c = criarRelogioDeQuadros();
    let tocou = false;
    c.relogio.depoisDe(() => { tocou = true; }, 100);
    c.avancar(5);                       // 83.3 ms
    expect(tocou).toBe(false);
    c.avancar(1);                       // 100 ms
    expect(tocou).toBe(true);
    expect(c.pendentes(), 'and it is gone once it fired').toBe(0);
  });

  it('[Zero] a cancelled timer never fires, which is how a finished move drops its rescue', () => {
    const c = criarRelogioDeQuadros();
    let tocou = false;
    const id = c.relogio.depoisDe(() => { tocou = true; }, 10);
    c.relogio.cancelarEspera(id);
    c.avancar(600);
    expect(tocou).toBe(false);
    expect(c.pendentes(), 'one orphan timer per move, in a game of 200 moves').toBe(0);
  });

  it('[Right] ⚠️ on a tick carrying both, the TIMER goes first', () => {
    // `socorroMs` exists to release a move whose frames never arrived. A tick that carries the rescue AND a
    // queued frame must let the rescue win, rather than draw one more frame of a motion already over.
    const c = criarRelogioDeQuadros();
    const ordem: string[] = [];
    c.relogio.depoisDe(() => ordem.push('socorro'), 10);
    c.relogio.proximoQuadro(() => ordem.push('quadro'));
    c.avancar(1);
    expect(ordem).toEqual(['socorro', 'quadro']);
  });

  it('[Many] a big `dt` is ONE tick, not a catch-up storm', () => {
    // A tab returning from the background hands the shell a large delta. Replaying it as many small frames
    // would run the whole animation at once; the clock simply jumps, and `posicaoDe` clamps `t` at 1.
    const c = criarRelogioDeQuadros();
    let quadros = 0;
    // ⚠️ THE CAP IS NOT DECORATION: if the queue is ever drained LIVE instead of taken, this callback
    //    re-queues itself inside the same tick and the loop never ends. Measured while proving this gate red
    //    — the uncapped version ran for 3.5 seconds before failing. A gate that hangs CI instead of failing
    //    fast is a worse gate than none, so it stops itself and lets the assertion do the talking.
    const pedir = () => { quadros++; if (quadros < 50) c.relogio.proximoQuadro(pedir); };
    c.relogio.proximoQuadro(pedir);
    c.avancar(300);
    expect(quadros).toBe(1);
    expect(c.relogio.agora()).toBeCloseTo(300 * MS_POR_QUADRO, 6);
  });
});

describe('the two places a child can ask for less motion', () => {
  const CALMO = { parallax: true, decor: true, items: true, particles: true };
  const NORMAL = { parallax: false, decor: false, items: false, particles: false };

  it('[Zero] neither asking: the move animates', () => {
    expect(querMenosMovimento(false, NORMAL)).toBe(false);
    expect(duracaoDaJogada(querMenosMovimento(false, NORMAL))).toBe(DURACAO_MS);
  });

  it('[One] the SYSTEM asking is enough, as it always was', () => {
    expect(querMenosMovimento(true, NORMAL)).toBe(true);
  });

  it('[One] 🔴 and so is the ENGINE’s calm mode — the half that did nothing until 2026-09-11', () => {
    // Measured in the browser: clicking 🧩 in this game's own accessibility bar wrote exactly this object,
    // and the tiles went on sliding because the game read only `prefers-reduced-motion`.
    expect(querMenosMovimento(false, CALMO)).toBe(true);
    expect(duracaoDaJogada(querMenosMovimento(false, CALMO)), 'no animation, not a faster one').toBe(0);
  });

  it('[Right] ⚠️ stored flags can never switch the SYSTEM preference off', () => {
    // The asymmetry is the point: a child who set the preference in her operating system must not have it
    // overruled by flags this game found in storage. WCAG 2.3.3 has one safe direction to err in.
    expect(querMenosMovimento(true, NORMAL), 'the OS wins over stored `false`').toBe(true);
  });

  it('[Many] any single flag counts — the engine writes them together, from one level', () => {
    // `calmMotionPlan(nivel)` returns `{ sceneReduced: nivel >= 1 }` and that one value is written into all
    // four. Requiring all four would make a partially-written store silently mean "animate".
    for (const k of Object.keys(NORMAL)) {
      expect(querMenosMovimento(false, { ...NORMAL, [k]: true }), k).toBe(true);
    }
  });

  it('[Boundary] nothing stored yet is not an answer, and must not read as one', () => {
    expect(querMenosMovimento(false, null)).toBe(false);
    expect(querMenosMovimento(false, undefined)).toBe(false);
    expect(querMenosMovimento(false, {})).toBe(false);
    expect(querMenosMovimento(true, null), 'and the system still gets through').toBe(true);
  });
});

describe('reduced motion', () => {
  it('[Zero] with reduced motion the duration is ZERO — no animation, not a faster one', () => {
    expect(duracaoDaJogada(true)).toBe(0);
  });

  it('[One] without it, it is the declared duration', () => {
    expect(duracaoDaJogada(false)).toBe(DURACAO_MS);
  });

  it('[Boundary] and the duration is short: in a turn-based game, a long animation becomes waiting', () => {
    // A child who plays well chains moves quickly; above ~150 ms she presses the key again thinking it did not
    // work. The exact number is adjustable; the ceiling is what this test protects.
    expect(DURACAO_MS).toBeLessThanOrEqual(150);
    expect(DURACAO_MS).toBeGreaterThan(0);
  });
});
