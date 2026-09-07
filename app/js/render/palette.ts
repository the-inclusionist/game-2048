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
 * HIGH CONTRAST BY ROLE — the quiz's finding 8, solved on the game's side because this is where it lives.
 *
 * The engine's `hcnew` modes repaint the platformer's TILE TEXTURES, and this game does not have its tiles.
 * What travels is the IDEA, and it comes from field 2 of the contract: paint by ROLE, not by value. Whatever
 * can merge (`goal`) gets the highlight colour; whatever merely takes up space (`structure`) stays grey; a
 * free square (`free`) stays background. The child with low vision starts seeing THE MOVE instead of
 * memorising the board.
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
