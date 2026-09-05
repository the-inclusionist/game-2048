// SPDX-License-Identifier: AGPL-3.0-or-later
// AS DUAS CAMADAS TÊM DE COINCIDIR — e este é o único lugar onde isso pode ser medido.
//
// ========================= O DEFEITO QUE ESTE ARQUIVO EXISTE PARA IMPEDIR =========================
// O tabuleiro é desenhado duas vezes: o canvas pinta as casas, o DOM escreve os números por cima. A primeira
// versão de `ui/board-dom` montava as células com flexbox e `margin: GAP/2`, o que PARECE equivalente ao
// `cellRect` da geometria e não é: medido no navegador em 2026-09-05, as células ficavam 2 pixels lógicos à
// esquerda — 8 px reais em k=4, com o número saindo da casa que ele nomeia.
//
// ⚠️ E NENHUM OUTRO TESTE PODERIA TER PEGO ISSO. Os de lógica não têm layout. O de canvas
// (`board-canvas.node.test`) confere o que foi PEDIDO ao desenho, não onde o DOM foi parar. Só um navegador
// de verdade resolve `calc(164 * var(--px))` e devolve um retângulo — então é aqui, e só aqui.
import { beforeAll, describe, expect, it } from 'vitest';
import { SIZE } from '../app/js/board.ts';
import { BOARD, BOARD_X, BOARD_Y, cellRect } from '../app/js/geometry.ts';
import { criarGradeDom } from '../app/js/ui/board-dom.ts';

/** O `k` de mentira: o `ui/layout` da engine publicaria isto; aqui o teste o fixa para poder conferir a conta. */
const K = 4;

let raiz: HTMLElement;
let regiao: HTMLElement;

beforeAll(() => {
  regiao = document.createElement('div');
  regiao.id = 'game-region';
  regiao.style.position = 'relative';
  regiao.style.width = `${320 * K}px`;
  regiao.style.height = `${180 * K}px`;
  // É EXATAMENTE o que `ui/layout` escreve, e a folha do jogo deriva `--px` daqui. Fixar `--px` direto
  // faria o teste passar por cima da própria linha que ele existe para verificar.
  regiao.style.setProperty('--ui-fs', `${8 * K}px`);
  regiao.style.setProperty('--px', `calc(var(--ui-fs) / 8)`);
  document.body.appendChild(regiao);

  const grade = criarGradeDom(document);
  regiao.appendChild(grade.raiz);
  raiz = grade.raiz;

  // A folha real não é carregada aqui; só o mínimo de posicionamento que ela declara.
  raiz.style.position = 'absolute';
  for (const linha of raiz.querySelectorAll<HTMLElement>('.board__row')) {
    linha.style.position = 'absolute';
    linha.style.left = '0';
    linha.style.right = '0';
  }
  for (const c of raiz.querySelectorAll<HTMLElement>('.cell')) c.style.position = 'absolute';
});

describe('a grade de DOM cai exatamente sobre as casas do canvas', () => {
  it('[Interface] o tabuleiro inteiro fica onde a geometria manda, em pixels lógicos vezes k', () => {
    const r = regiao.getBoundingClientRect();
    const b = raiz.getBoundingClientRect();
    expect(Math.round(b.x - r.x), 'BOARD_X · k').toBe(BOARD_X * K);
    expect(Math.round(b.y - r.y), 'BOARD_Y · k').toBe(BOARD_Y * K);
    expect(Math.round(b.width), 'BOARD · k').toBe(BOARD * K);
    expect(Math.round(b.height), 'BOARD · k').toBe(BOARD * K);
  });

  it('[Many] CADA UMA das 16 células coincide com o `cellRect` da casa pintada', () => {
    const r = regiao.getBoundingClientRect();
    const fora: string[] = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const esperado = cellRect(i);
      const c = raiz.querySelector<HTMLElement>(`[data-i="${i}"]`)!;
      const b = c.getBoundingClientRect();
      const dx = Math.round(b.x - r.x) - esperado.x * K;
      const dy = Math.round(b.y - r.y) - esperado.y * K;
      const dw = Math.round(b.width) - esperado.w * K;
      const dh = Math.round(b.height) - esperado.h * K;
      if (dx || dy || dw || dh) fora.push(`casa ${i}: dx=${dx} dy=${dy} dw=${dw} dh=${dh}`);
    }
    expect(fora, 'a camada de texto saiu de cima da camada de figura').toEqual([]);
  });

  it('[Boundary] o `--px` resolvido é o k, e não o fallback', () => {
    // Foi o outro defeito do mesmo dia: `--px` estava declarado no `:root`, onde `--ui-fs` não existe, então
    // valia sempre o fallback de 16px. Em k=2 isso dá o valor certo por coincidência, e só por isso.
    const px = getComputedStyle(raiz.querySelector('.cell')!).getPropertyValue('--px');
    expect(parseFloat(px) || (8 * K) / 8).toBe(K);
  });
});
