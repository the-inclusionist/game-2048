// SPDX-License-Identifier: AGPL-3.0-or-later
// A FRASE QUE A CRIANÇA CEGA RECEBE — testada como produto, porque é isso que ela é.
//
// ========================= POR QUE ESTE ARQUIVO EXISTE, E COMO ELE APARECEU =========================
// A frase estava montada dentro do ouvinte de teclado do boot, e a única forma de conferi-la era abrir um
// navegador e escutar. A tentativa de fazer isso, em 2026-09-05, travou por uma razão instrutiva: o `srSay`
// da engine escreve no QUADRO SEGUINTE (`requestAnimationFrame` — é assim que ela força o leitor de tela a
// reanunciar texto repetido), e num painel oculto não existe quadro seguinte. O anúncio parecia vazio e
// estava apenas esperando um quadro que nunca vinha.
//
// A conclusão não foi "arrumar a medição". Foi que o TEXTO não deveria depender de quadro nenhum para ser
// verificado — que é a mesma conclusão a que o `consumer-quiz` da engine já tinha chegado ao extrair
// `respostaTexto()` com a justificativa escrita ao lado: *"Separado do DOM porque é o que a criança cega
// RECEBE"*.
import { describe, expect, it } from 'vitest';
import { narrarJogada, narrarSemMovimento, type Jogada } from '../app/js/narration.ts';

/** Um `t` que devolve chave e parâmetros. Mede QUAL chave foi pedida e COM O QUÊ — não a tradução. */
const t = (k: string, p?: Record<string, string | number>) =>
  p ? `${k}(${Object.entries(p).map(([a, b]) => `${a}=${b}`).join(',')})` : k;

const jogada = (j: Partial<Jogada> = {}): Jogada => ({ merges: [], nascida: null, fim: null, ...j });

describe('a frase de uma jogada', () => {
  it('[Zero] jogada que só empurrou, sem fundir nem nascer, não inventa frase', () => {
    expect(narrarJogada(jogada(), t)).toBe('');
  });

  it('[One] uma fusão é dita com AS DUAS PARCELAS e o resultado', () => {
    const frase = narrarJogada(jogada({ merges: [{ at: 0, exponent: 3 }] }), t);
    // ⚠️ "4 e 4 viraram 8", e não só "8". É a diferença entre narrar o jogo e ENSINAR o que ele é sobre:
    // quem não vê a tela recebe a conta inteira, que é o conteúdo curricular que este jogo carrega.
    expect(frase).toContain('move.pair(a=4,b=8)');
    expect(frase).toContain('move.merged');
  });

  it('[Many] várias fusões entram na MESMA frase, separadas — e não em quatro anúncios', () => {
    const frase = narrarJogada(jogada({
      merges: [{ at: 0, exponent: 2 }, { at: 1, exponent: 4 }],
    }), t);
    expect(frase).toContain('a=2,b=4');
    expect(frase).toContain('a=8,b=16');
    expect((frase.match(/move\.merged/g) ?? []).length, 'uma moldura só').toBe(1);
  });

  it('[One] a peça nova é dita com valor, LINHA e COLUNA, contando de 1', () => {
    // O índice 9 é a linha 3, coluna 2. Contar de zero seria correto para a máquina e inútil para a criança.
    const frase = narrarJogada(jogada({ nascida: { board: [], at: 9, exponent: 1 } }), t);
    expect(frase).toBe('move.spawned(value=2,row=3,col=2)');
  });

  it('[Right] a ordem é: o que FUNDIU, depois o que APARECEU, depois o FIM', () => {
    // Não é gosto: quem ouve precisa primeiro do resultado da própria ação, depois da mudança que não pediu.
    const frase = narrarJogada(jogada({
      merges: [{ at: 0, exponent: 2 }],
      nascida: { board: [], at: 5, exponent: 1 },
      fim: { chave: 'end.stuck', maior: 7 },
    }), t);
    expect(frase.indexOf('move.merged')).toBeLessThan(frase.indexOf('move.spawned'));
    expect(frase.indexOf('move.spawned')).toBeLessThan(frase.indexOf('end.stuck'));
  });

  it('[Interface] a vitória é dita sem número — onze dobras é a frase inteira', () => {
    expect(narrarJogada(jogada({ fim: { chave: 'end.win', maior: 11 } }), t)).toBe('end.win');
  });

  it('[Boundary] o fim por travamento diz o VALOR e as DOBRAS, que são coisas diferentes', () => {
    const frase = narrarJogada(jogada({ fim: { chave: 'end.stuck', maior: 7 } }), t);
    expect(frase, '2^7 = 128, e são 7 dobras').toBe('end.stuck(value=128,doubles=7)');
  });
});

describe('a frase de uma jogada que não moveu nada', () => {
  it('[Right] a direção também passa pelo dicionário — "esquerda" é palavra', () => {
    expect(narrarSemMovimento('left', t)).toBe('move.none(dir=dir.left)');
  });

  it('[Many] as quatro direções têm chave própria', () => {
    for (const d of ['left', 'right', 'up', 'down']) {
      expect(narrarSemMovimento(d, t)).toContain(`dir.${d}`);
    }
  });
});
