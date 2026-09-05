// SPDX-License-Identifier: AGPL-3.0-or-later
// O LAÇO DA ANIMAÇÃO, COM UM RELÓGIO DE MENTIRA — e é a única forma de provar as bordas dele.
//
// ========================= POR QUE O RELÓGIO ENTRA POR PARÂMETRO =========================
// O laço vivia dentro do `bootar()` e não tinha como ser verificado. O `requestAnimationFrame` do navegador
// não roda em documento oculto, e a tentativa de observá-lo ao vivo devolveu ZERO quadros três vezes
// seguidas — não porque estivesse errado, mas porque o ambiente não o deixava correr. Confiar no olho para
// saber se o cancelamento e o socorro funcionam é o gate que nunca pôde ficar vermelho.
//
// A saída é a que o `core/rng` da engine já usa para o acaso: injetar. Com o relógio de mentira o tempo
// avança à mão, e as bordas — a jogada que cancela a anterior, o socorro que salva o quadro final, o `t` que
// nunca passa de 1 — passam a ser afirmações e não esperanças.
//
// ⚠️ O QUE ELE NÃO PROVA, dito para ninguém confiar demais: que o `requestAnimationFrame` de verdade chama o
// laço sessenta vezes por segundo. Essa linha é `relogioDoNavegador`, tem quatro linhas e nenhuma decisão.
import { describe, expect, it, vi } from 'vitest';
import { criarAnimador, socorroMs, type Peca, type Relogio } from '../app/js/animation.ts';
import { slide, type Board, type Movimento } from '../app/js/board.ts';
import { cellRect } from '../app/js/geometry.ts';

const grade = (...v: number[]): Board => v.map((x) => (x === 0 ? 0 : Math.log2(x)));
const linha = (...v: number[]): Board => grade(...v, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const MOVS: readonly Movimento[] = slide(linha(0, 0, 0, 2), 'left').movimentos;

/** Um relógio de mentira: o tempo só anda quando o teste manda. */
function relogioFalso() {
  let agora = 0;
  const quadros: ((t: number) => void)[] = [];
  const esperas = new Map<number, { fn: () => void; quando: number }>();
  let proximoId = 1;

  const relogio: Relogio = {
    agora: () => agora,
    proximoQuadro: (fn) => { quadros.push(fn); },
    depoisDe: (fn, ms) => { const id = proximoId++; esperas.set(id, { fn, quando: agora + ms }); return id; },
    cancelarEspera: (id) => { esperas.delete(id); },
  };

  return {
    relogio,
    /** Avança `ms` e entrega UM quadro, como o navegador faria. */
    async passo(ms: number) {
      agora += ms;
      const fn = quadros.shift();
      if (fn) fn(agora);
      await Promise.resolve();
    },
    /** Avança o tempo SEM entregar quadro — é o navegador com o relógio de quadros parado. */
    async congelado(ms: number) {
      agora += ms;
      for (const [id, e] of [...esperas]) if (e.quando <= agora) { esperas.delete(id); e.fn(); }
      await Promise.resolve();
    },
    quadrosPendentes: () => quadros.length,
    esperasPendentes: () => esperas.size,
  };
}

describe('o laço da animação', () => {
  it('[One] pede um quadro, desenha, e resolve quando o tempo acaba', async () => {
    const c = relogioFalso();
    const pintados: Peca[][] = [];
    const a = criarAnimador(c.relogio, (p) => pintados.push([...p]));

    let acabou = false;
    void a.correr(MOVS, 100, true).then(() => { acabou = true; });

    await c.passo(50);
    expect(pintados, 'desenhou o quadro do meio').toHaveLength(1);
    expect(acabou, 'e ainda não terminou').toBe(false);

    await c.passo(50);
    expect(acabou).toBe(true);
  });

  it('[Boundary] o último quadro é desenhado com t = 1, e não é pulado', async () => {
    const c = relogioFalso();
    const pintados: Peca[][] = [];
    const a = criarAnimador(c.relogio, (p) => pintados.push([...p]));
    void a.correr(MOVS, 100, true);
    await c.passo(100);
    // A peça sai da casa 3 e vai para a 0: no fim tem de estar EXATAMENTE sobre a casa 0. Um laço que
    // resolvesse antes de desenhar t=1 deixaria a peça a um pixel do lugar até o quadro de repouso a
    // corrigir — um tremor no fim de cada jogada.
    const ultima = pintados.at(-1)![0];
    expect(ultima.at).toBe(0);
    expect({ x: ultima.x, y: ultima.y }).toEqual({ x: cellRect(0).x, y: cellRect(0).y });
  });

  it('[Boundary] um relógio que PULA não joga a peça para fora: t é travado em 1', async () => {
    const c = relogioFalso();
    const pintados: Peca[][] = [];
    const a = criarAnimador(c.relogio, (p) => pintados.push([...p]));
    void a.correr(MOVS, 100, true);
    await c.passo(5000); // a aba voltou do segundo plano e o relógio saltou cinco segundos
    expect(pintados).toHaveLength(1);
    expect(Number.isFinite(pintados[0][0].x)).toBe(true);
  });

  it('[Right] UMA JOGADA NOVA CANCELA A ANTERIOR — a primeira resolve e para de desenhar', async () => {
    // Uma criança que segura a seta produz jogadas mais depressa que a animação. Enfileirar deixaria o
    // tabuleiro devendo animações, com a tela atrasada em relação ao modelo.
    const c = relogioFalso();
    let desenhos = 0;
    const a = criarAnimador(c.relogio, () => { desenhos++; });

    let primeiraAcabou = false;
    void a.correr(MOVS, 100, true).then(() => { primeiraAcabou = true; });
    await c.passo(30);
    const aposPrimeira = desenhos;

    void a.correr(MOVS, 100, true);
    await c.passo(10);
    expect(primeiraAcabou, 'a primeira solta quem a esperava em vez de ficar pendurada').toBe(true);

    // O quadro pendente da PRIMEIRA ainda existe na fila do relógio; ao ser entregue, ela tem de desistir.
    await c.passo(10);
    expect(desenhos, 'a primeira não pode continuar pintando por cima da segunda')
      .toBeLessThanOrEqual(aposPrimeira + 3);
  });

  it('[Zero] com o relógio de quadros PARADO, o socorro resolve mesmo assim', async () => {
    // O defeito medido em 2026-09-05: sem isto a promessa nunca resolvia, o quadro final nunca chegava, e a
    // tela ficava mostrando o tabuleiro anterior enquanto o modelo já era outro.
    const c = relogioFalso();
    const a = criarAnimador(c.relogio, () => {});
    let acabou = false;
    void a.correr(MOVS, 100, true).then(() => { acabou = true; });

    await c.congelado(socorroMs(100) - 1);
    expect(acabou, 'ainda dentro do prazo').toBe(false);

    await c.congelado(2);
    expect(acabou, 'o socorro soltou o chamador, que desenha o quadro final').toBe(true);
  });

  it('[Interface] terminando na hora, o socorro é CANCELADO — nada fica agendado', async () => {
    const c = relogioFalso();
    const a = criarAnimador(c.relogio, () => {});
    void a.correr(MOVS, 100, true);
    await c.passo(100);
    expect(c.esperasPendentes(), 'um temporizador órfão por jogada, numa partida de 200 jogadas').toBe(0);
  });

  it('[Zero] documento escondido: resolve na hora e não pede quadro nenhum', async () => {
    const c = relogioFalso();
    const desenhar = vi.fn();
    const a = criarAnimador(c.relogio, desenhar);
    await a.correr(MOVS, 100, false);
    expect(c.quadrosPendentes()).toBe(0);
    expect(desenhar).not.toHaveBeenCalled();
  });

  it('[Zero] duração zero (movimento reduzido): idem, e sem um único quadro', async () => {
    const c = relogioFalso();
    const desenhar = vi.fn();
    const a = criarAnimador(c.relogio, desenhar);
    await a.correr(MOVS, 0, true);
    expect(desenhar).not.toHaveBeenCalled();
  });

  it('[Zero] jogada sem movimento nenhum não anima', async () => {
    const c = relogioFalso();
    const desenhar = vi.fn();
    const a = criarAnimador(c.relogio, desenhar);
    await a.correr([], 100, true);
    expect(desenhar).not.toHaveBeenCalled();
  });
});
