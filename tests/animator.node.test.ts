// SPDX-License-Identifier: AGPL-3.0-or-later
// THE ANIMATION LOOP, WITH A FAKE CLOCK — and it is the only way to prove its edges.
//
// ========================= WHY THE CLOCK COMES IN AS A PARAMETER =========================
// The loop used to live inside `bootar()` and there was no way to verify it. The browser's
// `requestAnimationFrame` does not run in a hidden document, and the attempt to observe it live returned ZERO
// frames three times in a row — not because it was wrong, but because the environment would not let it run.
// Trusting the eye to know whether cancellation and the rescue work is the gate that could never be made red.
//
// The way out is the one the engine's `core/rng` already uses for chance: inject it. With the fake clock time
// advances by hand, and the edges — the move that cancels the previous one, the rescue that saves the final
// frame, the `t` that never goes past 1 — become assertions instead of hopes.
//
// ⚠️ WHAT IT DOES NOT PROVE, said so nobody trusts it too far: that the real `requestAnimationFrame` calls the
// loop sixty times a second. That line is `relogioDoNavegador`, four lines long and with no decision in it.
import { describe, expect, it, vi } from 'vitest';
import { criarAnimador, socorroMs, type Peca, type Relogio } from '../app/js/animation.ts';
import { slide, type Board, type Movimento } from '../app/js/board.ts';
import { cellRect } from '../app/js/geometry.ts';

const grade = (...v: number[]): Board => v.map((x) => (x === 0 ? 0 : Math.log2(x)));
const linha = (...v: number[]): Board => grade(...v, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const MOVS: readonly Movimento[] = slide(linha(0, 0, 0, 2), 'left').movimentos;

/** A fake clock: time only moves when the test says so. */
function relogioFalso() {
  let agora = 0;
  const quadros: ((t: number) => void)[] = [];
  const esperas = new Map<number, { fn: () => void; quando: number }>();
  let proximoId = 1;

  const relogio: Relogio = {
    agora: () => agora,
    proximoQuadro: (fn) => { quadros.push(fn); },
    depoisDe: (fn, ms) => { const id = proximoId++; esperas.set(id, { fn, quando: agora + ms }); return id; },
    cancelarEspera: (id) => { esperas.delete(id); },
  };

  return {
    relogio,
    /** Advance `ms` and deliver ONE frame, the way the browser would. */
    async passo(ms: number) {
      agora += ms;
      const fn = quadros.shift();
      if (fn) fn(agora);
      await Promise.resolve();
    },
    /** Advance time WITHOUT delivering a frame — the browser with its frame clock stopped. */
    async congelado(ms: number) {
      agora += ms;
      for (const [id, e] of [...esperas]) if (e.quando <= agora) { esperas.delete(id); e.fn(); }
      await Promise.resolve();
    },
    quadrosPendentes: () => quadros.length,
    esperasPendentes: () => esperas.size,
  };
}

describe('the animation loop', () => {
  it('[One] it asks for a frame, draws, and resolves when the time runs out', async () => {
    const c = relogioFalso();
    const pintados: Peca[][] = [];
    const a = criarAnimador(c.relogio, (p) => pintados.push([...p]));

    let acabou = false;
    void a.correr(MOVS, 100, true).then(() => { acabou = true; });

    await c.passo(50);
    expect(pintados, 'it drew the middle frame').toHaveLength(1);
    expect(acabou, 'and it has not finished yet').toBe(false);

    await c.passo(50);
    expect(acabou).toBe(true);
  });

  it('[Boundary] the last frame is drawn with t = 1, and it is not skipped', async () => {
    const c = relogioFalso();
    const pintados: Peca[][] = [];
    const a = criarAnimador(c.relogio, (p) => pintados.push([...p]));
    void a.correr(MOVS, 100, true);
    await c.passo(100);
    // The tile leaves square 3 and goes to square 0: at the end it must sit EXACTLY on square 0. A loop that
    // resolved before drawing t=1 would leave the tile a pixel off until the resting frame corrected it — a
    // twitch at the end of every move.
    const ultima = pintados.at(-1)![0];
    expect(ultima.at).toBe(0);
    expect({ x: ultima.x, y: ultima.y }).toEqual({ x: cellRect(0).x, y: cellRect(0).y });
  });

  it('[Boundary] a clock that JUMPS does not throw the tile off the board: t is clamped at 1', async () => {
    const c = relogioFalso();
    const pintados: Peca[][] = [];
    const a = criarAnimador(c.relogio, (p) => pintados.push([...p]));
    void a.correr(MOVS, 100, true);
    await c.passo(5000); // the tab came back from the background and the clock leapt five seconds
    expect(pintados).toHaveLength(1);
    expect(Number.isFinite(pintados[0][0].x)).toBe(true);
  });

  it('[Right] A NEW MOVE CANCELS THE PREVIOUS ONE — the first resolves and stops drawing', async () => {
    // A child holding the arrow key down produces moves faster than the animation. Queueing them would leave
    // the board owing animations, with the screen lagging behind the model.
    const c = relogioFalso();
    let desenhos = 0;
    const a = criarAnimador(c.relogio, () => { desenhos++; });

    let primeiraAcabou = false;
    void a.correr(MOVS, 100, true).then(() => { primeiraAcabou = true; });
    await c.passo(30);
    const aposPrimeira = desenhos;

    void a.correr(MOVS, 100, true);
    await c.passo(10);
    expect(primeiraAcabou, 'the first releases whoever was awaiting it instead of hanging').toBe(true);

    // The FIRST one's pending frame still exists in the clock's queue; when it is delivered, it must give up.
    await c.passo(10);
    expect(desenhos, 'the first must not go on painting over the second')
      .toBeLessThanOrEqual(aposPrimeira + 3);
  });

  it('[Zero] with the frame clock STOPPED, the rescue resolves anyway', async () => {
    // The defect measured on 2026-09-05: without this the promise never resolved, the final frame never
    // arrived, and the screen kept showing the previous board while the model was already another.
    const c = relogioFalso();
    const a = criarAnimador(c.relogio, () => {});
    let acabou = false;
    void a.correr(MOVS, 100, true).then(() => { acabou = true; });

    await c.congelado(socorroMs(100) - 1);
    expect(acabou, 'still within the deadline').toBe(false);

    await c.congelado(2);
    expect(acabou, 'the rescue released the caller, who draws the final frame').toBe(true);
  });

  it('[Interface] finishing on time, the rescue is CANCELLED — nothing stays scheduled', async () => {
    const c = relogioFalso();
    const a = criarAnimador(c.relogio, () => {});
    void a.correr(MOVS, 100, true);
    await c.passo(100);
    expect(c.esperasPendentes(), 'one orphan timer per move, in a game of 200 moves').toBe(0);
  });

  it('[Zero] a hidden document: it resolves at once and asks for no frame at all', async () => {
    const c = relogioFalso();
    const desenhar = vi.fn();
    const a = criarAnimador(c.relogio, desenhar);
    await a.correr(MOVS, 100, false);
    expect(c.quadrosPendentes()).toBe(0);
    expect(desenhar).not.toHaveBeenCalled();
  });

  it('[Zero] zero duration (reduced motion): the same, and without a single frame', async () => {
    const c = relogioFalso();
    const desenhar = vi.fn();
    const a = criarAnimador(c.relogio, desenhar);
    await a.correr(MOVS, 0, true);
    expect(desenhar).not.toHaveBeenCalled();
  });

  it('[Zero] a move with no movement at all does not animate', async () => {
    const c = relogioFalso();
    const desenhar = vi.fn();
    const a = criarAnimador(c.relogio, desenhar);
    await a.correr([], 100, true);
    expect(desenhar).not.toHaveBeenCalled();
  });
});
