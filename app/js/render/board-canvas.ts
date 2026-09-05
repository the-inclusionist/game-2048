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
import { SIZE, type Board } from '../board.ts';
import { BOARD, BOARD_X, BOARD_Y, LOGICAL_H, LOGICAL_W, cellRect } from '../geometry.ts';
import { FUNDO_DA_TELA, HC_POR_PAPEL, MOLDURA, fundoDe } from './palette.ts';

export interface PinturaOpts {
  /** O papel de cada casa, vindo da declaração. É o campo 2 do contrato, e é quem manda no alto contraste. */
  readonly papel: (i: number) => Role;
  /** Alto contraste ligado? Então pinta-se por PAPEL e não por valor. */
  readonly altoContraste: boolean;
}

/**
 * Desenha fundo, moldura e as 16 casas, em pixels lógicos da grade 320×180.
 *
 * ⚠️ NÃO desenha número nenhum, de propósito, e é a decisão mais importante deste arquivo. Os algarismos são
 * texto no DOM (`ui/board-dom`) porque o pilar 2 manda, e duplicá-los aqui criaria a pior das combinações:
 * dois lugares que precisam concordar, e um deles invisível para o leitor de tela.
 */
export function pintarTabuleiro(g: Desenho, board: Board, o: PinturaOpts): void {
  g.clear();

  g.beginFill(FUNDO_DA_TELA).drawRect(0, 0, LOGICAL_W, LOGICAL_H).endFill();
  g.beginFill(MOLDURA).drawRect(BOARD_X, BOARD_Y, BOARD, BOARD).endFill();

  for (let i = 0; i < SIZE * SIZE; i++) {
    const r = cellRect(i);
    const cor = o.altoContraste
      ? (HC_POR_PAPEL[o.papel(i)] ?? HC_POR_PAPEL.free)
      : fundoDe(board[i]);
    g.beginFill(cor).drawRect(r.x, r.y, r.w, r.h).endFill();
  }
}
