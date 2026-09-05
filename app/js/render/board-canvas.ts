// SPDX-License-Identifier: AGPL-3.0-or-later
// A FIGURA DO TABULEIRO — o que fica POR BAIXO dos números, e que leva `aria-hidden`.
//
// ========================= NÃO IMPORTA PIXI, E ISSO É O ADR-0035 EM USO =========================
// Recebe um `Desenho` — a porta do renderizador que a engine já define em `render/port` — em vez de importar
// PixiJS. É a mesma aposta que o ADR-0035 fez para a engine: o renderizador é substituível porque nenhum
// módulo o nomeia. O ganho imediato é outro e é maior: com a porta, esta função roda no project `node`
// contra um desenho de mentira, e o TABULEIRO PODE SER TESTADO SEM NAVEGADOR.
//
// ========================= ARTE É DADO, E AQUI ELA NEM CHEGA A SER ARQUIVO =========================
// Nenhum PNG. Todas as peças são retângulos numa paleta calculada — a regra "arte procedural" do projeto,
// que aqui também resolve a licença apagando a pergunta: não há asset de terceiro para licenciar, e não há
// direito de artista (Lei nº 9.610/1998) a respeitar, porque não há desenho.
import type { Desenho } from '@the-inclusionist/engine/render/port.js';
import type { Role } from '@the-inclusionist/engine/core/contract.js';

import type { Peca } from '../animation.ts';
import { SIZE } from '../board.ts';
import { BOARD, BOARD_X, BOARD_Y, LOGICAL_H, LOGICAL_W, TILE, cellRect } from '../geometry.ts';
import { FUNDO_DA_TELA, HC_POR_PAPEL, MOLDURA, fundoDe } from './palette.ts';

export interface PinturaOpts {
  /** O papel de cada casa, vindo da declaração. É o campo 2 do contrato, e é quem manda no alto contraste. */
  readonly papel: (i: number) => Role;
  /** Alto contraste ligado? Então pinta-se por PAPEL e não por valor. */
  readonly altoContraste: boolean;
  /**
   * AS PEÇAS, já posicionadas — em pixels lógicos, não em índices de casa.
   *
   * ⚠️ É ISTO QUE PERMITE A ANIMAÇÃO, e é a razão de este argumento existir. No meio de um deslizamento uma
   * peça NÃO está numa casa: está entre duas. Enquanto a pintura lia o tabuleiro e desenhava por índice, o
   * mais que ela podia fazer era teletransportar as peças de um quadro para o outro.
   *
   * Quem calcula estas posições é `animation.ts`, que é puro; quem gira o relógio é o `boot/main.ts`.
   */
  readonly pecas: readonly Peca[];
}

/**
 * Desenha fundo, moldura, as 16 casas vazias e as peças onde elas estiverem AGORA.
 *
 * ⚠️ NÃO desenha número nenhum, de propósito, e é a decisão mais importante deste arquivo. Os algarismos são
 * texto no DOM (`ui/tiles-layer`) porque o pilar 2 manda, e duplicá-los aqui criaria a pior das combinações:
 * dois lugares que precisam concordar, e um deles invisível para o leitor de tela.
 *
 * As duas camadas se movem juntas por CONSTRUÇÃO, não por disciplina: recebem as mesmas coordenadas, vindas
 * da mesma chamada de `pecasNoInstante(t)`, dentro do mesmo quadro.
 */
export function pintarTabuleiro(g: Desenho, o: PinturaOpts): void {
  g.clear();

  g.beginFill(FUNDO_DA_TELA).drawRect(0, 0, LOGICAL_W, LOGICAL_H).endFill();
  g.beginFill(MOLDURA).drawRect(BOARD_X, BOARD_Y, BOARD, BOARD).endFill();

  // AS CASAS VAZIAS — os buracos do tabuleiro. Elas não dependem de peça nenhuma: existem 16, sempre, e é o
  // que faz o tabuleiro continuar sendo um tabuleiro enquanto as peças voam por cima.
  for (let i = 0; i < SIZE * SIZE; i++) {
    const r = cellRect(i);
    const cor = o.altoContraste ? (HC_POR_PAPEL[o.papel(i)] ?? HC_POR_PAPEL.free) : fundoDe(0);
    g.beginFill(cor).drawRect(r.x, r.y, r.w, r.h).endFill();
  }

  // AS PEÇAS, por cima e na ordem recebida. Duas metades de uma fusão chegam sobrepostas no fim do
  // movimento, e desenhar as duas é o certo: é o que faz elas se ENCONTRAREM em vez de uma sumir no caminho.
  for (const p of o.pecas) {
    // ⚠️ O PAPEL É PERGUNTADO, não recebido — e a diferença apareceu num teste vermelho. A peça carregava um
    // campo `papel` que o chamador tinha de preencher, e um chamador que esquecesse recebia silenciosamente a
    // cor por VALOR no lugar da cor por papel: o alto contraste desligado sem ninguém pedir. Como a peça já
    // sabe a casa a que pertence (`at`), o campo era redundante — e campo redundante é campo que diverge.
    const cor = o.altoContraste
      ? (HC_POR_PAPEL[o.papel(p.at)] ?? HC_POR_PAPEL.free)
      : fundoDe(p.exponent);
    g.beginFill(cor).drawRect(p.x, p.y, TILE, TILE).endFill();
  }
}
