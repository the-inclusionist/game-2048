// SPDX-License-Identifier: AGPL-3.0-or-later
// AS CORES — e a tinta de cada uma é CALCULADA, não escolhida.
//
// ========================= POR QUE ISTO É UM MÓDULO PURO =========================
// Zero PIXI, zero DOM: é aritmética de cor. Assim o CONTRASTE de cada peça é verificável no project `node`,
// sem navegador — e passa a ser gate em vez de boa intenção. `tests/palette.node.test.ts` reprova qualquer
// par que não alcance a AA da WCAG 1.4.3, e mede quantos alcançam a AAA da 1.4.6.
//
// ========================= A TINTA NÃO É ESCOLHIDA À MÃO, E É POR ISSO QUE ELA NÃO ERRA =========================
// `inkFor()` escolhe entre uma tinta quase-preta e uma quase-branca pela que tiver MAIS contraste com o
// fundo. Escolher à mão, cor a cor, é onde alguém acerta dez e erra a décima primeira — e a décima primeira
// é a peça 2048, a única que a criança vai olhar por muito tempo. Aqui o erro não tem por onde entrar.
//
// ========================= E NENHUMA COR VEM DO 2048 ORIGINAL =========================
// `docs/LICENSES.md` diz que nenhuma cor da paleta original é reusada. A identidade visual de Cirulli — os
// bege e laranja — é desenho dele, e desenho é expressão. Esta rampa é fria→quente por outro caminho: começa
// num azul de papel e termina no verde que a engine já usa para "conseguiu".

/** Uma cor em `0xRRGGBB`, como a PIXI quer. */
export type Cor = number;

const canais = (c: Cor): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

/** Luminância relativa da WCAG 2.x (§ relative luminance). */
export function luminancia(c: Cor): number {
  const [r, g, b] = canais(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste da WCAG 2.x. 4,5 é a AA para texto normal; 7 é a AAA. */
export function contraste(a: Cor, b: Cor): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * As duas tintas candidatas. Não são `#000` e `#fff` puros de propósito: preto absoluto sobre cor saturada
 * cria halo em tela de matriz barata, e branco absoluto sobre fundo escuro "sangra" na mesma tela. O alvo
 * são os aparelhos do pilar 1, não um monitor de escritório.
 */
export const TINTA_ESCURA: Cor = 0x14161f;
export const TINTA_CLARA: Cor = 0xf6f8ff;

/** A tinta que dá MAIS contraste sobre este fundo. Calculada, e por isso nunca esquecida. */
export const inkFor = (fundo: Cor): Cor =>
  contraste(fundo, TINTA_ESCURA) >= contraste(fundo, TINTA_CLARA) ? TINTA_ESCURA : TINTA_CLARA;

/**
 * O fundo de cada peça, indexado pelo EXPOENTE. A posição 0 é a casa vazia.
 *
 * Onze degraus, porque onze dobras é a rodada inteira, mais um extra para quem passar do 2048 sem que a
 * partida acabe por isso. A rampa é monotônica em luminância nos primeiros degraus e depois vira matiz: uma
 * criança com daltonismo distingue os primeiros pelo CLARO/ESCURO mesmo sem distinguir a cor, e os altos são
 * poucos e raros o bastante para o número ser a pista principal.
 */
// ⚠️ E A ZONA MORTA É O QUE DEU FORMA A ESTA RAMPA, medida em 2026-09-05 quando o gate reprovou duas cores
// que eu mesmo tinha escolhido. Existe uma faixa de luminância — grosso modo entre 0,17 e 0,21 — em que
// NENHUMA das duas tintas alcança 4,5:1, porque a cor está longe demais do preto e do branco ao mesmo tempo.
// Não se resolve escolhendo melhor: resolve-se SALTANDO a faixa. Daí o degrau brusco entre o 16 (claro,
// tinta escura) e o 32 (escuro, tinta clara), que parece arbitrário e é o oposto disso.
export const FUNDO: readonly Cor[] = [
  0x1d2130, // 0 — casa vazia: o buraco do tabuleiro          · 15,08:1
  0xe8eef7, // 1 — 2                                          · 15,46:1
  0xb9d0ec, // 2 — 4                                          · 11,42:1
  0x86b3e3, // 3 — 8                                          ·  8,22:1
  0x58a0e8, // 4 — 16    (último com tinta escura na descida)  ·  6,53:1
  0x24528f, // 5 — 32    (salta a zona morta, e a tinta vira clara) · 7,39:1
  0x6d4fb5, // 6 — 64                                         ·  5,76:1
  0x9a3fa8, // 7 — 128                                        ·  5,42:1
  0xb83c66, // 8 — 256                                        ·  5,11:1
  0xa8481c, // 9 — 512                                        ·  5,48:1
  0xd99a1f, // 10 — 1024 (volta ao claro para a reta final)    ·  7,38:1
  0x34e29b, // 11 — 2048: o verde que a engine já usa para "conseguiu" · 10,73:1
  0xffd23f, // 12+ — além do que a rodada pedia                · 12,49:1
];

/** O fundo desta peça, com o último degrau valendo para tudo que passar dele. */
export const fundoDe = (expoente: number): Cor => FUNDO[Math.min(expoente, FUNDO.length - 1)];

/** A moldura do tabuleiro e o fundo da tela. */
export const MOLDURA: Cor = 0x2b3145;
export const FUNDO_DA_TELA: Cor = 0x0d1018;

/**
 * ALTO CONTRASTE POR PAPEL — o achado 8 do quiz, resolvido no lado do jogo porque é aqui que ele mora.
 *
 * Os modos `hcnew` da engine repintam TEXTURAS DE TILE da plataforma, e este jogo não tem os tiles dela.
 * O que viaja é a IDEIA, e ela vem do campo 2 do contrato: pinta-se pelo PAPEL, não pelo valor. Quem pode
 * fundir (`goal`) recebe a cor de destaque; quem só ocupa espaço (`structure`) fica no cinza; casa livre
 * (`free`) fica no fundo. A criança com baixa visão passa a ver A JOGADA em vez de decorar o tabuleiro.
 */
export const HC_POR_PAPEL: Readonly<Record<string, Cor>> = {
  goal: 0xffd23f,
  structure: 0x6b7280,
  free: 0x101319,
  hazard: 0xff5b3a,
  climb: 0x8a5a2b,
  water: 0x2f6fae,
  gate: 0x9a8a6f,
  key: 0xffe06a,
};
