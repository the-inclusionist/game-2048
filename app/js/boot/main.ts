// SPDX-License-Identifier: AGPL-3.0-or-later
// O BOOT — a ordem de ligar as coisas, e quase nada além disso.
//
// ========================= UMA CHAMADA, E NÃO NOVE =========================
// `createGame()` liga idioma, leitor de tela, mixer, voz, pilha de diálogos, filtros de daltonismo, teclado
// remapeável, navegação de menu, sonar e pilha de cenas. O `consumer-quiz` escreveu essas nove inicializações
// à mão e mediu o preço: uma delas tem ORDEM obrigatória que nenhum tipo declara (o mixer antes da voz), e
// errá-la faz a narração desistir CALADA. Aqui quem chama não tem como inverter.
//
// ========================= O QUE ESTE ARQUIVO FAZ QUE É DESTE JOGO =========================
// O estado da rodada, o PixiJS, a grade de DOM por cima, e o mapeamento de tecla para jogada. Só.
import { srAlert, srSay } from '@the-inclusionist/engine/core/a11y-sr.js';
import { t } from '@the-inclusionist/engine/core/i18n.js';
import { reseed, rnd } from '@the-inclusionist/engine/core/rng.js';
import { createGame, type Engine } from '@the-inclusionist/engine';
import { initLayout, layout } from '@the-inclusionist/engine/ui/layout.js';
import * as PIXI from 'pixi.js';

import {
  OBJETIVO, SIZE, canMove, emptyBoard, maxTile, slide, spawn,
  type Board, type Direction, type Movimento,
} from '../board.ts';
import {
  criarAnimador, duracaoDaJogada, pecasParadas, relogioDoNavegador, type Peca,
} from '../animation.ts';
import { criarDeclaracao } from '../declaration.ts';
import { narrarJogada, narrarSemMovimento } from '../narration.ts';
import { LOGICAL_H, LOGICAL_W } from '../geometry.ts';
import { registrarIdiomas } from '../i18n/index.ts';
import { pintarTabuleiro } from '../render/board-canvas.ts';
import { FUNDO_DA_TELA } from '../render/palette.ts';
import { criarGradeDom } from '../ui/board-dom.ts';
import { criarCamadaDePecas } from '../ui/tiles-layer.ts';

/**
 * A criança pediu menos movimento? Então nenhuma animação — não uma mais rápida.
 *
 * Lido do SISTEMA e não de um menu do jogo: quem precisa disto já configurou no aparelho, e obrigá-la a
 * achar uma opção dentro de cada jogo é transferir para ela um trabalho que o navegador já fez. É a WCAG
 * 2.3.3, e é também por que este jogo não acrescenta um interruptor próprio: dois lugares para a mesma
 * decisão é um lugar para eles discordarem.
 */
const movimentoReduzido = (win: Window): boolean =>
  win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/* ===================== O ESTADO DA RODADA =====================
 *
 * ⚠️ TUDO AQUI MORRE COM A PARTIDA, e isso é o ADR-0037 em código e não em prosa: não existe save, e o
 * Inclusionista não guarda nada sobre uma criança. Não há `localStorage`, não há recorde e não há "continuar
 * de onde parou" — a ausência é a decisão. Os forks do 2048 guardam o melhor placar; este não pode.
 */
let board: Board = emptyBoard();
let pontos = 0;
let heading: 'n' | 'e' | 's' | 'w' | 'none' = 'none';
let acabou = false;

const RUMO: Record<Direction, 'n' | 'e' | 's' | 'w'> = { left: 'w', right: 'e', up: 'n', down: 's' };
const ACAO_PARA_DIRECAO: Record<string, Direction> = { left: 'left', right: 'right', up: 'up', down: 'down' };

/** O sorteio da rodada. Semeado pelo relógio no boot; a MESMA semente dá a MESMA partida (ADR-0049). */
function novaRodada(): void {
  reseed(Date.now() & 0x7fffffff);
  board = emptyBoard();
  pontos = 0;
  heading = 'none';
  acabou = false;
  for (let i = 0; i < 2; i++) board = spawn(board, rnd)?.board ?? board;
}

export function bootar(doc: Document = document, win: Window = window): Engine | null {
  const região = doc.querySelector<HTMLElement>('#game-region');
  if (!região) return null;

  // 1. OS IDIOMAS ANTES DE TUDO — antes até do `createGame`, que já traduz markup no primeiro passo.
  registrarIdiomas();

  novaRodada();

  const grade = criarGradeDom(doc);
  const camadaDePecas = criarCamadaDePecas(doc);

  // 2. A DECLARAÇÃO. Ela OBSERVA o estado; não o possui. Ver o cabeçalho de `declaration.ts`.
  const declaration = criarDeclaracao({
    board: () => board,
    cursor: () => ({ x: grade.cursor() % 4, y: Math.floor(grade.cursor() / 4) }),
    heading: () => heading,
    t,
  });

  // 3. A ENGINE INTEIRA. Um jogo de tabuleiro não tem menu de pausa por tela, nem assistente de pad, nem
  //    "ator da pausa" — e declinar é DECLARAR, não devolver null de um getter e torcer.
  const motor = createGame({
    declaration,
    host: { doc, win, cvdHost: doc.querySelector('#cvd') },
    declines: { semMenuDePausa: true, semAssistenteDePad: true, semAtorDePausa: true },
    isNavigable: () => true,
  });
  if (motor.problems.length) console.warn('[2048] lacunas do hospedeiro:', motor.problems);

  // 4. O CANVAS, por baixo dos números e ESCONDIDO DA ÁRVORE DE ACESSIBILIDADE. É a ilustração; o tabuleiro
  //    de verdade é a grade de DOM (pilar 2). Sem o `aria-hidden`, o leitor de tela anunciaria uma imagem.
  const pixi = new PIXI.Application({
    width: LOGICAL_W, height: LOGICAL_H, backgroundColor: FUNDO_DA_TELA,
    antialias: false, resolution: 1, powerPreference: 'low-power',
  });
  const tela = pixi.view as HTMLCanvasElement;
  tela.id = 'p2-canvas';
  tela.setAttribute('aria-hidden', 'true');
  // ⚠️ O CANVAS VAI NA FRENTE DE TUDO NO DOM, o que o põe ATRÁS de tudo na tela. `append` o colocava depois
  // do HUD e dos botões de toque — e como todos são posicionados, ele os PINTAVA POR CIMA: a coluna de
  // objetivo e placar simplesmente sumia da tela. Ninguém percebe isso lendo o código, e nenhum teste de
  // asserção percebia: o HUD continuava no DOM, com o texto certo, coberto por uma tela de pintura.
  região.prepend(tela);
  região.append(camadaDePecas.raiz, grade.raiz);
  const figura = new PIXI.Graphics();
  pixi.stage.addChild(figura);

  // 5. ESCALA. O `ui/layout` da engine trava o `#game-region` num múltiplo INTEIRO de pixels reais de
  //    320×180 (ADR-0001) e publica `--ui-fs = 8·k`. O CSS deriva `--px` daí, e é isso que mantém o número
  //    de DOM exatamente em cima da casa desenhada, em qualquer dpr.
  initLayout({ numJogadores: () => 1 });
  layout();
  win.addEventListener('resize', () => layout());

  // ⚠️ VOLTAR A APARECER RECONCILIA A TELA COM O MODELO. Enquanto o documento está escondido não se anima
  // (ver `podeAnimar`), e o socorro garante que o quadro final chegue — mas uma aba que passou minutos
  // escondida pode ter perdido quadros por outras razões. Redesenhar ao reaparecer é barato e fecha a
  // categoria inteira: seja qual for o motivo de a tela ter ficado para trás, ela alcança o estado ao voltar.
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') desenhar(); });

  const altoContraste = () => doc.documentElement.dataset.hc === '1';
  const papelDa = (i: number) => declaration.roleAt({ x: i % SIZE, y: Math.floor(i / SIZE) });

  /**
   * UM QUADRO — as duas camadas pintadas a partir das MESMAS peças.
   *
   * ⚠️ É a única função que desenha, e é por isso que as camadas não podem descolar. O canvas recebe as
   * posições e o DOM recebe as mesmas posições, na mesma chamada. Se cada uma tivesse a própria animação —
   * uma em `requestAnimationFrame`, outra numa transição de CSS —, andariam com relógios diferentes e o
   * número descolaria da peça no meio do movimento. Já custou uma tarde vê-las descoladas PARADAS.
   */
  function quadro(pecas: readonly Peca[]): void {
    pintarTabuleiro(figura, { papel: papelDa, altoContraste: altoContraste(), pecas });
    camadaDePecas.desenhar(pecas, altoContraste(), papelDa);
  }

  /** O tabuleiro PARADO: o que se vê entre jogadas, e o quadro final de toda animação. */
  function desenhar(): void {
    quadro(pecasParadas(board));
    grade.atualizar(declaration, t);
    const o = declaration.objectiveOf(0);
    const hud = doc.querySelector<HTMLElement>('#p2-doubles');
    if (hud) hud.textContent = t('move.doubles', { have: o.have, need: o.need });
    const placar = doc.querySelector<HTMLElement>('#p2-score');
    if (placar) placar.textContent = String(pontos);
  }

  /**
   * O LAÇO, montado — e ele NÃO mora mais aqui.
   *
   * ⚠️ Morava, e era intestável: o relógio de quadros do navegador não roda num painel oculto, e tentar
   * observá-lo ao vivo devolveu zero quadros três vezes seguidas. O laço não estava errado; o ambiente não o
   * deixava correr. Depender do olho para saber se o CANCELAMENTO e o SOCORRO funcionam é exatamente o gate
   * que nunca pôde ficar vermelho.
   *
   * Ele foi para `animation.ts` com o relógio INJETADO — a mesma disciplina que o `core/rng` da engine já usa
   * para o acaso. O que sobrou aqui são as três coisas que são deste jogo: qual relógio (o de verdade), o que
   * desenhar a cada quadro (as duas camadas juntas), e quanto tempo (zero, sob movimento reduzido).
   */
  const animador = criarAnimador(relogioDoNavegador(win), quadro);
  const animar = (movimentos: readonly Movimento[]): Promise<void> =>
    animador.correr(movimentos, duracaoDaJogada(movimentoReduzido(win)), doc.visibilityState !== 'hidden');

  /** Uma jogada inteira: empurra, conta, sorteia, anuncia, redesenha. */
  function jogar(dir: Direction): void {
    if (acabou) return;
    const r = slide(board, dir);
    if (!r.moved) {
      // Anúncio EDUCADO (`srSay`) e não alerta: "nada se move" é resposta a uma tentativa, não um evento
      // que interrompa o que a criança estiver ouvindo.
      srSay(narrarSemMovimento(dir, t));
      return;
    }

    // ⚠️ O ESTADO MUDA AGORA, E A ANIMAÇÃO É SÓ A ILUSTRAÇÃO DISSO. O modelo já é o tabuleiro seguinte antes
    // do primeiro quadro — a animação desenha o passado a caminho do presente, e nunca o contrário.
    //
    // A ordem importa para quem NÃO vê a animação: o leitor de tela, o teste e a criança que joga com
    // movimento reduzido recebem o resultado imediatamente, sem esperar 110 ms de enfeite. Se o estado
    // esperasse a animação terminar, o jogo passaria a mentir por um décimo de segundo a cada jogada — e
    // mentiria mais quanto mais lento fosse o aparelho, que é o pilar 1 ao contrário.
    board = r.board;
    pontos += r.gained;
    heading = RUMO[dir];

    const nascida = spawn(board, rnd);
    if (nascida) board = nascida.board;

    // A animação corre com o tabuleiro ANTIGO em voo; o quadro final é `desenhar()`, com o novo.
    void animar(r.movimentos).then(desenhar);

    // FIM DE RODADA — e ele TERMINA. Sem "continuar jogando" depois do 2048 e sem caça à pontuação: é o
    // laço de compulsão que o ADR-0006 nomeia, e o ADR-0049 diz que a única celebração é o crescimento.
    const maior = maxTile(board);
    const fim = maior >= OBJETIVO ? { chave: 'end.win' as const, maior }
      : !canMove(board) ? { chave: 'end.stuck' as const, maior }
        : null;
    acabou = fim !== null;

    // ⚠️ A FRASE É MONTADA FORA DAQUI, em `narration.ts`, e a razão está no cabeçalho de lá: o que a criança
    // cega recebe é o produto, e produto se testa. Aqui ficou só a ESCOLHA DE CANAL, que é a decisão deste
    // arquivo: fim de rodada interrompe (`srAlert`), o resto espera a vez (`srSay`).
    const dito = narrarJogada({ merges: r.merges, nascida, fim }, t);
    if (acabou) srAlert(dito); else srSay(dito);
    motor.tts.narrate(dito);
  }

  // 6. TECLADO, PELA CAMADA REMAPEÁVEL DA ENGINE. Nada de `e.code === 'ArrowLeft'` cru: `actionOf` traduz a
  //    tecla em INTENÇÃO, respeita ABNT/QWERTY/alternativos e o remapeamento que a criança fez no menu.
  //
  //    ⚠️ SHIFT MUDA O VERBO, e é aqui que o desvio do APG declarado em `ui/board-dom` acontece: a seta
  //    sozinha JOGA, a seta com Shift move o cursor de LEITURA e anuncia onde ele parou.
  região.addEventListener('keydown', (e: KeyboardEvent) => {
    const acao = motor.keyboard.actionOf(e.code, 0);
    const dir = acao ? ACAO_PARA_DIRECAO[acao] : undefined;

    if (e.code === 'KeyS' && e.altKey) { // sonar: onde há uma fusão possível
      const f = declaration.focusOf(0);
      if (f) motor.sonar.sonar({ i: 0, x: f.at.x, y: f.at.y, viz: 'cego' });
      e.preventDefault();
      return;
    }
    if (!dir) return;
    e.preventDefault();

    if (e.shiftKey) {
      const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir] as [number, number];
      const i = grade.mover(d[0], d[1]);
      grade.focar();
      srSay(grade.raiz.querySelector<HTMLElement>(`[data-i="${i}"]`)?.getAttribute('aria-label') ?? '');
      return;
    }
    jogar(dir);
  });

  // 7. TOQUE: deslizar o dedo, e quatro alvos grandes para quem não desliza. Os botões existem no markup;
  //    aqui eles só ganham a intenção. `padPxPerMm` da engine já os dimensiona em milímetros REAIS.
  let toqueX = 0, toqueY = 0;
  região.addEventListener('touchstart', (e: TouchEvent) => {
    toqueX = e.changedTouches[0].clientX; toqueY = e.changedTouches[0].clientY;
  }, { passive: true });
  região.addEventListener('touchend', (e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - toqueX;
    const dy = e.changedTouches[0].clientY - toqueY;
    if (Math.hypot(dx, dy) < 24) return; // um toque não é um deslize
    jogar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });
  for (const b of doc.querySelectorAll<HTMLButtonElement>('[data-dir]')) {
    b.addEventListener('click', () => jogar(b.dataset.dir as Direction));
  }

  doc.querySelector('#p2-again')?.addEventListener('click', () => {
    novaRodada();
    desenhar();
    grade.focar();
    srAlert(t('game.tagline'));
  });

  // 8. A PILHA DE CENAS. Uma cena só, e ela não é inventada para o teste: `desenhar` já era o `draw`.
  motor.cenas.push({ nome: 'tabuleiro', draw: () => desenhar(), input: () => false });
  motor.nav.attach();
  motor.cenas.draw();
  grade.focar();
  srSay(t('a11y.instructions'));

  // O gancho de verificação do projeto: conferir o boot é conferir que isto existe, e ler daqui.
  (win as Window & { __incl2048?: unknown }).__incl2048 = {
    get board() { return board; },
    get pontos() { return pontos; },
    get acabou() { return acabou; },
    jogar, novaRodada: () => { novaRodada(); desenhar(); }, declaration, motor,
  };
  return motor;
}

// ⚠️ NENHUM AUTO-BOOT AQUI, e a linha que havia era um defeito medido no navegador em 2026-09-05.
//
// Este arquivo tinha, copiado do `consumer-quiz` da engine, um
//     `if (document.getElementById('game-region')) bootar();`
// no fim. Lá ele é correto, porque o quiz é a própria entrada da página. Aqui não: quem entra é o
// `boot/boot.ts`, que importa este módulo E chama `bootar()` — então o jogo bootava DUAS VEZES. Medido:
// dois `<canvas>` e 32 células de `role="gridcell"` numa grade de dezesseis, dois ouvintes de teclado, e
// cada seta jogando duas jogadas.
//
// Nada disso aparece em teste de lógica, e nada disso aparece numa captura de tela — os dois tabuleiros
// ficam exatamente um em cima do outro. Apareceu porque a verificação de boot deste projeto conta
// `canvas` e lê o objeto global em vez de olhar a imagem, que é a razão de a regra existir.