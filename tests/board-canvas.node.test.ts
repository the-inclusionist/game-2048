// SPDX-License-Identifier: AGPL-3.0-or-later
// O TABULEIRO DESENHADO, TESTADO SEM NAVEGADOR — e é a porta do ADR-0035 que torna isso possível.
//
// `pintarTabuleiro` recebe um `Desenho` (a porta do renderizador da engine) em vez de importar PixiJS. Aqui
// entra um desenho de MENTIRA que só anota o que foi pedido, e as asserções passam a ser sobre a ORDEM e a
// GEOMETRIA da pintura — que é tudo que se pode afirmar sem olhar para pixels de verdade.
//
// O que este arquivo NÃO prova, dito para ninguém confiar demais: que a coisa aparece bonita na tela. Isso é
// o teste de navegador e a captura. O que ele prova é que o tabuleiro é desenhado dentro da grade, que o
// alto contraste troca a cor pelo PAPEL e não pelo valor, e que nenhum número é pintado — que é a divisão de
// trabalho entre canvas e DOM que o pilar 2 exige.
import type { Desenho } from '@the-inclusionist/engine/render/port.js';
import { describe, expect, it } from 'vitest';
import { SIZE, type Board } from '../app/js/board.ts';
import { BOARD, BOARD_X, BOARD_Y, LOGICAL_H, LOGICAL_W, cellRect } from '../app/js/geometry.ts';
import { pintarTabuleiro } from '../app/js/render/board-canvas.ts';
import { FUNDO_DA_TELA, HC_POR_PAPEL, MOLDURA, fundoDe } from '../app/js/render/palette.ts';

interface Retangulo { cor: number; x: number; y: number; w: number; h: number }

/** Um `Desenho` que não desenha: anota. É o mínimo da porta, e nem um método a mais. */
function desenhoDeMentira() {
  const rects: Retangulo[] = [];
  let limpezas = 0;
  let cor = 0;
  const g: Desenho = {
    clear() { limpezas++; rects.length = 0; return this; },
    beginFill(c: number) { cor = c; return this; },
    drawRect(x: number, y: number, w: number, h: number) { rects.push({ cor, x, y, w, h }); return this; },
    endFill() { return this; },
  };
  return { g, rects, limpezas: () => limpezas };
}

const grade = (...v: number[]): Board => v.map((x) => (x === 0 ? 0 : Math.log2(x)));
const VAZIO = grade(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const COM_PAR = grade(2, 2, 4, 8, 4, 8, 2, 4, 8, 2, 4, 8, 2, 4, 8, 2);
const papelFixo = () => 'free' as const;

describe('pintarTabuleiro — a figura, e só a figura', () => {
  it('[Right] limpa antes de desenhar, senão o quadro anterior fica por baixo para sempre', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, VAZIO, { papel: papelFixo, altoContraste: false });
    expect(d.limpezas()).toBe(1);
  });

  it('[Many] desenha o fundo, a moldura e as 16 casas — nessa ordem', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, VAZIO, { papel: papelFixo, altoContraste: false });
    expect(d.rects).toHaveLength(2 + SIZE * SIZE);
    expect(d.rects[0]).toEqual({ cor: FUNDO_DA_TELA, x: 0, y: 0, w: LOGICAL_W, h: LOGICAL_H });
    expect(d.rects[1]).toEqual({ cor: MOLDURA, x: BOARD_X, y: BOARD_Y, w: BOARD, h: BOARD });
  });

  it('[Right] cada casa é desenhada exatamente onde a geometria diz — e a geometria é uma só', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, VAZIO, { papel: papelFixo, altoContraste: false });
    for (let i = 0; i < SIZE * SIZE; i++) {
      const r = cellRect(i);
      const pintada = d.rects[2 + i];
      expect({ x: pintada.x, y: pintada.y, w: pintada.w, h: pintada.h }, `casa ${i}`).toEqual(r);
    }
  });

  it('[Boundary] nada é pintado fora da grade 320×180', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, COM_PAR, { papel: papelFixo, altoContraste: false });
    for (const r of d.rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(LOGICAL_W);
      expect(r.y + r.h).toBeLessThanOrEqual(LOGICAL_H);
    }
  });

  it('[Right] no modo normal a cor da casa vem do VALOR da peça', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, COM_PAR, { papel: papelFixo, altoContraste: false });
    expect(d.rects[2].cor, 'a casa 0 tem um 2').toBe(fundoDe(1));
    expect(d.rects[2 + 3].cor, 'a casa 3 tem um 8').toBe(fundoDe(3));
  });

  it('[Right] no ALTO CONTRASTE a cor vem do PAPEL, e o valor deixa de mandar', () => {
    const d = desenhoDeMentira();
    const papel = (i: number) => (i === 0 || i === 1 ? 'goal' as const : 'structure' as const);
    pintarTabuleiro(d.g, COM_PAR, { papel, altoContraste: true });
    expect(d.rects[2].cor).toBe(HC_POR_PAPEL.goal);
    expect(d.rects[3].cor).toBe(HC_POR_PAPEL.goal);
    expect(d.rects[4].cor).toBe(HC_POR_PAPEL.structure);
    // ⚠️ E a prova de que o VALOR parou de mandar: as casas 0 e 3 têm peças diferentes (2 e 8) e, no alto
    // contraste com o mesmo papel, saem da MESMA cor. Sem esta linha, um alto contraste que continuasse
    // olhando o valor passaria despercebido.
    expect(d.rects[2 + 3].cor).toBe(HC_POR_PAPEL.structure);
  });

  it('[Zero] papel desconhecido cai em `free` em vez de sumir — pintar nada é pior que pintar o fundo', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, VAZIO, { papel: () => 'inexistente' as never, altoContraste: true });
    expect(d.rects[2].cor).toBe(HC_POR_PAPEL.free);
  });
});
