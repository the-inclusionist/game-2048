// SPDX-License-Identifier: AGPL-3.0-or-later
// THE COLOURS — and the ink for each one is COMPUTED, not chosen.
//
// ========================= WHY THIS IS A PURE MODULE =========================
// Zero PIXI, zero DOM: it is colour arithmetic. That makes every tile's CONTRAST verifiable in the `node`
// project, without a browser — and it becomes a gate instead of a good intention.
// `tests/palette.node.test.ts` fails any pair that does not reach WCAG 1.4.3's AA, and counts how many reach
// 1.4.6's AAA.
//
// ========================= THE INK IS NOT PICKED BY HAND, WHICH IS WHY IT DOES NOT GET IT WRONG =========
// `inkFor()` chooses between a near-black and a near-white ink by whichever has MORE contrast with the
// background. Picking by hand, colour by colour, is where somebody gets ten right and the eleventh wrong —
// and the eleventh is the 2048 tile, the one the child will look at longest. Here the mistake has no way in.
//
// ========================= AND NO COLOUR COMES FROM THE ORIGINAL 2048 =========================
// `docs/LICENSES.md` says no colour of the original palette is reused. Cirulli's visual identity — the beiges
// and oranges — is his design, and design is expression. This ramp goes cool→warm by another route: it starts
// at a paper blue and ends at the green the engine already uses for "you did it".

/** A colour as `0xRRGGBB`, the way PIXI wants it. */
export type Cor = number;

const canais = (c: Cor): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

/** WCAG 2.x relative luminance (§ relative luminance). */
export function luminancia(c: Cor): number {
  const [r, g, b] = canais(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio. 4.5 is AA for normal text; 7 is AAA. */
export function contraste(a: Cor, b: Cor): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * The two candidate inks. They are not pure `#000` and `#fff` on purpose: absolute black over a saturated
 * colour haloes on a cheap matrix screen, and absolute white over a dark background "bleeds" on the same
 * screen. The target is pillar 1's devices, not an office monitor.
 */
export const TINTA_ESCURA: Cor = 0x14161f;
export const TINTA_CLARA: Cor = 0xf6f8ff;

/** The ink with MORE contrast over this background. Computed, and therefore never forgotten. */
export const inkFor = (fundo: Cor): Cor =>
  contraste(fundo, TINTA_ESCURA) >= contraste(fundo, TINTA_CLARA) ? TINTA_ESCURA : TINTA_CLARA;

/**
 * The background of each tile, indexed by EXPONENT. Position 0 is the empty square.
 *
 * Eleven steps, because eleven doublings is the whole round, plus one extra for anyone who goes past 2048
 * without the round ending on it. The ramp is monotonic in luminance for the first steps and then turns to
 * hue: a child with colour blindness tells the early ones apart by LIGHT/DARK even without telling the colours
 * apart, and the high ones are few and rare enough that the number is the main cue.
 *
 * ⚠️ AND THE DEAD ZONE IS WHAT GAVE THIS RAMP ITS SHAPE, measured on 2026-09-05 when the gate failed two
 * colours I had chosen myself. There is a band of luminance — roughly between 0.17 and 0.21 — where NEITHER
 * ink reaches 4.5:1, because the colour is too far from both black and white at once. It is not solved by
 * choosing better: it is solved by JUMPING the band. Hence the abrupt step between the 16 (light, dark ink)
 * and the 32 (dark, light ink), which looks arbitrary and is the opposite of that.
 */
export const FUNDO: readonly Cor[] = [
  0x1d2130, // 0 — empty square: the hole in the board                · 15.08:1
  0xe8eef7, // 1 — 2                                                  · 15.46:1
  0xb9d0ec, // 2 — 4                                                  · 11.42:1
  0x86b3e3, // 3 — 8                                                  ·  8.22:1
  0x58a0e8, // 4 — 16   (last with dark ink on the way down)           ·  6.53:1
  0x24528f, // 5 — 32   (jumps the dead zone, and the ink flips light) ·  7.39:1
  0x6d4fb5, // 6 — 64                                                 ·  5.76:1
  0x9a3fa8, // 7 — 128                                                ·  5.42:1
  0xb83c66, // 8 — 256                                                ·  5.11:1
  0xa8481c, // 9 — 512                                                ·  5.48:1
  0xd99a1f, // 10 — 1024 (back to light for the home stretch)          ·  7.38:1
  0x34e29b, // 11 — 2048: the green the engine already uses for "you did it" · 10.73:1
  0xffd23f, // 12+ — beyond what the round asked for                   · 12.49:1
];

/** This tile's background, with the last step covering everything past it. */
export const fundoDe = (expoente: number): Cor => FUNDO[Math.min(expoente, FUNDO.length - 1)];

/** The board's frame and the screen's background. */
export const MOLDURA: Cor = 0x2b3145;
export const FUNDO_DA_TELA: Cor = 0x0d1018;

/**
 * HIGH CONTRAST BY ROLE, AT THE THREE LEVELS THE ENGINE NAMES — `hc3`, `hc45`, `hc7` (ADR-0104's contrast axis).
 *
 * The IDEA is field 2 of the contract: paint by ROLE, not by value. Whatever can merge (`goal`) gets the
 * highlight colour; whatever merely takes up space (`structure`) stays grey; a free square (`free`) stays
 * background. The child with low vision starts seeing THE MOVE instead of memorising the board.
 *
 * ========================= 🔴 WHAT THE LEVELS MEASURE, AND WHAT I GOT WRONG =========================
 * Until 2026-10-03 this game refused the engine's axis and shipped a `◐ Alto contraste` toggle of its own.
 * The argument, written in `tests/visual.node.test.ts` and repeated for a month, was arithmetic: three roles
 * pairwise at 7:1 would need 49:1 between the extremes and the WCAG scale stops at 21, so `hc7` was not hard
 * but IMPOSSIBLE.
 *
 * 📏 THE ARITHMETIC WAS RIGHT AND THE QUESTION WAS WRONG. The engine says what the levels mean, in the words
 * a child reads (`i18n/en.js:570`):
 *
 *   · `hc3`  — «Background recedes + outlines + colour by role; platform vs background ~3:1 (AA graphics)»
 *   · `hc45` — «More contrast (AA text): lighter platforms and a darker background»
 *   · `hc7`  — «Maximum contrast (AAA text): almost black and white»
 *
 * FIGURE against BACKGROUND — one pair — never role against role. «Almost black and white» is the engine
 * telling anyone who reads it how `hc7` is reached. I measured the pairs nobody asked about and concluded a
 * control the child needs could not exist.
 *
 * So each level below holds every role against the SCREEN BACKGROUND of that level, and the background
 * darkens as the level rises, which is exactly what the engine describes. `tests/palette.node.test.ts` has
 * the ratios as a gate.
 */
export type Nivel = 'hc3' | 'hc45' | 'hc7';

/**
 * ========================= THE FOUR PAIRS THAT HAD TO HOLD AT ONCE =========================
 * These numbers were SOLVED, not chosen, and the search is in the gate below. Four demands meet here:
 *
 *   1. figure vs screen background, at the level's own ratio — the engine's definition of the level;
 *   2. the NUMBER inside a tile vs that tile, at the same ratio — it is text, and text is why the levels
 *      are named after 1.4.3's thresholds;
 *   3. every role vs the FRAME, at 3:1 (WCAG 1.4.11) — and the frame is the pair that actually exists,
 *      because two tiles never touch: `GAP` of frame runs between them;
 *   4. the empty square vs the frame, at 3:1 — 📏 the first palette I wrote had `free` equal to the
 *      background and the frame nearly so, which at `hc7` gave 1.00: the board's grid would have vanished
 *      and the child would have been left looking for sixteen squares that were not drawn.
 *
 * 🔴 THE GEOMETRY FORCES LIGHT TILES ON A DARK BOARD, and that is not a taste. The frame must separate from
 * a near-black background (≥3:1 puts its luminance over 0.10) and the tiles must separate from the frame
 * (≥3:1 again puts them over 0.40). A mid-grey `structure` cannot satisfy both. The engine says the same
 * thing in the child's words at `hc45`: «lighter platforms and a darker background».
 */
export const FUNDO_DA_TELA_POR_NIVEL: Readonly<Record<Nivel, Cor>> = {
  hc3: 0x0d1018,
  hc45: 0x05060a,
  hc7: 0x000000,
};

/** The frame between the squares, per level — the surface every role is measured against for 1.4.11. */
export const MOLDURA_POR_NIVEL: Readonly<Record<Nivel, Cor>> = {
  hc3: 0x616161,
  hc45: 0x646464,
  hc7: 0x5a5a5a,
};

/**
 * The role colours per level. `free` is the background itself at every level — an empty square IS the screen
 * showing through, and what makes it readable as a square is the frame around it, which is demand 4 above.
 */
export const PAPEL_POR_NIVEL: Readonly<Record<Nivel, Readonly<Record<string, Cor>>>> = {
  hc3: {
    goal: 0xffd23f, structure: 0xb8b8b8, free: 0x0d1018,
    hazard: 0xff8a6a, climb: 0xc79a5a, water: 0x7fb2e0, gate: 0xcabb97, key: 0xffe06a,
  },
  hc45: {
    goal: 0xffe04a, structure: 0xd2d2d2, free: 0x05060a,
    hazard: 0xffa58a, climb: 0xd9b67a, water: 0xa8cdee, gate: 0xdcd0b4, key: 0xffea8a,
  },
  hc7: {
    goal: 0xffffff, structure: 0xe1e1e1, free: 0x000000,
    hazard: 0xffffff, climb: 0xe1e1e1, water: 0xe1e1e1, gate: 0xe1e1e1, key: 0xffffff,
  },
};

/** The colour a role takes at a level, with `free` as the honest fallback for a role this game never draws. */
export function corDoPapel(papel: string, nivel: Nivel): Cor {
  const tabela = PAPEL_POR_NIVEL[nivel];
  return tabela[papel] ?? tabela.free;
}
