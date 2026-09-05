// SPDX-License-Identifier: AGPL-3.0-or-later
// O TABULEIRO DESENHADO, TESTADO SEM NAVEGADOR — e é a porta do ADR-0035 que torna isso possível.
//
// `pintarTabuleiro` recebe um `Desenho` (a porta do renderizador da engine) em vez de importar PixiJS. Aqui
// entra um desenho de MENTIRA que só anota o que foi pedido, e as asserções passam a ser sobre a ORDEM e a
// GEOMETRIA da pintura — que é tudo que se pode afirmar sem olhar para pixels de verdade.
//
// ========================= A PINTURA TEM TRÊS CAMADAS, E A ORDEM É A AFIRMAÇÃO =========================
//   1. o fundo da tela;
//   2. a moldura e as DEZESSEIS CASAS VAZIAS — os buracos do tabuleiro, que existem sempre e não dependem
//      de peça nenhuma. São elas que fazem o tabuleiro continuar sendo um tabuleiro enquanto as peças voam;
//   3. as PEÇAS, por cima, nas posições que `animation.ts` calculou — que podem estar ENTRE duas casas.
//
// A separação entre 2 e 3 é o que permitiu a animação existir. Enquanto a pintura lia o tabuleiro e
// desenhava por índice, o mais que ela podia fazer era teletransportar as peças de um quadro para o outro.
//
// O que este arquivo NÃO prova, dito para ninguém confiar demais: que a coisa aparece bonita na tela. Isso é
// o teste de navegador e a captura. O que ele prova é que se desenha dentro da grade, que o alto contraste
// troca a cor pelo PAPEL e não pelo valor, e que nenhum número é pintado.
import type { Desenho } from '@the-inclusionist/engine/render/port.js';
import { describe, expect, it } from 'vitest';
import { SIZE, slide, type Board } from '../app/js/board.ts';
import { pecasNoInstante, pecasParadas } from '../app/js/animation.ts';
import { BOARD, BOARD_X, BOARD_Y, LOGICAL_H, LOGICAL_W, TILE, cellRect } from '../app/js/geometry.ts';
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
const linha = (...v: number[]): Board => grade(...v, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const VAZIO = grade(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const COM_PAR = grade(2, 2, 4, 8, 4, 8, 2, 4, 8, 2, 4, 8, 2, 4, 8, 2);
const papelFixo = () => 'free' as const;

/** Onde começam as casas vazias, e onde começam as peças. */
const CASAS = 2;
const PECAS = CASAS + SIZE * SIZE;

describe('pintarTabuleiro — a figura, e só a figura', () => {
  it('[Right] limpa antes de desenhar, senão o quadro anterior fica por baixo para sempre', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas: [] });
    expect(d.limpezas()).toBe(1);
  });

  it('[Zero] tabuleiro sem peça nenhuma: fundo, moldura e as 16 casas vazias — nada mais', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas: [] });
    expect(d.rects).toHaveLength(PECAS);
    expect(d.rects[0]).toEqual({ cor: FUNDO_DA_TELA, x: 0, y: 0, w: LOGICAL_W, h: LOGICAL_H });
    expect(d.rects[1]).toEqual({ cor: MOLDURA, x: BOARD_X, y: BOARD_Y, w: BOARD, h: BOARD });
  });

  it('[Right] as casas VAZIAS existem sempre, na cor do buraco, e não na cor de peça nenhuma', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas: pecasParadas(COM_PAR) });
    for (let i = 0; i < SIZE * SIZE; i++) {
      const casa = d.rects[CASAS + i];
      expect({ x: casa.x, y: casa.y, w: casa.w, h: casa.h }, `casa ${i}`).toEqual(cellRect(i));
      expect(casa.cor, `casa ${i} é buraco, mesmo com peça em cima`).toBe(fundoDe(0));
    }
  });

  it('[Many] cada peça vira UM retângulo, por cima das casas, na cor do seu valor', () => {
    const d = desenhoDeMentira();
    const pecas = pecasParadas(COM_PAR);
    pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas });
    expect(d.rects).toHaveLength(PECAS + pecas.length);
    pecas.forEach((p, k) => {
      expect(d.rects[PECAS + k]).toEqual({ cor: fundoDe(p.exponent), x: p.x, y: p.y, w: TILE, h: TILE });
    });
  });

  it('[Interface] no MEIO de um deslize a peça é pintada ENTRE duas casas — que é o ponto da animação', () => {
    const r = slide(linha(0, 0, 0, 2), 'left');
    const meio = pecasNoInstante(r.movimentos, 0.5);
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas: meio });
    const pintada = d.rects[PECAS];
    expect(pintada.x).toBeGreaterThan(cellRect(0).x);
    expect(pintada.x).toBeLessThan(cellRect(3).x);
    // E não coincide com casa nenhuma: se coincidisse, a "animação" seria um salto entre posições válidas.
    const casas = Array.from({ length: SIZE * SIZE }, (_, i) => cellRect(i).x);
    expect(casas).not.toContain(pintada.x);
  });

  it('[Boundary] nada é pintado fora da grade 320×180, nem parado nem em voo', () => {
    const r = slide(COM_PAR, 'left');
    for (const pecas of [pecasParadas(COM_PAR), pecasNoInstante(r.movimentos, 0.5)]) {
      const d = desenhoDeMentira();
      pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas });
      for (const rect of d.rects) {
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.w).toBeLessThanOrEqual(LOGICAL_W);
        expect(rect.y + rect.h).toBeLessThanOrEqual(LOGICAL_H);
      }
    }
  });

  it('[Right] no ALTO CONTRASTE a cor vem do PAPEL, e o valor deixa de mandar', () => {
    const d = desenhoDeMentira();
    const papel = (i: number) => (i === 0 || i === 1 ? 'goal' as const : 'structure' as const);
    const pecas = pecasParadas(COM_PAR);
    pintarTabuleiro(d.g, { papel, altoContraste: true, pecas });
    expect(d.rects[CASAS + 0].cor, 'a CASA 0 também segue o papel').toBe(HC_POR_PAPEL.goal);
    expect(d.rects[CASAS + 2].cor).toBe(HC_POR_PAPEL.structure);
    // ⚠️ A prova de que o VALOR parou de mandar: a peça 0 vale 2 e a peça 3 vale 8, e as duas saem da cor do
    // PAPEL delas. Sem esta linha, um alto contraste que continuasse olhando o valor passaria despercebido.
    expect(d.rects[PECAS + 0].cor, 'peça de valor 2, papel goal').toBe(HC_POR_PAPEL.goal);
    expect(d.rects[PECAS + 3].cor, 'peça de valor 8, papel structure').toBe(HC_POR_PAPEL.structure);
  });

  it('[Zero] papel desconhecido cai em `free` em vez de sumir — pintar nada é pior que pintar o fundo', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, { papel: () => 'inexistente' as never, altoContraste: true, pecas: [] });
    expect(d.rects[CASAS].cor).toBe(HC_POR_PAPEL.free);
  });

  it('[Exception] tabuleiro vazio não pinta peça nenhuma, e não é um caso especial no código', () => {
    const d = desenhoDeMentira();
    pintarTabuleiro(d.g, { papel: papelFixo, altoContraste: false, pecas: pecasParadas(VAZIO) });
    expect(d.rects).toHaveLength(PECAS);
  });
});
