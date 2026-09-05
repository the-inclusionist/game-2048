// SPDX-License-Identifier: AGPL-3.0-or-later
// O QUE A CRIANÇA OUVE — separado do DOM, porque é o produto e não um efeito colateral dele.
//
// ========================= POR QUE ISTO SAIU DO BOOT =========================
// A frase estava montada dentro do ouvinte de teclado do `boot/main.ts`, e lá ela só podia ser verificada
// abrindo um navegador e escutando. O `consumer-quiz` da engine já tinha resolvido esse mesmo problema do
// jeito certo — `respostaTexto()` é uma função pura, exportada, com a justificativa escrita ao lado:
// *"Separado do DOM porque é o que a criança cega RECEBE"*. Isto é a mesma decisão, aplicada aqui.
//
// O ganho é concreto e foi medido: uma tentativa de conferir o anúncio no navegador ficou presa porque o
// `srSay` da engine escreve no QUADRO SEGUINTE (`requestAnimationFrame`, de propósito — é o que força o
// leitor a reanunciar texto repetido), e num painel oculto não há quadro seguinte. A frase, aqui, não
// depende de quadro nenhum.
//
// ========================= UMA FRASE, TRÊS PARTES, NESTA ORDEM =========================
// O que fundiu · o que apareceu · como está a rodada. A ordem não é gosto: quem ouve precisa primeiro do
// RESULTADO da própria ação, depois da mudança que não pediu, e por último do estado. Invertida, a criança
// ouve o placar antes de saber se a jogada dela deu certo.
import type { Merge, Spawn } from './board.ts';
import { SIZE } from './board.ts';

/** A tradução, injetada. Um teste passa um `t` que marca a chave e mede QUAL foi pedida. */
export type Traduz = (chave: string, params?: Record<string, string | number>) => string;

export interface Jogada {
  readonly merges: readonly Merge[];
  readonly nascida: Spawn | null;
  /** `null` quando a rodada continua; a chave do fim quando ela acabou. */
  readonly fim: { readonly chave: 'end.win' | 'end.stuck'; readonly maior: number } | null;
}

/**
 * A frase de uma jogada que MUDOU alguma coisa.
 *
 * ⚠️ CADA FUSÃO É DITA COM OS DOIS PARCELAS E O RESULTADO — "2 e 2 viraram 4" — e não só com o resultado.
 * É a diferença entre narrar um jogo e ENSINAR o que ele é sobre: a criança que não vê a tela recebe a conta
 * inteira, que é exatamente o conteúdo curricular que este jogo carrega.
 */
export function narrarJogada(j: Jogada, t: Traduz): string {
  const partes: string[] = [];

  if (j.merges.length) {
    const pares = j.merges
      .map((m) => t('move.pair', { a: 2 ** (m.exponent - 1), b: 2 ** m.exponent }))
      .join('; ');
    partes.push(t('move.merged', { pairs: pares }));
  }

  if (j.nascida) {
    partes.push(t('move.spawned', {
      value: 2 ** j.nascida.exponent,
      row: Math.floor(j.nascida.at / SIZE) + 1,
      col: (j.nascida.at % SIZE) + 1,
    }));
  }

  if (j.fim) {
    partes.push(j.fim.chave === 'end.win'
      ? t('end.win')
      : t('end.stuck', { value: 2 ** j.fim.maior, doubles: j.fim.maior }));
  }

  return partes.join(' ');
}

/** A frase de uma jogada que NÃO mudou nada. Curta de propósito: é resposta a uma tentativa, não um evento. */
export const narrarSemMovimento = (dir: string, t: Traduz): string =>
  t('move.none', { dir: t(`dir.${dir}`) });
