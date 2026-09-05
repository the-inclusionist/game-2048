// SPDX-License-Identifier: AGPL-3.0-or-later
// A FRASE CHEGA MESMO À REGIÃO VIVA — a última afirmação de acessibilidade que faltava fechar.
//
// ========================= POR QUE ESTE TESTE PRECISA DE NAVEGADOR =========================
// `tests/narration.node.test.ts` prova QUE FRASE é montada. Isto prova que ela CHEGA — e o caminho entre as
// duas coisas não é trivial: o `srSay` da engine limpa o elemento, espera um `requestAnimationFrame` e só
// então escreve, de propósito, porque é assim que se força um leitor de tela a reanunciar texto repetido.
//
// ⚠️ E foi exatamente esse quadro que impediu a verificação manual: num painel de navegador OCULTO o
// `requestAnimationFrame` não roda, o `#sr-status` fica em branco, e o anúncio parece quebrado quando está
// só esperando. Aqui a página está viva, então o quadro acontece — e a espera pelo quadro faz parte do teste
// em vez de ser um `setTimeout` chutado.
import { beforeEach, describe, expect, it } from 'vitest';
import { srAlert, srSay } from '@the-inclusionist/engine/core/a11y-sr.js';
import { narrarJogada, narrarSemMovimento } from '../app/js/narration.ts';
import { registrarIdiomas } from '../app/js/i18n/index.ts';
import { setLocale, t } from '@the-inclusionist/engine/core/i18n.js';

/** Dois quadros: um para o `clear`, outro para a escrita. Um só é corrida com o próprio `srSay`. */
const doisQuadros = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

beforeEach(() => {
  document.body.replaceChildren(); // (nao `innerHTML = ''`: mesmo custo, e nao ensina o padrao errado)
  const status = document.createElement('p');
  status.id = 'sr-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const alerta = document.createElement('p');
  alerta.id = 'sr-alert';
  alerta.setAttribute('role', 'alert');
  alerta.setAttribute('aria-live', 'assertive');
  document.body.append(status, alerta);
  registrarIdiomas();
});

const status = () => document.querySelector('#sr-status')!.textContent;
const alerta = () => document.querySelector('#sr-alert')!.textContent;

describe('o que a criança cega recebe chega à região viva', () => {
  it('[Right] a frase de uma fusão aparece em `#sr-status`, TRADUZIDA', async () => {
    srSay(narrarJogada({
      merges: [{ at: 0, exponent: 2 }],
      nascida: { board: [], at: 5, exponent: 1 },
      fim: null,
    }, t));
    await doisQuadros();
    const dito = status() ?? '';
    expect(dito, 'a chave crua vazaria se `registerDict` não tivesse funcionado').not.toContain('move.');
    expect(dito).toContain('2 e 2 viraram 4');
    expect(dito).toContain('linha 2, coluna 2');
  });

  it('[Boundary] o FIM da rodada vai para a região ASSERTIVA, que interrompe', async () => {
    srAlert(narrarJogada({ merges: [], nascida: null, fim: { chave: 'end.win', maior: 11 } }, t));
    await doisQuadros();
    expect(alerta()).toContain('onze dobras');
    expect(status(), 'o fim não pode chegar pela região educada').toBe('');
  });

  it('[Zero] a jogada que não move nada também é dita — o silêncio seria o pior modo de falhar', async () => {
    srSay(narrarSemMovimento('left', t));
    await doisQuadros();
    expect(status()).toContain('esquerda');
  });

  it('[Cross-check] em ESPANHOL a mesma jogada chega em espanhol — a porta do `registerDict` funcionando', async () => {
    await setLocale('es');
    srSay(narrarJogada({ merges: [{ at: 0, exponent: 2 }], nascida: null, fim: null }, t));
    await doisQuadros();
    const dito = status() ?? '';
    expect(dito).toContain('2 y 2 formaron 4');
    expect(dito, 'nada de português vazando').not.toContain('viraram');
    await setLocale('pt');
  });
});
