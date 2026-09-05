// SPDX-License-Identifier: AGPL-3.0-or-later
// A GRADE ACESSÍVEL — e ela não é uma legenda do desenho: ela É o tabuleiro.
//
// ========================= O PILAR 2 DECIDE A ARQUITETURA, NÃO SÓ O ACABAMENTO =========================
// "Text always in the DOM". Um algarismo pintado no canvas some para o leitor de tela e some para o VLibras,
// que traduz TEXTO. Então as camadas se dividem assim, e a ordem importa:
//
//   · este módulo desenha os NÚMEROS, tem `role="grid"`, o foco e os `aria-label` — é o tabuleiro;
//   · o canvas desenha a figura por baixo e leva `aria-hidden="true"` — é a ilustração.
//
// Uma criança cega e uma criança que enxerga jogam O MESMO jogo, e não duas versões dele.
//
// ========================= ⚠️ O DESVIO DO APG, DECLARADO EM VEZ DE ESCONDIDO =========================
// O padrão `grid` da APG diz que as SETAS navegam entre células. Aqui as setas JOGAM: empurrar o tabuleiro é
// o verbo deste jogo, e "esquerda" é a jogada, não um passo de leitura.
//
// Isto é um desvio, e ele é deliberado. A alternativa — setas que só leem — deixaria a criança que usa
// exclusivamente teclado sem como JOGAR, que é precisamente quem o padrão existe para servir; e mover a
// jogada para outra tecla jogaria fora a memória muscular de um jogo que a criança provavelmente já conhece.
//
// O que se perde é reposto, não abandonado:
//   · **Shift + setas** movem o CURSOR DE LEITURA célula a célula, e cada parada é anunciada;
//   · o Tab entra e sai da grade normalmente — nunca é sequestrado, que seria o desvio caro;
//   · depois de cada jogada, um resumo vai para a região `aria-live` da engine;
//   · e o SONAR da engine responde "onde há uma fusão", que é a pergunta que a leitura célula a célula
//     custaria dezesseis paradas para responder.
import type { GameDeclaration } from '@the-inclusionist/engine/core/contract.js';
import { SIZE, type Board } from '../board.ts';
import { BOARD, BOARD_X, BOARD_Y, TILE, cellRect, fontFor } from '../geometry.ts';
import { fundoDe, inkFor } from '../render/palette.ts';

/** O que a grade precisa perguntar. Fatia MÍNIMA da declaração — a regra do `core/contract`. */
export type Falante = Pick<GameDeclaration, 'roleAt' | 'nameAt'>;

export interface GradeDom {
  /** O elemento com `role="grid"`. Quem monta a página decide onde ele entra. */
  readonly raiz: HTMLElement;
  /** Repinta números, rótulos e papéis a partir do tabuleiro atual. */
  atualizar(board: Board, falante: Falante, t: (k: string, p?: Record<string, string | number>) => string): void;
  /** Move o cursor de leitura e devolve o índice novo. Enrola nas bordas, como a grade de letras da engine. */
  mover(dx: number, dy: number): number;
  /** Onde o cursor está. É o que o campo 4 da declaração devolve como `focusOf`. */
  cursor(): number;
  /** Põe o foco do navegador na célula do cursor — o que faz o leitor de tela ler. */
  focar(): void;
}

const px = (n: number) => `calc(${n} * var(--px))`;

/**
 * Monta as 16 células uma vez. Depois disso, `atualizar` só troca texto e atributos.
 *
 * Reconstruir a grade a cada jogada seria o defeito clássico: o elemento com foco deixa de existir, o foco
 * volta para o `<body>` e o leitor de tela perde o lugar — no meio de uma partida, a cada tecla.
 */
export function criarGradeDom(doc: Document): GradeDom {
  const raiz = doc.createElement('div');
  raiz.id = 'board';
  raiz.className = 'board';
  raiz.setAttribute('role', 'grid');
  raiz.style.left = px(BOARD_X);
  raiz.style.top = px(BOARD_Y);
  raiz.style.width = px(BOARD);
  raiz.style.height = px(BOARD);

  // ⚠️ CADA CÉLULA É POSICIONADA PELO `cellRect`, E NÃO POR FLEXBOX. Medido no navegador em 2026-09-05: com
  // linhas flex e `margin: GAP/2`, as células do DOM ficavam 2 pixels lógicos à esquerda das casas pintadas
  // no canvas — 8 px reais em k=4. Duas réguas para o mesmo tabuleiro, que é exatamente o que
  // `app/js/geometry.ts` existe para impedir; o flexbox estava reimplementando a geometria em vez de a ler.
  //
  // O defeito não aparece em k=2 a olho nu e não aparece em teste nenhum de lógica.
  // `tests/board-alinhado.browser.test.ts` passou a compará-las diretamente.
  //
  // As linhas continuam sendo ELEMENTOS de verdade (`role="row"`), posicionadas na sua faixa: `display:
  // contents` resolveria o layout numa linha e já foi motivo de a linha sumir da árvore de acessibilidade em
  // navegadores que ainda circulam em máquina de escola. Uma grade sem linhas não se navega.
  const celulas: HTMLElement[] = [];
  for (let y = 0; y < SIZE; y++) {
    const faixa = cellRect(y * SIZE);
    const linha = doc.createElement('div');
    linha.setAttribute('role', 'row');
    linha.className = 'board__row';
    linha.style.top = px(faixa.y - BOARD_Y);
    linha.style.height = px(TILE);
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const r = cellRect(i);
      const c = doc.createElement('div');
      c.setAttribute('role', 'gridcell');
      c.className = 'cell';
      c.dataset.i = String(i);
      // Tabindex ROVING: exatamente uma célula é alcançável pelo Tab, e o Shift+setas move qual é.
      // Dezesseis paradas de Tab dentro de um tabuleiro seria hostil para quem só usa teclado.
      c.tabIndex = i === 0 ? 0 : -1;
      c.style.left = px(r.x - BOARD_X);
      c.style.width = px(r.w);
      c.style.height = px(r.h);
      linha.appendChild(c);
      celulas.push(c);
    }
    raiz.appendChild(linha);
  }

  let atual = 0;

  return {
    raiz,
    cursor: () => atual,

    atualizar(board, falante, t) {
      raiz.setAttribute('aria-label', t('a11y.board', { cols: SIZE, rows: SIZE }));
      celulas.forEach((c, i) => {
        const e = board[i];
        const at = { x: i % SIZE, y: Math.floor(i / SIZE) };
        const valor = e === 0 ? '' : String(2 ** e);
        const fundo = fundoDe(e);

        // O NÚMERO, como texto de verdade. É a linha por que este módulo existe.
        if (c.textContent !== valor) c.textContent = valor;
        c.style.background = '#' + fundo.toString(16).padStart(6, '0');
        c.style.color = '#' + inkFor(fundo).toString(16).padStart(6, '0');
        c.style.fontSize = px(fontFor(valor.length || 1));

        // O PAPEL vem da declaração, não de uma segunda cópia da regra aqui dentro. É o que faz o alto
        // contraste e o realce concordarem com o que o sonar aponta.
        const papel = falante.roleAt(at);
        c.dataset.role = papel;

        // O RÓTULO É A CÉLULA INTEIRA, e não só o número: quem ouve precisa de onde, do quê, e de se dá
        // para juntar. `nameAt` responde o "quê" — inclusive a palavra traduzida para a casa vazia.
        const nome = falante.nameAt(at)?.text ?? '';
        const params = { row: at.y + 1, col: at.x + 1, what: nome };
        c.setAttribute('aria-label', t(papel === 'goal' ? 'a11y.cellMergeable' : 'a11y.cell', params));
      });
    },

    mover(dx, dy) {
      const x = (((atual % SIZE) + dx) % SIZE + SIZE) % SIZE;
      const y = ((Math.floor(atual / SIZE) + dy) % SIZE + SIZE) % SIZE;
      celulas[atual].tabIndex = -1;
      atual = y * SIZE + x;
      celulas[atual].tabIndex = 0;
      return atual;
    },

    focar() {
      celulas[atual].focus();
    },
  };
}
