// SPDX-License-Identifier: AGPL-3.0-or-later
// OS SETE CAMPOS, RESPONDIDOS POR UMA GRADE — e é isto que este jogo dá à engine em troca do que recebe.
//
// ========================= POR QUE ESTE ARQUIVO IMPORTA ALÉM DESTE JOGO =========================
// O ADR-0030 escolheu os sete campos do `core/contract` como o eixo da engine e disse, na própria decisão,
// que "o contrato basta" só deixa de ser hipótese QUANDO DOIS PRESETS EXISTIREM. Existia um: o
// `consumer-quiz`, com topologia `hotspots` — uma lista ordenada, o caso mais pobre possível, sem espaço
// nenhum. Este é o segundo, e é `grid`: o primeiro do projeto.
//
// A diferença não é contagem. `hotspots` não tem para onde apontar, e o achado 9 do quiz registra que ali o
// sonar ficou "correto e inútil". Numa grade há distância, vizinhança e direção — então os campos 1, 4 e 5
// passam a ser exercidos de verdade, e a pergunta "a forma da pergunta está certa?" finalmente tem como ser
// respondida por alguma coisa além de uma leitura.
//
// ========================= O OBJETIVO É EM DOBRAS, E ISSO É DECISÃO =========================
// A moldura do HUD da engine é `'{have} de {need} {nome}'`. Com valores daria "16 de 2048", que é verdade e
// não ensina nada. Com EXPOENTES dá **"4 de 11 dobras"** — e 11 é exatamente o que 2048 é: onze
// duplicações. O contador do jogo passa a dizer a matéria em vez de só marcar pontos, e não custou um campo
// novo na engine: é o mesmo `have`/`need` que contava moeda.
import {
  conformanceProblems, distance, speakableProblems, type Heading,
} from '@the-inclusionist/engine/core/contract.js';
import { describe, expect, it } from 'vitest';
import { OBJETIVO, SIZE, type Board } from '../app/js/board.ts';
import { criarDeclaracao, type Observado } from '../app/js/declaration.ts';

const grade = (...valores: number[]): Board => valores.map((v) => (v === 0 ? 0 : Math.log2(v)));
/**
 * Um `t` de mentira que MARCA o que passou por ele.
 *
 * ⚠️ Ele devolvia a chave crua, e uma mutação atravessou esse buraco VERDE: com `t = (k) => k`, `t('8')` dá
 * `'8'`, indistinguível de não chamar `t` nenhum. O teste não conseguia separar "o numeral NÃO passa pelo
 * dicionário" — que é decisão registrada em `declaration.ts`, e cara: mandar numeral para o `t()` criaria
 * 2048 chaves para traduzir um algarismo — de "passa, e a tradução calha de ser igual". Com a marca, passar
 * pelo dicionário deixa rastro, e a decisão vira gate em vez de comentário.
 */
const chave = (k: string) => `t:${k}`;

/** Um jogo parado, observado pela declaração. Só o que os sete campos perguntam. */
function observar(board: Board, cursor = { x: 0, y: 0 }, heading: Heading = 'none') {
  const o: Observado = { board: () => board, cursor: () => cursor, heading: () => heading, t: chave };
  return criarDeclaracao(o);
}

const VAZIO = grade(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
/** Um par de 2 no topo à esquerda; o resto sem nenhum vizinho igual. */
const COM_PAR = grade(2, 2, 4, 8, 4, 8, 2, 4, 8, 2, 4, 8, 2, 4, 8, 2);
/** Xadrez de 2 e 4: cheio, e sem uma única fusão possível. */
const TRAVADO = grade(2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2);

describe('a declaração é bem-formada aos olhos da própria engine', () => {
  it('[Interface] `conformanceProblems` não acha nada — em tabuleiro vazio, cheio e travado', () => {
    for (const b of [VAZIO, COM_PAR, TRAVADO]) {
      expect(conformanceProblems(observar(b))).toEqual([]);
    }
  });

  it('[Right] a topologia é uma GRADE 4×4, ortogonal e em bússola', () => {
    expect(observar(VAZIO).topology()).toEqual({
      kind: 'grid', size: [SIZE, SIZE], move: 'orthogonal', frame: 'compass',
    });
  });

  it('[Right] o MUNDO é declarado, e não é `none`', () => {
    // `none` existe para atividade sem espaço — pintura, formulário — e o contrato avisa que ele não pode
    // ser o que acontece quando alguém esquece. Um tabuleiro tem espaço, e declarar `none` desligaria o
    // sonar e a empatia num jogo em que eles são a mecânica.
    expect(observar(VAZIO).world()).toEqual({ kind: 'element', selector: '#game-region' });
  });

  it('[Right] o turno é do JOGADOR, então a WCAG 2.2.1 é satisfeita por construção', () => {
    expect(observar(VAZIO).tick, 'sem relógio, nada pressiona').toBe('player');
  });
});

describe('campo 2 — o PAPEL de cada casa, que é de onde sai o alto contraste', () => {
  it('[Zero] casa vazia é `free`: atravessável e sem significado próprio', () => {
    expect(observar(VAZIO).roleAt({ x: 2, y: 1 })).toBe('free');
  });

  it('[Right] peça que PODE fundir é `goal` — é o que a rodada pede', () => {
    const d = observar(COM_PAR);
    expect(d.roleAt({ x: 0, y: 0 })).toBe('goal');
    expect(d.roleAt({ x: 1, y: 0 })).toBe('goal');
  });

  it('[Boundary] peça que NÃO pode fundir é `structure`: está lá, e atrapalha', () => {
    expect(observar(COM_PAR).roleAt({ x: 3, y: 0 }), 'o 8 sem par').toBe('structure');
    expect(observar(TRAVADO).roleAt({ x: 1, y: 1 }), 'no travado, nenhuma é goal').toBe('structure');
  });

  it('[Exception] fora da grade é `free`, e não uma exceção — a engine varre bordas', () => {
    const d = observar(COM_PAR);
    expect(d.roleAt({ x: -1, y: 0 })).toBe('free');
    expect(d.roleAt({ x: SIZE, y: SIZE })).toBe('free');
  });
});

describe('campo 3 — o nome FALÁVEL, que é o mesmo dado que a Libras traduz', () => {
  it('[One] a peça se chama pelo seu NÚMERO, que não depende de idioma', () => {
    const n = observar(COM_PAR).nameAt({ x: 3, y: 0 });
    expect(n?.text).toBe('8');
    expect(speakableProblems(n)).toEqual([]);
  });

  it('[Zero] a casa vazia se chama por uma CHAVE — porque "vazio" é palavra e palavra traduz', () => {
    expect(observar(VAZIO).nameAt({ x: 0, y: 0 })?.text).toBe('t:cell.empty');
  });

  it('[Boundary] fora da grade não há nome: `null`, que é o que o contrato pede', () => {
    expect(observar(VAZIO).nameAt({ x: SIZE, y: 0 })).toBeNull();
  });
});

describe('campo 5 — objetivo e alvo, as duas metades', () => {
  it('[Interface] o objetivo conta DOBRAS: `{have} de {need}` vira "0 de 11"', () => {
    const o = observar(VAZIO).objectiveOf(0);
    expect(o.have).toBe(0);
    expect(o.need).toBe(OBJETIVO);
    expect(o.need, '2^11 = 2048').toBe(11);
    expect(o.name.text).toBe('t:hud.nome.dobras');
    expect(speakableProblems(o.name)).toEqual([]);
  });

  it('[Right] `have` é o EXPOENTE da maior peça, não o valor dela', () => {
    const b = grade(64, 2, 4, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    expect(observar(b).objectiveOf(0).have, '64 = 2^6, então seis dobras').toBe(6);
  });

  it('[Right] `targetsOf` aponta as casas de uma fusão disponível, em coordenada de grade', () => {
    expect(observar(COM_PAR).targetsOf(0)).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }]);
  });

  it('[Zero] sem fusão possível, `targetsOf` é VAZIO — e vazio é resposta, não erro', () => {
    expect(observar(TRAVADO).targetsOf(0)).toEqual([]);
  });
});

describe('campo 4 — o foco, e o que o sonar faz com ele', () => {
  it('[One] o foco é o cursor do teclado, com a última direção jogada', () => {
    const f = observar(COM_PAR, { x: 2, y: 3 }, 'e').focusOf(0);
    expect(f).toEqual({ id: 'p0', at: { x: 2, y: 3 }, heading: 'e' });
  });

  it('[Cross-check] a distância mede em CÉLULAS, e a diagonal custa DOIS passos', () => {
    // ⚠️ Esta asserção dizia "um passo" e estava errada sobre este jogo. A engine publicada tirou a métrica
    // de `move`, e ao declarar `orthogonal` — que é como uma peça de 2048 anda — a diagonal passa a custar
    // dois. Não é a engine mudando de ideia: é o contrato obrigando o jogo a dizer como se anda nele, e a
    // resposta certa fazendo o sonar parar de chamar de "bem perto" uma casa para onde a peça não vai.
    const t = observar(VAZIO).topology();
    expect(distance(t, { x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
    expect(distance(t, { x: 0, y: 0 }, { x: 1, y: 1 }), 'sem diagonal, é L¹').toBe(2);
  });

  it('[Interface] o sonar recebe o que precisa sem nenhum tile: topologia, alvo e nome', () => {
    // Este é o achado 9 do quiz virado do avesso. Lá, ligar o sonar teria exigido inventar tiles falsos;
    // aqui as três perguntas têm resposta verdadeira.
    //
    // ⚠️ O cursor é `(3,0)` e não um canto qualquer, e a razão é a MÉTRICA: em passos de rei, de `(3,3)` as
    // duas casas do par ficam à MESMA distância (3), e o teste estaria medindo a estabilidade do `sort` em
    // vez do sonar. De `(3,0)` a diferença é real — 3 contra 2 —, então há de fato uma "mais próxima".
    const de = { x: 3, y: 0 };
    const d = observar(COM_PAR, de);
    const perto = d.targetsOf(0)
      .map((a) => ({ a, dist: distance(d.topology(), de, a) }))
      .sort((p, q) => p.dist - q.dist)[0];
    expect(perto.dist).toBe(2);
    expect(perto.a).toEqual({ x: 1, y: 0 });
    expect(d.nameAt(perto.a)?.text).toBe('2');
  });
});
