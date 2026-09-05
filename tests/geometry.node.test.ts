// SPDX-License-Identifier: AGPL-3.0-or-later
// A GRADE 320×180 É PILAR, ENTÃO CABER NELA É GATE — não um "confere depois no navegador".
//
// O pilar 5 do ADR-0010 fixa 320×180, e um tabuleiro 4×4 com números de até cinco algarismos é apertado
// nesse espaço. Estas asserções são a conta feita uma vez e depois vigiada: se alguém aumentar a peça ou o
// vão "só um pouquinho", o tabuleiro sai da tela — e sair da tela é uma quebra que só aparece no aparelho da
// escola, que é onde ninguém está olhando.
//
// Elas também prendem a propriedade da qual TODO o resto depende: o canvas e a camada de DOM leem os MESMOS
// números. Um teste que só olhasse o desenho não veria a divergência; um que só olhasse o DOM, também não.
import { describe, expect, it } from 'vitest';
import { SIZE } from '../app/js/board.ts';
import {
  BOARD, BOARD_X, BOARD_Y, GAP, HUD_W, HUD_X, LOGICAL_H, LOGICAL_W, TILE, cellRect, fontFor,
} from '../app/js/geometry.ts';

describe('o tabuleiro cabe na grade do pilar 5', () => {
  it('[Interface] a grade lógica é exatamente 320×180', () => {
    expect([LOGICAL_W, LOGICAL_H]).toEqual([320, 180]);
  });

  it('[Right] o lado do tabuleiro é a conta das peças e dos vãos', () => {
    expect(BOARD).toBe(SIZE * TILE + (SIZE + 1) * GAP);
    expect(BOARD, '4·32 + 5·4').toBe(148);
  });

  it('[Boundary] nenhuma casa escapa da tela — nem a primeira nem a última', () => {
    for (let i = 0; i < SIZE * SIZE; i++) {
      const r = cellRect(i);
      expect(r.x, `casa ${i} à esquerda`).toBeGreaterThanOrEqual(0);
      expect(r.y, `casa ${i} acima`).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w, `casa ${i} à direita`).toBeLessThanOrEqual(LOGICAL_W);
      expect(r.y + r.h, `casa ${i} abaixo`).toBeLessThanOrEqual(LOGICAL_H);
    }
  });

  it('[Right] o HUD e o tabuleiro não se sobrepõem, e sobra margem entre os dois', () => {
    expect(HUD_X + HUD_W).toBeLessThan(BOARD_X);
    expect(HUD_W, 'estreito demais e o objetivo não cabe em uma linha').toBeGreaterThan(120);
  });

  it('[Interface] o tabuleiro é centrado na vertical, com folga igual em cima e embaixo', () => {
    expect(BOARD_Y).toBe(LOGICAL_H - BOARD - BOARD_Y);
  });

  it('[Many] as 16 casas são distintas, e vizinhas na linha ficam a `TILE + GAP` uma da outra', () => {
    const cantos = new Set(Array.from({ length: SIZE * SIZE }, (_, i) => `${cellRect(i).x},${cellRect(i).y}`));
    expect(cantos.size).toBe(SIZE * SIZE);
    expect(cellRect(1).x - cellRect(0).x).toBe(TILE + GAP);
    expect(cellRect(SIZE).y - cellRect(0).y).toBe(TILE + GAP);
    expect(cellRect(1).y, 'mesma linha, mesmo y').toBe(cellRect(0).y);
  });

  it('[Boundary] o número de mais algarismos ainda cabe na peça', () => {
    // Regra de bolso de fonte proporcional: um algarismo ocupa ~0,6 do corpo. Cinco algarismos é 65536, que
    // já é mais do que a rodada pede — se ele não coubesse, a peça vencedora apareceria cortada.
    for (const digitos of [1, 2, 3, 4, 5]) {
      const largura = digitos * fontFor(digitos) * 0.6;
      expect(largura, `${digitos} algarismos`).toBeLessThanOrEqual(TILE - 2);
    }
  });

  it('[Zero] a fonte NÃO é a mesma para todos: um `2` não pode aparecer no corpo de um `2048`', () => {
    expect(fontFor(1)).toBeGreaterThan(fontFor(4));
  });
});
