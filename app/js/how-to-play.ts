// SPDX-License-Identifier: AGPL-3.0-or-later
// HOW TO PLAY — the cartridge's slides, shown by the engine's help panel (ADR-0195; issue #188).
//
// The engine's own words, quoting the Dev: «O "Como jogar" é justamente algo a ser feito pelo cartucho.» Until
// 2026-10-03 this game declared none, and 📏 the help panel measured on the built page showed exactly this:
// «AJUDA VOLTAR ◀ W EMPURRAR PARA CIMA ▶» — the button list and nothing else. A child who paused because she
// did not know how to play found the keys she could press and no sentence telling her what the game is.
//
// ========================= WHY THE FIGURES ARE CODE =========================
// `HowToPlaySlide.figure` receives `{ ctx, width, height, time }` — a plain 2D context and a clock. The engine's
// note says why it is a function and not a picture: «art stays data the game draws, never an embedded picture».
// Drawing them here also means they follow the game's OWN palette, so the explanation looks like the thing it
// explains, and a child who has seen the help recognises the board when she gets there.
//
// 📌 `time` IS GIVEN, NEVER TAKEN. The engine's frame loop drives it and hands the figure the moment to draw —
// and under reduced motion it hands time 0, once, and never again (`FigureClock`). So a figure must be a pure
// function of `time`: anything that advances a counter of its own would keep moving for a child who asked for
// stillness, which is WCAG 2.3.3 and the whole reason the clock is injected.
import { TILE, GAP } from './geometry.ts';
import { fundoDe, inkFor } from './render/palette.ts';

/** What the engine hands a figure. Repeated structurally rather than imported: see the note in `cartridge-types`. */
export interface SuperficieDaFigura {
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly time: number;
}

/** One slide: the KEY of its sentence, and optionally something to draw. */
export interface Slide {
  readonly textKey: string;
  readonly figure?: (s: SuperficieDaFigura) => void;
}

/** The whole cycle of a figure, in milliseconds: slide, hold, start again. */
const CICLO = 2600;

/** `0…1` across the cycle, and it is the ONLY thing a figure may read from the clock. */
function fase(time: number): number {
  return ((time % CICLO) + CICLO) % CICLO / CICLO;
}

/**
 * Ease in and out, so a tile does not start and stop like a jump cut.
 *
 * 📌 The same shape `app/js/animation.ts` uses for the real board. One feel, two places — a help whose motion
 * reads differently from the game's teaches the wrong thing about the game.
 */
const suave = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** A tile, drawn exactly as the board draws one: its colour from the value, its ink chosen for contrast. */
function peca(s: SuperficieDaFigura, x: number, y: number, lado: number, valor: number): void {
  const { ctx } = s;
  const expoente = Math.round(Math.log2(valor));
  const fundo = fundoDe(expoente);
  ctx.fillStyle = `#${fundo.toString(16).padStart(6, '0')}`;
  ctx.fillRect(x, y, lado, lado);
  ctx.fillStyle = `#${inkFor(fundo).toString(16).padStart(6, '0')}`;
  ctx.font = `bold ${Math.round(lado * 0.42)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(valor), x + lado / 2, y + lado / 2);
}

/** The board's empty frame — four by four, in the proportions of `geometry.ts`. */
function moldura(s: SuperficieDaFigura, lado: number, vao: number, ox: number, oy: number): void {
  const { ctx } = s;
  ctx.fillStyle = '#2b3145';
  ctx.fillRect(ox - vao, oy - vao, 4 * lado + 5 * vao, 4 * lado + 5 * vao);
  ctx.fillStyle = '#101319';
  for (let i = 0; i < 16; i++) {
    const cx = ox + (i % 4) * (lado + vao);
    const cy = oy + Math.floor(i / 4) * (lado + vao);
    ctx.fillRect(cx, cy, lado, lado);
  }
}

/** The geometry of a figure's little board, scaled to whatever surface the engine gives. */
function medidas(s: SuperficieDaFigura) {
  const escala = Math.min(s.width, s.height) / (4 * TILE + 5 * GAP) * 0.82;
  const lado = TILE * escala;
  const vao = GAP * escala;
  const largura = 4 * lado + 3 * vao;
  return { lado, vao, ox: (s.width - largura) / 2, oy: (s.height - largura) / 2 };
}

export const SLIDES: readonly Slide[] = Object.freeze([
  {
    // «Empurre o tabuleiro. TODAS as peças andam de uma vez» — the rule a 2048 beginner gets wrong first:
    // the arrows do not move a cursor, they move the whole board.
    textKey: 'help.push',
    figure: (s) => {
      const { lado, vao, ox, oy } = medidas(s);
      moldura(s, lado, vao, ox, oy);
      const t = suave(Math.min(fase(s.time) * 1.6, 1));
      // three tiles on the top row, all sliding left together, which is the point of the slide
      for (const [coluna, valor] of [[1, 2], [2, 4], [3, 2]] as const) {
        const de = ox + coluna * (lado + vao);
        const para = ox + (coluna - 1) * (lado + vao);
        peca(s, de + (para - de) * t, oy, lado, valor);
      }
    },
  },
  {
    // The merge, which is the whole game. Two 2s meet and become a 4.
    textKey: 'help.merge',
    figure: (s) => {
      const { lado, vao, ox, oy } = medidas(s);
      moldura(s, lado, vao, ox, oy);
      const f = fase(s.time);
      const y = oy + (lado + vao);
      if (f < 0.55) {
        const t = suave(f / 0.55);
        const de = ox + 2 * (lado + vao);
        const para = ox + (lado + vao);
        peca(s, ox + (lado + vao) * (1 - t) * 0, y, lado, 2);           // the one that waits
        peca(s, de + (para - de) * t, y, lado, 2);                       // the one that arrives
      } else {
        peca(s, ox, y, lado, 4);                                         // and they are one, worth double
      }
    },
  },
  {
    // What ends the round, and the one number a child is aiming at.
    textKey: 'help.goal',
    figure: (s) => {
      const { lado, vao, ox, oy } = medidas(s);
      moldura(s, lado, vao, ox, oy);
      // the doubling ladder, one tile per step, appearing in turn
      const passos = [2, 4, 8, 16, 32, 64, 128, 256] as const;
      const quantos = 1 + Math.floor(fase(s.time) * passos.length);
      for (let i = 0; i < Math.min(quantos, passos.length); i++) {
        peca(s, ox + (i % 4) * (lado + vao), oy + Math.floor(i / 4) * (lado + vao), lado, passos[i]);
      }
    },
  },
]);
