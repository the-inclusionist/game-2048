// SPDX-License-Identifier: AGPL-3.0-or-later
// A ANIMAÇÃO ACONTECENDO — num navegador de verdade, que é o único lugar onde ela existe.
//
// ========================= POR QUE ESTE ARQUIVO É NECESSÁRIO =========================
// `tests/animation.node.test.ts` prova a CONTA: entra `t`, sai posição. Este prova a outra metade, que
// nenhuma conta pode provar — que o `calc(N * var(--px))` escrito pelo JavaScript vira o pixel certo depois
// de o navegador resolver a variável, e que a peça de fato ATRAVESSA o tabuleiro em vez de saltar.
//
// ⚠️ E ele existe porque a verificação manual não estava disponível: o painel de navegador desta sessão fica
// OCULTO, e num documento escondido o `requestAnimationFrame` não roda — foi assim que o defeito da tela
// desatualizada apareceu (ver `podeAnimar`). Aqui a página está viva, então o quadro acontece.
import { beforeEach, describe, expect, it } from 'vitest';
import { pecasNoInstante, pecasParadas, posicaoDe } from '../app/js/animation.ts';
import { SIZE, slide, type Board } from '../app/js/board.ts';
import { BOARD, BOARD_X, BOARD_Y, cellRect } from '../app/js/geometry.ts';
import { criarCamadaDePecas } from '../app/js/ui/tiles-layer.ts';

/** O `k` que o `ui/layout` publicaria. Fixado para a conta poder ser conferida. */
const K = 4;
const grade = (...v: number[]): Board => v.map((x) => (x === 0 ? 0 : Math.log2(x)));
const linha = (...v: number[]): Board => grade(...v, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const papelFixo = () => 'free';

let regiao: HTMLElement;
let camada: ReturnType<typeof criarCamadaDePecas>;

beforeEach(() => {
  document.body.replaceChildren();
  regiao = document.createElement('div');
  regiao.style.position = 'relative';
  regiao.style.width = `${320 * K}px`;
  regiao.style.height = `${180 * K}px`;
  // Exatamente o que `ui/layout` escreve, com `--px` derivado como a folha do jogo o deriva. Fixar `--px`
  // direto passaria por cima da própria linha que este teste existe para verificar.
  regiao.style.setProperty('--ui-fs', `${8 * K}px`);
  regiao.style.setProperty('--px', 'calc(var(--ui-fs) / 8)');
  document.body.appendChild(regiao);

  // ⚠️ A CAMADA NÃO É POSICIONADA AQUI, e antes era — este teste escrevia `left`/`top`/`width`/`height` na
  // raiz dela antes de medir. Fazia, portanto, o trabalho que o código de produção tinha ESQUECIDO: a camada
  // real cobria a região inteira e os números apareciam 164 por 16 pixels lógicos à esquerda das peças. O
  // teste passava verde com a tela errada, e só uma captura mostrou.
  //
  // Agora entra só o `position: absolute` que a folha de estilo daria — a folha real não é carregada aqui —,
  // e TUDO o mais tem de vir do módulo.
  camada = criarCamadaDePecas(document);
  camada.raiz.style.position = 'absolute';
  regiao.appendChild(camada.raiz);
  for (const el of camada.raiz.children) (el as HTMLElement).style.position = 'absolute';
});

/** A caixa de uma peça, em pixels lógicos relativos à região — desfazendo o `k`. */
function caixaLogica(el: HTMLElement) {
  const r = regiao.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return { x: (b.x - r.x) / K, y: (b.y - r.y) / K };
}

const visiveis = () => [...camada.raiz.querySelectorAll<HTMLElement>('.p2-tile')].filter((e) => !e.hidden);

describe('a peça desenhada cai no pixel que a conta mandou', () => {
  it('[Right] a CAMADA se posiciona sozinha sobre o tabuleiro — sem ninguém a ajudar', () => {
    // O gate do defeito de 05/09: era o teste que a posicionava, então ela podia estar errada em produção.
    const r = regiao.getBoundingClientRect();
    const b = camada.raiz.getBoundingClientRect();
    expect(Math.round(b.x - r.x), 'BOARD_X · k').toBe(BOARD_X * K);
    expect(Math.round(b.y - r.y), 'BOARD_Y · k').toBe(BOARD_Y * K);
    expect(Math.round(b.width), 'BOARD · k').toBe(BOARD * K);
  });

  it('[Right] parada, ela fica exatamente sobre a casa — como o canvas a desenharia', () => {
    const pecas = pecasParadas(linha(2, 0, 0, 8));
    camada.desenhar(pecas, false, papelFixo);
    for (const el of visiveis()) {
      // ⚠️ `position: absolute` é aplicado pelo teste porque a folha real não é carregada; o que se verifica
      // é a TRANSFORMADA que o módulo escreveu, resolvida pelo navegador.
      el.style.position = 'absolute';
    }
    const caixas = visiveis().map(caixaLogica);
    expect(caixas[0]).toEqual({ x: cellRect(0).x, y: cellRect(0).y });
    expect(caixas[1]).toEqual({ x: cellRect(3).x, y: cellRect(3).y });
  });

  it('[Many] no MEIO do deslize ela está entre duas casas, e nunca sobre uma', () => {
    const r = slide(linha(0, 0, 0, 2), 'left');
    const casas = Array.from({ length: SIZE * SIZE }, (_, i) => cellRect(i).x);
    const vistos: number[] = [];
    for (const t of [0.2, 0.4, 0.6, 0.8]) {
      camada.desenhar(pecasNoInstante(r.movimentos, t), false, papelFixo);
      for (const el of visiveis()) el.style.position = 'absolute';
      const x = caixaLogica(visiveis()[0]).x;
      vistos.push(x);
      expect(casas, `t=${t} caiu em cima de uma casa — isso é salto, não deslize`).not.toContain(x);
    }
    // E anda sempre para o mesmo lado: a peça não volta atrás no meio do caminho.
    for (let i = 1; i < vistos.length; i++) expect(vistos[i]).toBeLessThan(vistos[i - 1]);
  });

  it('[Cross-check] o navegador concorda com a conta pura, pixel a pixel', () => {
    // É a costura entre `animation.ts` (aritmética) e o CSS (resolução do `calc`). Se divergissem, a peça
    // desenhada e a peça calculada estariam em lugares diferentes — e nenhum teste de nó veria.
    const r = slide(linha(0, 0, 0, 4), 'left');
    for (const t of [0, 0.35, 0.7, 1]) {
      const esperado = posicaoDe(r.movimentos[0], t);
      camada.desenhar([esperado], false, papelFixo);
      for (const el of visiveis()) el.style.position = 'absolute';
      const medido = caixaLogica(visiveis()[0]);
      expect(medido.x, `t=${t}`).toBeCloseTo(esperado.x, 5);
      expect(medido.y, `t=${t}`).toBeCloseTo(esperado.y, 5);
    }
  });

  it('[Zero] peças que sobraram do quadro anterior somem em vez de ficarem penduradas', () => {
    camada.desenhar(pecasParadas(linha(2, 4, 8, 16)), false, papelFixo);
    expect(visiveis()).toHaveLength(4);
    camada.desenhar(pecasParadas(linha(2, 0, 0, 0)), false, papelFixo);
    expect(visiveis(), 'três peças fantasmas ficariam na tela').toHaveLength(1);
  });

  it('[Interface] o número é TEXTO no DOM, e o elemento sai da árvore de acessibilidade', () => {
    camada.desenhar(pecasParadas(linha(2048, 0, 0, 0)), false, papelFixo);
    expect(visiveis()[0].textContent, 'texto de verdade, não um glifo pintado').toBe('2048');
    expect(camada.raiz.getAttribute('aria-hidden'), 'quem responde pela grade é `board-dom`').toBe('true');
  });

  it('[Boundary] o pool REUSA os elementos — não recria dezesseis nós por quadro', () => {
    camada.desenhar(pecasParadas(linha(2, 4, 0, 0)), false, papelFixo);
    const primeiro = visiveis()[0];
    camada.desenhar(pecasParadas(linha(8, 16, 0, 0)), false, papelFixo);
    expect(visiveis()[0], 'nó novo a cada quadro perde estado e faz o texto piscar').toBe(primeiro);
    expect(visiveis()[0].textContent).toBe('8');
  });
});
