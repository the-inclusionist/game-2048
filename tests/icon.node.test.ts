// SPDX-License-Identifier: AGPL-3.0-or-later
// THE ONE ART ASSET IN THIS REPOSITORY, AND THE TWO CLAIMS IT COULD HAVE BROKEN.
//
// ========================= WHY THERE IS AN ICON AT ALL =========================
// A PWA manifest wants one, and without a PWA the README's line 5 — "offline as a PWA" — was false, which
// ADR-0140 names this game by line for. So the icon exists because a claim had to become true.
//
// ========================= AND WHY IT IS VECTOR =========================
// `docs/LICENSES.md` says every surface here is drawn at run time and that there is "no third-party art to
// license, and no artist's Lei nº 9.610/1998 rights to respect, because there is no drawn asset". A PNG would
// have made that paragraph false in the same commit that made line 5 true — one claim repaired by breaking
// another. An SVG is geometry, it is ours, and the sentence survives.
//
// ========================= THE DUPLICATED FACT, AND WHY IT IS ALLOWED HERE =========================
// SVG cannot import a TypeScript module, so the four colours are written twice: once in `render/palette.ts`,
// once in the icon. A duplicated fact rots — this file is the reason it cannot. If somebody retunes the
// palette and the icon keeps the old green, the game and the thing a child taps on her home screen stop
// being the same game, and nothing else in the suite would notice.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FUNDO_DA_TELA, MOLDURA, TINTA_ESCURA, fundoDe, inkFor } from '../app/js/render/palette.ts';
import { OBJETIVO } from '../app/js/board.ts';

/** `0x0d1018` as the `#0d1018` an SVG attribute carries. */
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
const svg = readFileSync(new URL('../app/public/icon.svg', import.meta.url), 'utf8');

describe('the icon is the game’s own palette', () => {
  it('[Cross-check] the screen, the frame and the 2048 tile are the colours the code paints', () => {
    for (const [nome, cor] of [
      ['screen background', FUNDO_DA_TELA],
      ['board frame', MOLDURA],
      ['the 2048 tile', fundoDe(OBJETIVO)],
    ] as const) {
      expect(svg, `${nome} (${hex(cor)})`).toContain(hex(cor));
    }
  });

  it('[Right] the number uses the ink `inkFor` CHOOSES over that tile, not a guess', () => {
    // The same rule as every tile on the board: the ink is computed from the background, never picked. If the
    // 2048 colour is ever retuned past the crossover, this assertion moves the icon's text with it.
    expect(inkFor(fundoDe(OBJETIVO))).toBe(TINTA_ESCURA);
    expect(svg).toContain(hex(TINTA_ESCURA));
  });

  it('[Zero] and it is still not a bitmap — `LICENSES.md` says so about the whole repository', () => {
    expect(svg.trimStart().startsWith('<svg'), 'vector, so the art claim survives').toBe(true);
    expect(svg, 'an embedded raster would be a drawn asset in all but name').not.toMatch(/data:image\/(png|jpe?g|gif|webp)/i);
  });

  it('[Interface] it carries a name, because an icon is announced too', () => {
    expect(svg).toContain('role="img"');
    expect(svg).toMatch(/aria-label="[^"]+"/);
  });
});
