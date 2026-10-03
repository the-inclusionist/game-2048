// SPDX-License-Identifier: AGPL-3.0-or-later
// THE TILES THAT MOVE — in the DOM, with the numbers inside them.
//
// ========================= WHY THE TILE LEFT THE CELL =========================
// Before the animation, the number lived inside the `gridcell`: cell and tile were the same thing. A tile that
// slides cannot be that, because the CELL does not move — it is a square of the board, with a fixed position,
// focus and a label. What moves is the tile, and it crosses several squares on the way.
//
// So there are two layers, each with an owner:
//   · `ui/board-dom` — the 16 squares: `role="grid"`, focus, `aria-label`. They NEVER move.
//   · this file      — the tiles: the number and the position that changes. `aria-hidden="true"`.
//
// ⚠️ AND THE `aria-hidden` HIDES INFORMATION FROM NOBODY, which is the only way it can be legitimate. A
// square's accessible name already came from its `aria-label` — "Row 2, column 2: 4" — and an `aria-label` has
// always replaced the cell's content: no screen reader read the bare digit before, and none stops reading the
// number now. What changed is only WHO draws the glyph.
//
// ⚠️ AND THE NUMBER IS STILL REAL TEXT IN THE DOM, which is what pillar 2 requires. It is selectable, it grows
// with the engine's typography panel, and it is the same data the engine's Libras avatar player signs
// (`ui/libras-avatar-player` since 11.0.0, note DO). Painting it on the canvas so it could be animated would
// have been the easy way out and the wrong one.
import { SIZE } from '../board.ts';
import type { Peca } from '../animation.ts';
import { BOARD, BOARD_X, BOARD_Y, TILE, fontFor } from '../geometry.ts';
import { corDoPapel, fundoDe, inkFor, type Nivel } from '../render/palette.ts';

export interface CamadaDePecas {
  readonly raiz: HTMLElement;
  /**
   * Redraws the whole layer. Called on every animation frame and once at the end.
   *
   * The ROLE comes in as a FUNCTION rather than as a field on each tile, for the same reason as on the canvas:
   * the tile already knows the square it belongs to, and a field the caller has to remember to fill in is a
   * field they eventually forget — and the failure mode is high contrast switching itself off, silently.
   */
  desenhar(pecas: readonly Peca[], tema: Nivel | null, papel: (i: number) => string): void;
}

const px = (n: number) => `calc(${n} * var(--px))`;
const cor = (c: number) => '#' + c.toString(16).padStart(6, '0');

/**
 * The layer, with a POOL of reused elements.
 *
 * ⚠️ RECREATING THE NODES EVERY FRAME would be the obvious defect: a 110 ms animation is about seven passes,
 * and each one would throw away sixteen elements to create sixteen identical ones. Worse than the cost is the
 * effect on the browser: a new node has no previous state, so any CSS transition that came to exist would
 * never fire, and the text would flicker in readers that watch DOM mutations.
 *
 * The pool is born with room above 16 because a move with merges has MORE tiles in flight than there are
 * squares: the two halves of each merge travel together until they meet. The worst case is eight simultaneous
 * merges — the sixteen squares full of pairs — and that is sixteen tiles in flight. Sixteen is enough, and the
 * slack is for the day the board stops being 4×4.
 */
export function criarCamadaDePecas(doc: Document): CamadaDePecas {
  const raiz = doc.createElement('div');
  raiz.id = 'p2-tiles';
  raiz.className = 'p2-tiles';
  // The whole layer leaves the accessibility tree: what answers for it is `board-dom`'s grid.
  raiz.setAttribute('aria-hidden', 'true');

  // ⚠️ IT POSITIONS ITSELF over the board — and this was MISSING. Without these four lines the layer covered
  // the whole region, while the tiles' transforms are relative to the corner of the BOARD: the numbers showed
  // up 164 by 16 logical pixels off, floating to the left of the board, far from the tiles they name. Obvious
  // in a screenshot and invisible to every test I had.
  //
  // ⚠️ AND THE BROWSER TEST WAS HIDING THE DEFECT, because IT did this work: it positioned the layer by hand
  // before measuring. A test that does the part production code forgot measures nothing — it stayed green
  // while the screen was wrong, and that is the worst kind of green there is.
  raiz.style.left = px(BOARD_X);
  raiz.style.top = px(BOARD_Y);
  raiz.style.width = px(BOARD);
  raiz.style.height = px(BOARD);

  const pool: HTMLElement[] = [];
  const pegar = (n: number): HTMLElement => {
    while (pool.length < n) {
      const el = doc.createElement('div');
      el.className = 'p2-tile';
      el.style.width = px(TILE);
      el.style.height = px(TILE);
      raiz.appendChild(el);
      pool.push(el);
    }
    return pool[n - 1];
  };

  return {
    raiz,
    desenhar(pecas, tema, papel) {
      pecas.forEach((p, n) => {
        const el = pegar(n + 1);
        const texto = String(2 ** p.exponent);
        // `translate` and not `left`/`top`: the position changes every frame, and the transform is what the
        // browser can compose without redoing the whole page's layout sixteen times per frame.
        el.style.transform = `translate(${px(p.x - BOARD_X)}, ${px(p.y - BOARD_Y)})`;

        // ⚠️ NO BACKGROUND. The COLOURED tile is painted by the canvas underneath — that is what gives the
        // family's integer-scaled pixel-art look, and a `div` with rounded corners in its place would make
        // this read as a web page instead of a 320×180 game. What this element carries is ONLY THE NUMBER.
        //
        // The INK, however, is still computed from the colour below: `inkFor` answers which of the two gives
        // more contrast over the background the canvas will draw at that same position. Both layers read the
        // same palette, so the digit is never illegible over its own tile.
        const papelDaCasa = papel(p.at);
        const fundo = tema
          ? corDoPapel(papelDaCasa, tema)
          : fundoDe(p.exponent);
        el.style.color = cor(inkFor(fundo));

        el.dataset.role = papelDaCasa;
        if (el.textContent !== texto) el.textContent = texto;
        el.style.fontSize = px(fontFor(texto.length));
        el.hidden = false;
      });
      for (let n = pecas.length; n < pool.length; n++) pool[n].hidden = true;
    },
  };
}

/** How many tiles can be in flight at once — the worst case is a board full of pairs. */
export const MAX_PECAS_EM_VOO = SIZE * SIZE;
