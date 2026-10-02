// SPDX-License-Identifier: AGPL-3.0-or-later
// THE PICTURE OF THE BOARD — what sits UNDER the numbers, and what carries `aria-hidden`.
//
// ========================= IT DOES NOT IMPORT PIXI, AND THAT IS ADR-0035 IN USE =========================
// It receives a `Drawing` — the renderer port the engine already defines in `render/port` — instead of
// importing PixiJS. It is the same bet ADR-0035 made for the engine: the renderer is replaceable because no
// module names it. The immediate gain is another one and it is bigger: with the port, this function runs in
// the `node` project against a fake drawing, and THE BOARD CAN BE TESTED WITHOUT A BROWSER.
//
// ========================= ART IS DATA, AND HERE IT NEVER EVEN BECOMES A FILE =========================
// No PNG. Every tile is a rectangle in a computed palette — the project's "procedural art" rule, which here
// also settles the licence question by erasing it: there is no third-party asset to license, and no artist's
// rights under Lei nº 9.610/1998 to respect, because there is no drawing.
import type { Drawing } from '@the-inclusionist/engine/render/port.js';
import type { Role } from '@the-inclusionist/engine/core/contract.js';

import type { Peca } from '../animation.ts';
import { SIZE } from '../board.ts';
import { BOARD, BOARD_X, BOARD_Y, LOGICAL_H, LOGICAL_W, TILE, cellRect } from '../geometry.ts';
import { FUNDO_DA_TELA, HC_POR_PAPEL, MOLDURA, fundoDe } from './palette.ts';

export interface PinturaOpts {
  /** Each square's role, from the declaration. It is field 2 of the contract, and it rules high contrast. */
  readonly papel: (i: number) => Role;
  /** High contrast on? Then paint by ROLE and not by value. */
  readonly altoContraste: boolean;
  /**
   * THE TILES, already positioned — in logical pixels, not in square indices.
   *
   * ⚠️ THIS IS WHAT MAKES THE ANIMATION POSSIBLE, and it is why this argument exists. Mid-slide a tile is NOT
   * in a square: it is between two. While the painting read the board and drew by index, the most it could do
   * was teleport the tiles from one frame to the next.
   *
   * These positions are computed by `animation.ts`, which is pure; the clock is turned by `boot/main.ts`.
   */
  readonly pecas: readonly Peca[];
}

/**
 * Draws the background, the frame, the 16 empty squares and the tiles wherever they are RIGHT NOW.
 *
 * ⚠️ IT DRAWS NO NUMBER, on purpose, and that is the most important decision in this file. The digits are text
 * in the DOM (`ui/tiles-layer`) because pillar 2 requires it, and duplicating them here would create the worst
 * combination available: two places that have to agree, one of them invisible to the screen reader.
 *
 * The two layers move together by CONSTRUCTION, not by discipline: they receive the same coordinates, from the
 * same call to `pecasNoInstante(t)`, inside the same frame.
 */
export function pintarTabuleiro(g: Drawing, o: PinturaOpts): void {
  g.clear();

  g.beginFill(FUNDO_DA_TELA).drawRect(0, 0, LOGICAL_W, LOGICAL_H).endFill();
  g.beginFill(MOLDURA).drawRect(BOARD_X, BOARD_Y, BOARD, BOARD).endFill();

  // THE EMPTY SQUARES — the holes in the board. They depend on no tile: there are 16, always, and that is what
  // keeps the board looking like a board while the tiles fly over it.
  for (let i = 0; i < SIZE * SIZE; i++) {
    const r = cellRect(i);
    const cor = o.altoContraste ? (HC_POR_PAPEL[o.papel(i)] ?? HC_POR_PAPEL.free) : fundoDe(0);
    g.beginFill(cor).drawRect(r.x, r.y, r.w, r.h).endFill();
  }

  // THE TILES, on top and in the order received. The two halves of a merge arrive overlapping at the end of
  // the motion, and drawing both is right: it is what makes them MEET rather than one vanishing on the way.
  for (const p of o.pecas) {
    // ⚠️ THE ROLE IS ASKED FOR, not received — and the difference showed up in a red test. The tile used to
    // carry a `papel` field the caller had to fill in, and a caller who forgot silently got the colour by
    // VALUE instead of the colour by role: high contrast switched off with nobody asking. Since the tile
    // already knows the square it belongs to (`at`), the field was redundant — and a redundant field drifts.
    const cor = o.altoContraste
      ? (HC_POR_PAPEL[o.papel(p.at)] ?? HC_POR_PAPEL.free)
      : fundoDe(p.exponent);
    g.beginFill(cor).drawRect(p.x, p.y, TILE, TILE).endFill();
  }
}
