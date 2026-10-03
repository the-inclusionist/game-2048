// SPDX-License-Identifier: AGPL-3.0-or-later
// THE «COMO JOGAR» SLIDES — declared by the cartridge, as ADR-0195 says they must be.
//
// 📏 WHAT THIS IS BORN FROM. Measured on the built page on 2026-10-03, before the declaration existed: pausing
// and opening «Ajuda — Como jogar» showed «AJUDA VOLTAR ◀ W EMPURRAR PARA CIMA ▶» — the engine's button list
// and nothing else. A child who paused BECAUSE she did not know how to play found the keys she could press and
// no sentence telling her what the game is. The engine's own record quotes the Dev on whose job it is: «O
// "Como jogar" é justamente algo a ser feito pelo cartucho.»
import { describe, expect, it } from 'vitest';
import { SLIDES } from '../app/js/how-to-play.ts';
import { cartridge } from '../src/index.ts';
import pt from '../app/js/i18n/pt.ts';
import en from '../app/js/i18n/en.ts';
import es from '../app/js/i18n/es.ts';

describe('the cartridge declares how to play', () => {
  it('[Right] 🔴 the hooks the engine reads carry the slides', () => {
    // The door itself. Without it the help shows the buttons alone and nothing reports a thing — «absent is
    // well formed», says `howToPlayProblems`, which is right and is exactly why a gate is needed here.
    expect((cartridge.hooks as { howToPlay?: unknown }).howToPlay, 'declared on the cartridge').toBe(SLIDES);
    expect(SLIDES.length, 'a help with no slide is the absence this gate exists to catch').toBeGreaterThan(2);
  });

  it('[Many] every slide’s sentence resolves in all three languages', () => {
    // A slide whose text the dictionaries lack is LEFT OUT — never shown as its key — and named in `problems`.
    // So a missing translation is a child in English or Spanish meeting a shorter help, silently.
    for (const s of SLIDES) {
      expect(pt[s.textKey as keyof typeof pt], `pt ${s.textKey}`).toBeTruthy();
      expect(en[s.textKey as keyof typeof en], `en ${s.textKey}`).toBeTruthy();
      expect(es[s.textKey as keyof typeof es], `es ${s.textKey}`).toBeTruthy();
    }
  });

  it('[Many] 🔴 every figure is a PURE function of the clock it is given', () => {
    // ⚠️ WCAG 2.3.3, and the engine's `FigureClock` is what makes it checkable: under reduced motion the engine
    //    hands the figure time 0, ONCE, and never again. A figure holding a counter of its own would go on
    //    moving for a child who asked for stillness. Drawing the same instant twice must produce the same
    //    calls — and a different instant must produce different ones, or the figure is not animated at all.
    for (const s of SLIDES) {
      if (!s.figure) continue;
      const chamadas = (t: number): string[] => {
        const feitas: string[] = [];
        const ctx = new Proxy({} as Record<string, unknown>, {
          get: (_a, k) => (typeof k === 'string' && ['fillRect', 'fillText'].includes(k)
            ? (...args: unknown[]) => { feitas.push(`${k}(${args.map((v) => (typeof v === 'number' ? v.toFixed(2) : v)).join(',')})`); }
            : () => undefined),
          set: () => true,
        });
        s.figure!({ ctx: ctx as unknown as CanvasRenderingContext2D, width: 200, height: 200, time: t });
        return feitas;
      };
      expect(chamadas(0), `${s.textKey} at t=0 is reproducible`).toEqual(chamadas(0));
      expect(chamadas(0).length, `${s.textKey} draws something at t=0`).toBeGreaterThan(0);
      expect(chamadas(900), `${s.textKey} actually moves`).not.toEqual(chamadas(0));
    }
  });

  it('[Boundary] a figure drawn at a huge time is still inside its surface', () => {
    // The phase wraps, so no instant can put a tile off the panel — including the ones a long help session
    // reaches. A figure that drifted would walk out of the canvas with nothing to stop it.
    for (const s of SLIDES) {
      if (!s.figure) continue;
      const fora: string[] = [];
      const ctx = new Proxy({} as Record<string, unknown>, {
        get: (_a, k) => (k === 'fillRect'
          ? (x: number, y: number, w: number, h: number) => {
            if (x < -1 || y < -1 || x + w > 201 || y + h > 201) fora.push(`${s.textKey} @${x.toFixed(1)},${y.toFixed(1)}`);
          }
          : () => undefined),
        set: () => true,
      });
      for (const t of [0, 1234, 99999, 1e7]) {
        s.figure({ ctx: ctx as unknown as CanvasRenderingContext2D, width: 200, height: 200, time: t });
      }
      expect(fora, 'a figure that leaves its surface is a drawing nobody sees').toEqual([]);
    }
  });
});
