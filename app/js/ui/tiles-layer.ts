// SPDX-License-Identifier: AGPL-3.0-or-later
// AS PEÇAS QUE SE MEXEM — em DOM, com os números dentro delas.
//
// ========================= POR QUE A PEÇA SAIU DE DENTRO DA CÉLULA =========================
// Antes da animação, o número morava dentro do `gridcell`: célula e peça eram a mesma coisa. Uma peça que
// desliza não pode ser isso, porque a CÉLULA não se move — ela é uma casa do tabuleiro, com posição fixa,
// foco e rótulo. O que se move é a peça, e ela atravessa várias casas no caminho.
//
// Então são duas camadas, e cada uma tem um dono:
//   · `ui/board-dom` — as 16 casas: `role="grid"`, foco, `aria-label`. NÃO se movem, nunca.
//   · este arquivo   — as peças: cor, número, e a posição que muda. `aria-hidden="true"`.
//
// ⚠️ E O `aria-hidden` NÃO ESCONDE INFORMAÇÃO DE NINGUÉM, o que é o único jeito de ele ser legítimo. O nome
// acessível de uma casa já vinha do `aria-label` — "Linha 2, coluna 2: 4" —, e um `aria-label` sempre
// substituiu o conteúdo da célula: nenhum leitor de tela lia o algarismo solto antes, e nenhum deixa de ler
// o número agora. O que muda é só QUEM desenha o glifo.
//
// ⚠️ E O NÚMERO CONTINUA SENDO TEXTO DE VERDADE NO DOM, que é o que o pilar 2 exige. Ele é selecionável,
// cresce com o painel de tipografia da engine, e é o mesmo dado que o VLibras traduziria. Pintá-lo no canvas
// para poder animá-lo teria sido a saída fácil e a errada.
import { SIZE } from '../board.ts';
import type { Peca } from '../animation.ts';
import { BOARD, BOARD_X, BOARD_Y, TILE, fontFor } from '../geometry.ts';
import { HC_POR_PAPEL, fundoDe, inkFor } from '../render/palette.ts';

export interface CamadaDePecas {
  readonly raiz: HTMLElement;
  /**
   * Redesenha a camada inteira. Chamado a cada quadro da animação e uma vez no fim.
   *
   * O PAPEL entra como FUNÇÃO e não como campo em cada peça, pela mesma razão que no canvas: a peça já sabe
   * a casa a que pertence, e um campo que o chamador precisa lembrar de preencher é um campo que um dia ele
   * esquece — e o modo de falhar é o alto contraste desligar sozinho, calado.
   */
  desenhar(pecas: readonly Peca[], altoContraste: boolean, papel: (i: number) => string): void;
}

const px = (n: number) => `calc(${n} * var(--px))`;
const cor = (c: number) => '#' + c.toString(16).padStart(6, '0');

/**
 * A camada, com um POOL de elementos reusados.
 *
 * ⚠️ RECRIAR OS NÓS A CADA QUADRO seria o defeito óbvio: numa animação de 110 ms são umas sete passagens, e
 * cada uma jogaria fora dezesseis elementos para criar dezesseis iguais. Pior que o custo, porém, é o efeito
 * no navegador: nó novo não tem estado anterior, então qualquer transição de CSS que viesse a existir nunca
 * dispararia, e o texto piscaria em leitores que observam mutação do DOM.
 *
 * O pool nasce com uma folga sobre 16 porque uma jogada com fusões tem MAIS peças em voo do que casas: as
 * duas metades de cada fusão viajam juntas até se encontrarem. O pior caso é oito fusões simultâneas — as
 * dezesseis casas cheias de pares —, e aí são dezesseis peças em voo. Dezesseis basta, e a folga é para o
 * dia em que o tabuleiro deixar de ser 4×4.
 */
export function criarCamadaDePecas(doc: Document): CamadaDePecas {
  const raiz = doc.createElement('div');
  raiz.id = 'p2-tiles';
  raiz.className = 'p2-tiles';
  // A camada inteira sai da árvore de acessibilidade: quem responde por ela é a grade de `board-dom`.
  raiz.setAttribute('aria-hidden', 'true');

  // ⚠️ ELA POSICIONA A SI MESMA, sobre o tabuleiro — e isto FALTAVA. Sem estas quatro linhas a camada cobria
  // a região inteira, enquanto as transformadas das peças são relativas ao canto do TABULEIRO: os números
  // apareciam deslocados 164 por 16 pixels lógicos, flutuando à esquerda do tabuleiro, longe das peças que
  // deviam nomear. Visível de imediato numa captura de tela e invisível para todo teste que eu tinha.
  //
  // ⚠️ E O TESTE DE NAVEGADOR ESCONDIA O DEFEITO porque ELE fazia este trabalho: posicionava a camada à mão
  // antes de medir. Um teste que faz a parte que o código de produção esqueceu não mede nada — passou verde
  // enquanto a tela estava errada, e essa é a pior espécie de verde.
  raiz.style.left = px(BOARD_X);
  raiz.style.top = px(BOARD_Y);
  raiz.style.width = px(BOARD);
  raiz.style.height = px(BOARD);

  const pool: HTMLElement[] = [];
  const pegar = (n: number): HTMLElement => {
    while (pool.length < n) {
      const el = doc.createElement('div');
      el.className = 'p2-tile';
      el.style.width = px(TILE);
      el.style.height = px(TILE);
      raiz.appendChild(el);
      pool.push(el);
    }
    return pool[n - 1];
  };

  return {
    raiz,
    desenhar(pecas, altoContraste, papel) {
      pecas.forEach((p, n) => {
        const el = pegar(n + 1);
        const texto = String(2 ** p.exponent);
        // `translate` e não `left`/`top`: a posição muda a cada quadro, e é a transformada que o navegador
        // consegue compor sem refazer o layout da página inteira dezesseis vezes por quadro.
        el.style.transform = `translate(${px(p.x - BOARD_X)}, ${px(p.y - BOARD_Y)})`;

        // ⚠️ SEM FUNDO. A peça COLORIDA é pintada pelo canvas, por baixo — é ele que dá a cara de pixel-art
        // integral da família, e um `div` com cantos arredondados no lugar faria isto parecer uma página web
        // em vez de um jogo de 320×180. O que este elemento carrega é SÓ O NÚMERO.
        //
        // A TINTA, porém, ainda é calculada a partir da cor de baixo: `inkFor` responde qual das duas dá mais
        // contraste sobre o fundo que o canvas vai desenhar naquela mesma posição. As duas camadas leem a
        // mesma paleta, então o algarismo nunca fica ilegível sobre a própria peça.
        const papelDaCasa = papel(p.at);
        const fundo = altoContraste
          ? (HC_POR_PAPEL[papelDaCasa] ?? HC_POR_PAPEL.free)
          : fundoDe(p.exponent);
        el.style.color = cor(inkFor(fundo));

        el.dataset.role = papelDaCasa;
        if (el.textContent !== texto) el.textContent = texto;
        el.style.fontSize = px(fontFor(texto.length));
        el.hidden = false;
      });
      for (let n = pecas.length; n < pool.length; n++) pool[n].hidden = true;
    },
  };
}

/** Quantas peças cabem em voo ao mesmo tempo — o pior caso é o tabuleiro cheio de pares. */
export const MAX_PECAS_EM_VOO = SIZE * SIZE;
