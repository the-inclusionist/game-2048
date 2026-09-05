// SPDX-License-Identifier: AGPL-3.0-or-later
// OS TRÊS IDIOMAS SÃO PISO, E ESTE ARQUIVO É O QUE IMPEDE O PISO DE AFUNDAR SEM AVISO.
//
// O tipo `Dicionario` já obriga `en` e `es` a terem exatamente as chaves de `pt` — esquecer uma é erro de
// compilação. Então por que um teste? Porque tipo não roda: ele some no build, e três defeitos que ele NÃO
// pega são justamente os que produzem uma interface meio traduzida sem ninguém notar —
//
//   · uma tradução deixada IGUAL ao português por descuido (o tipo está satisfeito, a criança lê pt);
//   · uma chave cujo `{param}` foi perdido na tradução (a frase sai com um buraco onde ia o número);
//   · uma tradução VAZIA (o leitor de tela simplesmente cala, que é o pior modo de falhar da a11y).
import { describe, expect, it } from 'vitest';
import en from '../app/js/i18n/en.ts';
import es from '../app/js/i18n/es.ts';
import pt, { type Chave } from '../app/js/i18n/pt.ts';

const IDIOMAS = { en, es } as const;
const chaves = Object.keys(pt) as Chave[];
/** Os `{param}` de uma frase, em conjunto — a ordem não importa, a presença importa. */
const params = (s: string): Set<string> => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

describe('os três idiomas do pilar 3', () => {
  it('[Interface] en e es têm EXATAMENTE as chaves de pt', () => {
    for (const [nome, dict] of Object.entries(IDIOMAS)) {
      expect(Object.keys(dict).sort(), nome).toEqual(chaves.slice().sort());
    }
  });

  it('[Zero] nenhuma tradução é vazia — string vazia faz o leitor de tela CALAR', () => {
    for (const [nome, dict] of Object.entries({ pt, ...IDIOMAS })) {
      const vazias = chaves.filter((k) => !dict[k].trim());
      expect(vazias, nome).toEqual([]);
    }
  });

  it('[Right] os {param} de cada chave sobrevivem à tradução', () => {
    for (const [nome, dict] of Object.entries(IDIOMAS)) {
      for (const k of chaves) {
        expect([...params(dict[k])].sort(), `${nome} → ${k}`).toEqual([...params(pt[k])].sort());
      }
    }
  });

  it('[Boundary] nenhuma frase de en ou es ficou IDÊNTICA ao português', () => {
    // Um par idêntico é quase sempre um esquecimento. Onde for legítimo, a exceção entra AQUI, nomeada —
    // e uma lista de exceções que cresce é o sinal de que a tradução parou de acontecer.
    const LEGITIMAS: readonly Chave[] = [];
    for (const [nome, dict] of Object.entries(IDIOMAS)) {
      const iguais = chaves.filter((k) => dict[k] === pt[k] && !LEGITIMAS.includes(k));
      expect(iguais, nome).toEqual([]);
    }
  });

  it('[Cross-check] as duas chaves que a DECLARAÇÃO pede existem nos três', () => {
    // Se estas sumirem, a engine narra a chave crua para uma criança cega. É o acoplamento entre
    // `declaration.ts` e o dicionário, e ele não tem outro lugar onde possa ser verificado.
    for (const [nome, dict] of Object.entries({ pt, ...IDIOMAS })) {
      expect(dict['cell.empty'], nome).toBeTruthy();
      expect(dict['hud.nome.dobras'], nome).toBeTruthy();
    }
  });

  it('[Exception] o espanhol é NEUTRO: nada de `vosotros`', () => {
    const vosotros = /\b(vosotros|vuestr\w+|áis|éis)\b/i;
    const tropeços = chaves.filter((k) => vosotros.test(es[k]));
    expect(tropeços, 'espanhol neutro latino-americano').toEqual([]);
  });
});
