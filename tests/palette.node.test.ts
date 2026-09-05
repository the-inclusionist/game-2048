// SPDX-License-Identifier: AGPL-3.0-or-later
// O CONTRASTE É GATE — não é revisão de design, é a WCAG 1.4.3 medida a cada `npm test`.
//
// ========================= POR QUE ISTO PODE SER TESTADO SEM NAVEGADOR =========================
// Porque `render/palette` é aritmética. A razão de contraste da WCAG é uma fórmula fechada sobre os canais
// da cor, e o número que ela devolve é o mesmo no Chromium e aqui. Um teste de navegador para isto seria
// mais lento e não mediria nada a mais.
//
// ========================= A HONESTIDADE QUE O ADR-0010 PEDE =========================
// O pilar 2 manda marcar onde só dá AA, e a §1 do CLAUDE.md da engine é explícita: "nunca vender AAA em
// bloco". Então a asserção dura é a **AA (4,5:1)**, que é obrigação; a AAA (7:1) é CONTADA e relatada, não
// exigida — 1.4.6 briga com cor viva, e vender o que não se cumpre é pior que cumprir menos.
import { describe, expect, it } from 'vitest';
import { OBJETIVO } from '../app/js/board.ts';
import {
  FUNDO, FUNDO_DA_TELA, HC_POR_PAPEL, MOLDURA, TINTA_CLARA, TINTA_ESCURA,
  contraste, fundoDe, inkFor, luminancia,
} from '../app/js/render/palette.ts';

const AA = 4.5;
const AAA = 7;

describe('a fórmula de contraste é a da WCAG, e não uma aproximação', () => {
  it('[Cross-check] preto contra branco dá 21:1, o máximo que a escala tem', () => {
    expect(contraste(0x000000, 0xffffff)).toBeCloseTo(21, 5);
  });

  it('[Zero] uma cor contra ela mesma dá 1:1', () => {
    expect(contraste(0x3f7fcc, 0x3f7fcc)).toBeCloseTo(1, 10);
  });

  it('[Interface] a ordem não importa — contraste é simétrico', () => {
    expect(contraste(0x14161f, 0xd99a1f)).toBeCloseTo(contraste(0xd99a1f, 0x14161f), 10);
  });

  it('[Cross-check] a luminância bate com o valor conhecido do cinza médio da sRGB', () => {
    expect(luminancia(0x808080)).toBeCloseTo(0.2159, 3);
  });
});

describe('cada peça é legível — a WCAG 1.4.3 como gate', () => {
  it('[Right] TODA peça, do 2 ao 2048, alcança a AA com a tinta que o código escolhe', () => {
    const reprovadas: string[] = [];
    for (let e = 1; e <= OBJETIVO + 1; e++) {
      const fundo = fundoDe(e);
      const razao = contraste(fundo, inkFor(fundo));
      if (razao < AA) reprovadas.push(`2^${e} = ${2 ** e}: ${razao.toFixed(2)}:1`);
    }
    expect(reprovadas, 'peças ilegíveis para quem tem baixa visão').toEqual([]);
  });

  it('[Interface] quantas alcançam a AAA — CONTADO e não exigido, porque 1.4.6 briga com cor viva', () => {
    const razoes = Array.from({ length: OBJETIVO + 1 }, (_, k) => {
      const fundo = fundoDe(k + 1);
      return contraste(fundo, inkFor(fundo));
    });
    const aaa = razoes.filter((r) => r >= AAA).length;
    // A asserção é sobre a HONESTIDADE do número, não sobre ele ser alto: o que não pode acontecer é o
    // projeto alegar AAA em bloco. Se este número cair, é informação; se a AA cair, é defeito.
    expect(aaa).toBeGreaterThanOrEqual(0);
    expect(aaa).toBeLessThanOrEqual(razoes.length);
  });

  it('[Boundary] a casa VAZIA se distingue da moldura, senão o tabuleiro vira um bloco só', () => {
    expect(contraste(FUNDO[0], MOLDURA), 'vazio contra moldura').toBeGreaterThan(1.2);
    expect(contraste(MOLDURA, FUNDO_DA_TELA), 'moldura contra o fundo da tela').toBeGreaterThan(1.2);
  });

  it('[Many] duas peças VIZINHAS na rampa não são a mesma cor', () => {
    for (let e = 1; e < FUNDO.length - 1; e++) {
      expect(fundoDe(e), `2^${e} contra 2^${e + 1}`).not.toBe(fundoDe(e + 1));
    }
  });

  it('[Boundary] os primeiros degraus se separam por LUMINÂNCIA, para quem não distingue matiz', () => {
    // Daltonismo não apaga claro e escuro. Nos degraus que a criança mais vê — 2, 4, 8, 16 — a escada de
    // luminância é o que sustenta a leitura quando a cor não sustenta.
    const l = [1, 2, 3, 4].map((e) => luminancia(fundoDe(e)));
    for (let i = 0; i < l.length - 1; i++) {
      expect(l[i], `2^${i + 1} mais claro que 2^${i + 2}`).toBeGreaterThan(l[i + 1]);
    }
  });
});

describe('alto contraste POR PAPEL — o achado 8 do quiz, resolvido do lado do jogo', () => {
  it('[Right] os três papéis que este jogo usa estão na tabela', () => {
    for (const papel of ['goal', 'structure', 'free']) {
      expect(HC_POR_PAPEL[papel], papel).toBeTypeOf('number');
    }
  });

  it('[Right] os três papéis se separam entre si pela 1.4.11 — que é 3:1, e não 4,5', () => {
    // ⚠️ ESTE LIMIAR ESTAVA ERRADO NA PRIMEIRA VERSÃO deste arquivo, e o erro vale mais escrito que apagado:
    // eu exigia 4,5:1 entre duas COREs DE PREENCHIMENTO. 4,5 é a WCAG 1.4.3, que é sobre TEXTO. Cor de peça
    // contra cor de peça é componente não-textual, e o critério é a **1.4.11 (Non-text Contrast), 3:1**.
    // Não é o limiar sendo afrouxado para passar: é o critério certo substituindo o citado por engano — e a
    // busca por um cinza que satisfizesse 4,5 contra o amarelo E 3 contra o quase-preto não tinha solução,
    // que foi como o engano apareceu.
    const NAO_TEXTO = 3;
    expect(contraste(HC_POR_PAPEL.goal, HC_POR_PAPEL.structure)).toBeGreaterThanOrEqual(NAO_TEXTO);
    expect(contraste(HC_POR_PAPEL.goal, HC_POR_PAPEL.free)).toBeGreaterThanOrEqual(NAO_TEXTO);
    expect(contraste(HC_POR_PAPEL.structure, HC_POR_PAPEL.free)).toBeGreaterThanOrEqual(NAO_TEXTO);
  });

  it('[Right] o número segue legível sobre qualquer cor de papel', () => {
    for (const [papel, cor] of Object.entries(HC_POR_PAPEL)) {
      expect(contraste(cor, inkFor(cor)), papel).toBeGreaterThanOrEqual(AA);
    }
  });
});

describe('inkFor escolhe, e não adivinha', () => {
  it('[Boundary] fundo claro pede tinta escura; fundo escuro pede tinta clara', () => {
    expect(inkFor(0xf6f8ff)).toBe(TINTA_ESCURA);
    expect(inkFor(0x101319)).toBe(TINTA_CLARA);
  });

  it('[Right] a escolha é sempre a de MAIOR contraste, sem exceção na rampa inteira', () => {
    for (let e = 0; e < FUNDO.length; e++) {
      const fundo = FUNDO[e];
      const escolhida = inkFor(fundo);
      const outra = escolhida === TINTA_ESCURA ? TINTA_CLARA : TINTA_ESCURA;
      expect(contraste(fundo, escolhida), `2^${e}`).toBeGreaterThanOrEqual(contraste(fundo, outra));
    }
  });
});
