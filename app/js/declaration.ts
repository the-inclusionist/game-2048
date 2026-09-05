// SPDX-License-Identifier: AGPL-3.0-or-later
// OS SETE CAMPOS — a única coisa que a pilha de acessibilidade da engine sabe sobre este jogo.
//
// ========================= O QUE ESTE ARQUIVO COMPRA =========================
// Respondendo a estas sete perguntas, o jogo ganha leitor de tela, navegação sonora, alto contraste por
// papel, varredura e Libras sem escrever uma linha de nenhum deles. É o produto do ADR-0027, e é a razão de
// existir uma engine em vez de "mais um motor 2D".
//
// ========================= E O QUE ELE PAGA DE VOLTA =========================
// O ADR-0030 diz que "o contrato basta" só deixa de ser hipótese quando DOIS presets existirem. Existia um —
// o `consumer-quiz`, topologia `hotspots`, uma lista sem espaço nenhum. Este é o segundo, e é `grid`.
//
// A diferença é o campo 5. No quiz, o próprio consumidor registrou que ali o sonar ficou "correto e inútil":
// num questionário linear o único alvo é a pergunta em que a criança já está, e apontar a alternativa certa
// seria colar. Numa grade há distância, vizinhança e direção — então `targetsOf` passa a responder ONDE HÁ
// UMA FUSÃO POSSÍVEL, que para quem não vê a tela é a mecânica inteira do jogo, e não um enfeite.
//
// ========================= SEM ESTADO PRÓPRIO, DE PROPÓSITO =========================
// Este módulo não guarda tabuleiro nem cursor: ele OBSERVA. Os campos são funções porque a resposta muda a
// cada jogada, e quem é dono do estado é quem joga. Guardar uma cópia aqui criaria a segunda versão da
// verdade que diverge no primeiro `undo`.
import type {
  Focus, GameDeclaration, Heading, Objective, Role, Speakable, Spot,
} from '@the-inclusionist/engine/core/contract.js';
import { OBJETIVO, SIZE, maxTile, mergeSpots, type Board } from './board.ts';

/** O que a declaração precisa PERGUNTAR ao jogo. Nada além disto, e nada de escrita. */
export interface Observado {
  board(): Board;
  /** Onde o cursor do teclado está — o campo 4 responde "onde a criança está" com isto. */
  cursor(): Spot;
  /** A última direção jogada. `'none'` antes da primeira jogada, que é a verdade e não um valor de enchimento. */
  heading(): Heading;
  /** O `t()` da engine, INJETADO: um teste passa um `t` que devolve a chave e mede qual chave foi pedida. */
  t(key: string): string;
}

const dentro = (at: Spot): boolean => at.x >= 0 && at.x < SIZE && at.y >= 0 && at.y < SIZE;
const indice = (at: Spot): number => at.y * SIZE + at.x;
const casa = (i: number): Spot => ({ x: i % SIZE, y: Math.floor(i / SIZE) });

export function criarDeclaracao(o: Observado): GameDeclaration {
  return {
    // 1 · TOPOLOGIA. Com métrica, e é a métrica que faz o sonar existir: numa grade a distância é em
    //     CÉLULAS e o passo é de rei, então "duas casas para a esquerda" é dizível sem falar em pixel.
    topology: { kind: 'grid', cols: SIZE, rows: SIZE },

    // 6 · DE QUEM É O TURNO. Do jogador — e isto não é detalhe: com o turno do jogador o tempo não pressiona,
    //     a varredura pode esperar, e a WCAG 2.2.1 (Timing Adjustable) é satisfeita por CONSTRUÇÃO em vez de
    //     por uma opção que alguém precisa achar no menu.
    tick: 'player',

    // 2 · PAPEL SEMÂNTICO, e é daqui que o alto contraste tira as cores em vez de uma tabela de tiles.
    //
    //     ⚠️ `goal` é a peça que PODE FUNDIR AGORA, não a peça de maior valor. É a leitura certa do campo —
    //     "o que a rodada pede" — e é o que faz o realce de alto contraste apontar a jogada disponível para
    //     uma criança com baixa visão, em vez de decorar o tabuleiro por tamanho.
    roleAt(at: Spot): Role {
      if (!dentro(at)) return 'free';
      const b = o.board();
      const i = indice(at);
      if (b[i] === 0) return 'free';
      return mergeSpots(b).includes(i) ? 'goal' : 'structure';
    },

    // 3 · NOME FALÁVEL — o mesmo dado que o leitor de tela diz e que a Libras traduz.
    //
    //     ⚠️ O NÚMERO NÃO PASSA PELO DICIONÁRIO, e a palavra passa. `8` é `8` em qualquer idioma: matemática
    //     não é disciplina de idioma, e mandar um numeral para o `t()` só criaria 2048 chaves para traduzir
    //     um algarismo. "Vazio" é palavra, então é chave. A regra é a mesma que o pilar 3 usa: a moldura mora
    //     na chave, o conteúdo atravessa.
    nameAt(at: Spot): Speakable | null {
      if (!dentro(at)) return null;
      const e = o.board()[indice(at)];
      if (e === 0) return { text: o.t('cell.empty'), gender: 'n', plural: false };
      return { text: String(2 ** e), gender: 'm', plural: false };
    },

    // 4 · FOCO. Sem corpo e sem física: quem tem o foco é o cursor do teclado, e "para onde aponta" é a
    //     última direção empurrada — que é o que a bengala e a varredura precisam saber.
    focusOf(): Focus | null {
      return { id: 'p0', at: o.cursor(), heading: o.heading() };
    },

    // 5a · OBJETIVO, EM DOBRAS — e esta é a decisão de que mais me orgulho neste arquivo.
    //
    //      A moldura do HUD da engine é `'{have} de {need} {nome}'`. Com VALORES daria "16 de 2048": verdade,
    //      e não ensina nada. Com EXPOENTES dá **"4 de 11 dobras"**, e 11 é exatamente o que 2048 É — onze
    //      duplicações. O contador passa a enunciar a matéria em vez de marcar pontos, e não custou nem um
    //      campo novo na engine nem uma linha de condicional: é o mesmo `have`/`need` que contava moeda.
    objectiveOf(): Objective {
      return {
        name: { text: o.t('hud.nome.dobras'), gender: 'f', plural: true },
        have: maxTile(o.board()),
        need: OBJETIVO,
      };
    },

    // 5b · ONDE ESTÃO OS ALVOS. A metade que o sonar usa, e a que o quiz não tinha como exercer.
    //
    //      Vazio quando não há fusão possível, e vazio é RESPOSTA: significa "não há para onde apontar", que
    //      no fim de uma partida é a informação mais honesta que existe.
    targetsOf(): readonly Spot[] {
      return mergeSpots(o.board()).map(casa);
    },
  };
}
