// SPDX-License-Identifier: AGPL-3.0-or-later
// A ANIMAÇÃO, TESTADA SEM RELÓGIO — porque a parte que importa não é o relógio.
//
// ========================= O CORTE, E POR QUE ELE PAGA =========================
// `animation.ts` não sabe o que é `requestAnimationFrame`, `performance.now` ou canvas: entra um `t` entre 0
// e 1, sai posição em pixels lógicos. Todo o resto — quando chamar, quantas vezes, quando parar — vive no
// `boot/main.ts`, que é onde o tempo mora.
//
// O corte é o que torna estas asserções possíveis. Um teste que precisasse esperar 110 ms de verdade seria
// lento, intermitente, e mediria a fidelidade do temporizador do navegador em vez da conta da interpolação.
//
// ========================= O QUE ELE NÃO PROVA =========================
// Que a animação PARECE boa, e que o laço realmente chama isto sessenta vezes por segundo. O primeiro é
// olho; o segundo é `tests/animacao.browser.test.ts`, que roda o jogo de verdade.
import { describe, expect, it } from 'vitest';
import {
  DURACAO_MS, duracaoDaJogada, easeOut, pecasNoInstante, pecasParadas, podeAnimar, posicaoDe, socorroMs,
} from '../app/js/animation.ts';
import { SIZE, slide, type Board, type Movimento } from '../app/js/board.ts';
import { cellRect } from '../app/js/geometry.ts';

const grade = (...v: number[]): Board => v.map((x) => (x === 0 ? 0 : Math.log2(x)));
const linha = (...v: number[]): Board => grade(...v, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const mov = (from: number, to: number, exponent = 1, merged = false): Movimento => ({ from, to, exponent, merged });

describe('a curva', () => {
  it('[Boundary] começa em 0 e termina em 1 — senão a peça salta na primeira ou na última passagem', () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
  });

  it('[Right] FREIA no fim: a segunda metade do caminho leva mais tempo que a primeira', () => {
    // É o que faz o olho entender que a peça ENCOSTOU na parede em vez de ter sido teletransportada. Um
    // `easeIn` faria o contrário e a peça pareceria cair.
    expect(easeOut(0.5), 'metade do tempo, mais de metade do caminho').toBeGreaterThan(0.5);
  });

  it('[Many] é monotônica — a peça nunca anda para trás no meio do movimento', () => {
    let anterior = -1;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = easeOut(t);
      expect(v).toBeGreaterThan(anterior);
      anterior = v;
    }
  });
});

describe('a posição de uma peça no instante t', () => {
  it('[Zero] em t=0 ela está exatamente na casa de ORIGEM', () => {
    const p = posicaoDe(mov(3, 0), 0);
    expect({ x: p.x, y: p.y }).toEqual({ x: cellRect(3).x, y: cellRect(3).y });
  });

  it('[One] em t=1 ela está exatamente na casa de DESTINO', () => {
    const p = posicaoDe(mov(3, 0), 1);
    expect({ x: p.x, y: p.y }).toEqual({ x: cellRect(0).x, y: cellRect(0).y });
  });

  it('[Interface] no meio ela está ENTRE as duas, e em casa nenhuma', () => {
    const p = posicaoDe(mov(3, 0), 0.5);
    expect(p.x).toBeGreaterThan(cellRect(0).x);
    expect(p.x).toBeLessThan(cellRect(3).x);
    const casas = Array.from({ length: SIZE * SIZE }, (_, i) => cellRect(i).x);
    expect(casas, 'se coincidisse com uma casa, seria um salto e não um deslize').not.toContain(p.x);
  });

  it('[Boundary] um `t` fora de [0,1] é TRAVADO, não extrapolado', () => {
    // Relógio que pula — aba em segundo plano, aparelho lento — produz `t` maior que 1. Extrapolar jogaria
    // a peça para fora do tabuleiro, e é o pior modo de falhar: visível, feio e num aparelho que não é o meu.
    expect(posicaoDe(mov(3, 0), 2).x).toBe(cellRect(0).x);
    expect(posicaoDe(mov(3, 0), -1).x).toBe(cellRect(3).x);
  });

  it('[Right] a peça PARADA (from === to) não se move em instante nenhum', () => {
    for (const t of [0, 0.3, 0.7, 1]) {
      expect(posicaoDe(mov(5, 5), t).x).toBe(cellRect(5).x);
    }
  });

  it('[Interface] ela carrega a CASA a que pertence, para quem desenha poder perguntar o papel', () => {
    expect(posicaoDe(mov(3, 0), 0.4).at, 'o destino, não a origem').toBe(0);
  });

  it('[Right] o movimento vertical usa `y` e não `x`', () => {
    const p = posicaoDe(mov(12, 0), 0.5);
    expect(p.x).toBe(cellRect(0).x);
    expect(p.y).toBeGreaterThan(cellRect(0).y);
  });
});

describe('as peças de uma jogada inteira', () => {
  it('[Many] as duas metades de uma fusão CHEGAM JUNTAS na mesma casa', () => {
    const r = slide(linha(2, 0, 0, 2), 'left');
    const fim = pecasNoInstante(r.movimentos, 1);
    expect(fim).toHaveLength(2);
    expect(fim[0].x).toBe(fim[1].x);
    expect(fim[0].y).toBe(fim[1].y);
  });

  it('[Boundary] e no CAMINHO elas estão separadas — senão não haveria encontro para ver', () => {
    const r = slide(linha(2, 0, 0, 2), 'left');
    const meio = pecasNoInstante(r.movimentos, 0.5);
    expect(meio[0].x).not.toBe(meio[1].x);
  });

  it('[Interface] o número que viaja é o de ANTES da fusão', () => {
    const r = slide(linha(8, 8, 0, 0), 'left');
    expect(pecasNoInstante(r.movimentos, 0.5).map((p) => p.exponent)).toEqual([3, 3]);
  });

  it('[Cross-check] o quadro em t=1 tem as MESMAS posições que o tabuleiro parado, menos as fundidas', () => {
    // É a costura entre a animação e o repouso: se divergissem, a peça daria um pulinho no último quadro.
    const r = slide(linha(0, 0, 4, 2), 'left');
    const fim = pecasNoInstante(r.movimentos, 1).map((p) => `${p.x},${p.y}`).sort();
    const paradas = pecasParadas(r.board).map((p) => `${p.x},${p.y}`).sort();
    expect(fim).toEqual(paradas);
  });
});

describe('quando NÃO se anima — e é a metade que o navegador ensinou', () => {
  it('[Zero] documento ESCONDIDO não anima, por mais que a duração seja positiva', () => {
    // ⚠️ Defeito medido em 2026-09-05 com o painel do navegador oculto: num documento escondido o navegador
    // PARA o `requestAnimationFrame` — não atrasa, para. O laço nunca recebia o próximo quadro, a promessa
    // nunca resolvia, e o quadro final nunca chegava: o modelo já em `4:2 12:4` e a tela ainda mostrando as
    // duas peças anteriores, com o contador em "1 de 11" em vez de "2 de 11".
    //
    // Para a criança é trocar de aba, ou o tablet apagar a tela, no meio de uma jogada — e voltar para um
    // tabuleiro que MENTE até ela jogar de novo. A resposta certa não é animar mais rápido: é não animar.
    expect(podeAnimar(DURACAO_MS, false)).toBe(false);
  });

  it('[One] documento visível e duração positiva: anima', () => {
    expect(podeAnimar(DURACAO_MS, true)).toBe(true);
  });

  it('[Boundary] duração zero não anima nem com o documento à vista', () => {
    expect(podeAnimar(0, true)).toBe(false);
  });

  it('[Interface] o socorro é MAIOR que a animação, senão ele a cortaria pela metade', () => {
    // Ele existe para o caso NÃO nomeado — bateria, janela minimizada, aparelho engasgado. Se disparasse
    // antes do fim natural, trocaria um defeito raro por um defeito constante.
    expect(socorroMs(DURACAO_MS)).toBeGreaterThan(DURACAO_MS);
  });

  it('[Boundary] e não é longo a ponto de alguém ver o tabuleiro parado', () => {
    expect(socorroMs(DURACAO_MS)).toBeLessThan(1000);
  });
});

describe('movimento reduzido', () => {
  it('[Zero] com movimento reduzido a duração é ZERO — animação nenhuma, não uma mais rápida', () => {
    expect(duracaoDaJogada(true)).toBe(0);
  });

  it('[One] sem ele, é a duração declarada', () => {
    expect(duracaoDaJogada(false)).toBe(DURACAO_MS);
  });

  it('[Boundary] e a duração é curta: num jogo de turno, animação longa vira espera', () => {
    // A criança que joga bem encadeia jogadas depressa; acima de ~150 ms ela aperta a tecla de novo achando
    // que não funcionou. O número exato é ajustável; o teto é o que este teste protege.
    expect(DURACAO_MS).toBeLessThanOrEqual(150);
    expect(DURACAO_MS).toBeGreaterThan(0);
  });
});
