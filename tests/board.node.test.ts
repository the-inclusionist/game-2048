// SPDX-License-Identifier: AGPL-3.0-or-later
// AS REGRAS DO 2048, ESCRITAS DO ZERO — e este arquivo é a razão de elas poderem ser escritas do zero.
//
// ========================= POR QUE REIMPLEMENTAR, EM UMA FRASE =========================
// As REGRAS de um jogo não são protegidas por direito autoral; uma implementação delas é. O Município tem de
// ter titularidade do INTEIRO daquilo que possui (`docs/LICENSES.md`), e a licença MIT dos descendentes do
// Threes! permitiria reusar com atribuição — não é obstáculo de licença que está sendo contornado, é uma
// decisão de TITULARIDADE. O que este arquivo faz é transformar "as regras" em algo verificável, para que
// "escrevemos do zero" seja uma propriedade medida e não uma alegação.
//
// ========================= O MODELO: EXPOENTES, NÃO VALORES =========================
// O tabuleiro guarda `0` para vazio e `n` para 2^n — `1` é a peça 2, `11` é a peça 2048. Não é economia de
// memória: é o que faz "potência de dois" ser o MODELO do jogo e não um rótulo colado nele depois. Fundir
// vira `n + 1`, o objetivo vira `11`, e o enunciado da atividade ("2 elevado a quê?") lê o mesmo número que
// a mecânica usa. Os testes escrevem VALORES, porque é assim que a criança vê.
//
// ========================= A REGRA QUE OS FORKS ERRAM =========================
// Numa jogada, cada peça funde NO MÁXIMO UMA VEZ. `[2,2,2,2]` para a esquerda é `[4,4]`, nunca `[8]`. É a
// diferença entre um jogo que termina em quinze jogadas e o 2048. Está marcada com [Many] e é o caso que
// mais justifica este arquivo existir antes do código.
import { describe, expect, it } from 'vitest';
import {
  SIZE, canMove, maxTile, mergeSpots, slide, spawn, type Board,
} from '../app/js/board.ts';

/** Um tabuleiro escrito em VALORES (0, 2, 4, 8…) — como a criança o vê — virado em expoentes. */
const grade = (...valores: number[]): Board => {
  if (valores.length !== SIZE * SIZE) throw new Error(`grade precisa de ${SIZE * SIZE} casas`);
  return valores.map((v) => (v === 0 ? 0 : Math.log2(v)));
};
/** De volta a valores, para o `expect` falhar dizendo `[4,4,0,0]` e não `[2,2,0,0]`. */
const valores = (b: Board): number[] => b.map((e) => (e === 0 ? 0 : 2 ** e));
/** Uma linha só, com o resto vazio — a forma mais legível de testar deslizamento horizontal. */
const linha = (...v: number[]): Board => grade(...v, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
/** Uma coluna só. `[a,b,c,d]` vira a primeira coluna. */
const coluna = (a: number, b: number, c: number, d: number): Board =>
  grade(a, 0, 0, 0, b, 0, 0, 0, c, 0, 0, 0, d, 0, 0, 0);
const primeiraLinha = (b: Board): number[] => valores(b).slice(0, SIZE);
const primeiraColuna = (b: Board): number[] => [0, 1, 2, 3].map((y) => valores(b)[y * SIZE]);

const VAZIO: Board = grade(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

describe('slide — deslizar e fundir', () => {
  it('[Zero] tabuleiro vazio não se move em direção nenhuma', () => {
    for (const dir of ['left', 'right', 'up', 'down'] as const) {
      const r = slide(VAZIO, dir);
      expect(r.moved, dir).toBe(false);
      expect(r.gained, dir).toBe(0);
      expect(valores(r.board), dir).toEqual(valores(VAZIO));
    }
  });

  it('[One] uma peça sozinha vai até a parede, e não funde com ninguém', () => {
    const r = slide(linha(0, 0, 2, 0), 'left');
    expect(primeiraLinha(r.board)).toEqual([2, 0, 0, 0]);
    expect(r.moved).toBe(true);
    expect(r.merges).toEqual([]);
    expect(r.gained).toBe(0);
  });

  it('[Right] duas iguais adjacentes viram uma do dobro', () => {
    const r = slide(linha(2, 2, 0, 0), 'left');
    expect(primeiraLinha(r.board)).toEqual([4, 0, 0, 0]);
    expect(r.gained).toBe(4);
    expect(r.merges).toEqual([{ at: 0, exponent: 2 }]);
  });

  it('[Many] ⚠️ quatro iguais viram DUAS fusões, nunca uma cascata', () => {
    const r = slide(linha(2, 2, 2, 2), 'left');
    expect(primeiraLinha(r.board), 'cada peça funde no máximo uma vez por jogada').toEqual([4, 4, 0, 0]);
    expect(r.gained).toBe(8);
    expect(r.merges).toHaveLength(2);
  });

  it('[Exception] a peça RECÉM-FUNDIDA não funde de novo na mesma jogada', () => {
    // 2+2 vira 4 na casa 0; o 4 que já estava ali ao lado NÃO pode se juntar a ele agora.
    const r = slide(linha(2, 2, 4, 0), 'left');
    expect(primeiraLinha(r.board)).toEqual([4, 4, 0, 0]);
    expect(r.gained).toBe(4);
  });

  it('[Boundary] com três iguais, funde o par mais perto da PAREDE para onde se empurra', () => {
    expect(primeiraLinha(slide(linha(2, 2, 2, 0), 'left').board)).toEqual([4, 2, 0, 0]);
    expect(primeiraLinha(slide(linha(0, 2, 2, 2), 'right').board)).toEqual([0, 0, 2, 4]);
  });

  it('[Boundary] um bloqueio no caminho não impede o par de trás de fundir', () => {
    expect(primeiraLinha(slide(linha(4, 2, 2, 0), 'left').board)).toEqual([4, 4, 0, 0]);
  });

  it('[Simple] jogada que não muda nada devolve moved:false — e é o que impede o sorteio', () => {
    const encostado = linha(4, 2, 0, 0);
    const r = slide(encostado, 'left');
    expect(r.moved, 'sem isto, cada tecla inútil ainda enche o tabuleiro').toBe(false);
    expect(valores(r.board)).toEqual(valores(encostado));
  });

  it('[Interface] as colunas obedecem à mesma regra que as linhas', () => {
    expect(primeiraColuna(slide(coluna(2, 2, 2, 2), 'up').board)).toEqual([4, 4, 0, 0]);
    expect(primeiraColuna(slide(coluna(2, 2, 2, 2), 'down').board)).toEqual([0, 0, 4, 4]);
    expect(primeiraColuna(slide(coluna(0, 0, 0, 8), 'up').board)).toEqual([8, 0, 0, 0]);
  });

  it('[Interface] `gained` é a soma dos valores FORMADOS, que é o placar da rodada', () => {
    const r = slide(linha(4, 4, 8, 8), 'left');
    expect(primeiraLinha(r.board)).toEqual([8, 16, 0, 0]);
    expect(r.gained).toBe(8 + 16);
  });

  it('[Right] o tabuleiro de entrada NÃO é modificado — a jogada devolve um novo', () => {
    const antes = linha(2, 2, 0, 0);
    const copia = [...antes];
    slide(antes, 'left');
    expect([...antes]).toEqual(copia);
  });
});

describe('spawn — o sorteio, e por que ele é semeado', () => {
  /** Um `rnd` de mentira: devolve a sequência dada, em ordem. Semente falsa é semente controlada. */
  const rndFixo = (...vs: number[]) => { let i = 0; return () => vs[i++ % vs.length]; };

  it('[One] a peça nova cai numa casa VAZIA', () => {
    const quaseCheio = grade(2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 0);
    const r = spawn(quaseCheio, rndFixo(0.5, 0.5));
    expect(r).not.toBeNull();
    expect(r!.at, 'só havia uma casa livre').toBe(15);
  });

  it('[Zero] tabuleiro cheio devolve null — e null é resposta, não erro', () => {
    const cheio = grade(2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2);
    expect(spawn(cheio, rndFixo(0.5))).toBeNull();
  });

  it('[Right] a mesma semente dá a mesma partida — é o que o ADR-0049 pede e o que torna isto testável', () => {
    const semente = () => { let s = 20260905; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; };
    const a = spawn(VAZIO, semente());
    const b = spawn(VAZIO, semente());
    expect(a).toEqual(b);
  });

  it('[Boundary] sai 4 na fatia declarada do sorteio, e 2 no resto', () => {
    // O primeiro número escolhe a casa; o segundo escolhe o valor. 0.05 < 0.1 → peça 4; 0.5 → peça 2.
    expect(spawn(VAZIO, rndFixo(0, 0.05))!.exponent, '2^2 = 4').toBe(2);
    expect(spawn(VAZIO, rndFixo(0, 0.5))!.exponent, '2^1 = 2').toBe(1);
  });

  it('[Right] o tabuleiro de entrada NÃO é modificado', () => {
    const copia = [...VAZIO];
    spawn(VAZIO, rndFixo(0, 0.5));
    expect([...VAZIO]).toEqual(copia);
  });
});

describe('canMove, mergeSpots e maxTile — o que a declaração pergunta', () => {
  it('[Zero] tabuleiro cheio SEM vizinhos iguais: não há jogada', () => {
    const travado = grade(2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2);
    expect(canMove(travado)).toBe(false);
    expect(mergeSpots(travado)).toEqual([]);
  });

  it('[One] tabuleiro cheio COM um par vizinho: ainda há jogada, e o sonar sabe onde', () => {
    const umPar = grade(2, 2, 4, 8, 4, 8, 2, 4, 8, 2, 4, 8, 2, 4, 8, 2);
    expect(canMove(umPar)).toBe(true);
    expect(mergeSpots(umPar), 'as duas casas do par, para o sonar apontar').toEqual([0, 1]);
  });

  it('[Boundary] o par pode ser VERTICAL, e o crivo horizontal sozinho não o veria', () => {
    const parVertical = grade(2, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2);
    expect(mergeSpots(parVertical)).toContain(0);
    expect(mergeSpots(parVertical)).toContain(4);
  });

  it('[Simple] com casa vazia sempre há jogada, mesmo sem nenhum par', () => {
    expect(canMove(linha(2, 4, 8, 16))).toBe(true);
  });

  it('[Interface] maxTile devolve o EXPOENTE, que é o que o objetivo compara com 11', () => {
    expect(maxTile(VAZIO)).toBe(0);
    expect(maxTile(linha(2, 4, 8, 16))).toBe(4);
    expect(maxTile(grade(2048, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)), '2^11').toBe(11);
  });
});
