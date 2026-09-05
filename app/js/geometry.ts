// SPDX-License-Identifier: AGPL-3.0-or-later
// A GEOMETRIA, EM UM LUGAR SÓ — porque duas camadas desenham o mesmo tabuleiro e elas não podem divergir.
//
// ========================= AS DUAS CAMADAS, E POR QUE SÃO DUAS =========================
// O tabuleiro é desenhado DUAS VEZES, uma por cima da outra, e isso é decisão e não redundância:
//
//   · o CANVAS (PixiJS, 320×180) desenha a figura — moldura, casas, peças, a animação de deslizar;
//   · o DOM desenha os NÚMEROS, e é ele que tem `role="grid"`, foco e `aria-label`.
//
// O pilar 2 do ADR-0010 diz "text always in the DOM". Um algarismo pintado no canvas some para o leitor de
// tela e some para o VLibras, que traduz TEXTO — então a camada acessível não é uma legenda do desenho: ela
// É o tabuleiro, e o canvas é a ilustração dele. `aria-hidden` no canvas diz isso à máquina.
//
// ========================= O QUE MANTÉM AS DUAS ALINHADAS =========================
// Este arquivo. Ambas leem daqui, em PIXELS LÓGICOS da grade 320×180, e o CSS converte um pixel lógico em
// pixels de tela pela MESMA escala inteira que o `ui/layout` da engine já calcula (ADR-0001): a folha define
// `--px: calc(var(--ui-fs) / 8)`, e `--ui-fs` é `8 · k`. Um pixel lógico é `k` pixels de CSS, sempre inteiro
// em pixels REAIS, então o número nunca fica meio pixel fora da casa em nenhum dpr.
//
// ========================= AS MEDIDAS, E DE ONDE ELAS SAEM =========================
// 320×180 é apertado para um tabuleiro 4×4 com números de até quatro algarismos. A conta:
//   peça 32 + vão 4 → 4·32 + 5·4 = 148 de lado. Sobram 172 de largura, que é a coluna do HUD.
// O tabuleiro fica à DIREITA e o HUD à esquerda de propósito: quem lê da esquerda para a direita encontra
// primeiro o que a rodada pede e depois o tabuleiro, e é a mesma ordem em que o leitor de tela narra.
import { SIZE } from './board.ts';

/** A grade lógica da engine (pilar 5). Não é escolha deste jogo — é a constante que todo jogo herda. */
export const LOGICAL_W = 320;
export const LOGICAL_H = 180;

/** Lado de uma peça, e o vão entre elas. Em pixels lógicos. */
export const TILE = 32;
export const GAP = 4;

/** Lado do tabuleiro inteiro, moldura incluída: `4·32 + 5·4 = 148`. */
export const BOARD = SIZE * TILE + (SIZE + 1) * GAP;

/** Canto superior esquerdo do tabuleiro. Encostado à direita, com uma margem igual à do topo. */
export const BOARD_X = LOGICAL_W - BOARD - 8;
export const BOARD_Y = Math.round((LOGICAL_H - BOARD) / 2);

/** A coluna do HUD: tudo que sobra à esquerda do tabuleiro, com a mesma margem. */
export const HUD_X = 8;
export const HUD_W = BOARD_X - HUD_X - 8;

export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** O retângulo de uma casa, em pixels lógicos, a partir do índice do tabuleiro. */
export function cellRect(i: number): Rect {
  const x = i % SIZE;
  const y = Math.floor(i / SIZE);
  return {
    x: BOARD_X + GAP + x * (TILE + GAP),
    y: BOARD_Y + GAP + y * (TILE + GAP),
    w: TILE,
    h: TILE,
  };
}

/**
 * O tamanho de letra que cabe num número dentro da peça, em pixels lógicos.
 *
 * ⚠️ ENCOLHE COM O NÚMERO DE ALGARISMOS, e é isso que faz `2048` caber onde `2` sobra espaço. Uma medida só
 * para todos os casos teria de servir ao pior deles — cinco algarismos —, e aí o `2` de uma criança de seis
 * anos apareceria minúsculo no começo da partida, que é exatamente quando ela mais precisa enxergá-lo.
 */
export function fontFor(digits: number): number {
  if (digits <= 2) return 16;
  if (digits === 3) return 13;
  if (digits === 4) return 10;
  return 8;
}
