// SPDX-License-Identifier: AGPL-3.0-or-later
// THE ACCESSIBLE GRID — and it is not a caption of the drawing: it IS the board.
//
// ========================= PILLAR 2 DECIDES THE ARCHITECTURE, NOT JUST THE FINISH =========================
// "Text always in the DOM". A digit painted on the canvas disappears for the screen reader and for the
// Libras avatar player (`ui/libras-avatar-player`, since engine 11.0.0 note DO), which signs TEXT. So there
// are THREE layers, each with an owner, and the division matters:
//
//   · this module — the 16 SQUARES: `role="grid"`, focus, `aria-label`. Fixed position, and this is the board
//     for whoever uses a screen reader;
//   · `ui/tiles-layer` — the TILES: the numbers, as real text, on the layer that moves;
//   · `render/board-canvas` — the PICTURE: frame, squares and coloured tiles, with `aria-hidden="true"`.
//
// ⚠️ THE NUMBER USED TO LIVE HERE AND MOVED OUT when the animation arrived (2026-09-05). The reason is that
// cell and tile stopped being the same thing: the square does not move, and the tile crosses several of them.
// Nothing that was ANNOUNCED changed — an `aria-label` has always replaced a cell's content, so no reader read
// the bare digit before and none stops reading the number now.
//
// A blind child and a sighted child play THE SAME game, not two versions of it.
//
// ========================= ⚠️ THE APG DEVIATION, DECLARED RATHER THAN BURIED =========================
// The APG's `grid` pattern says the ARROW KEYS navigate between cells. Here the arrows PLAY: pushing the board
// is this game's verb, and "left" is the move, not a reading step.
//
// This is a deviation, and it is deliberate. The alternative — arrows that only read — would leave the child
// who uses the keyboard exclusively unable to PLAY, which is precisely the person the pattern exists to serve;
// and moving the move to another key would throw away the muscle memory of a game the child probably knows.
//
// What is lost is replaced, not abandoned:
//   · **Shift + arrows** move the READING CURSOR cell by cell, and every stop is announced;
//   · Tab enters and leaves the grid normally — it is never hijacked, which would be the expensive deviation;
//   · after each move, a summary goes to the engine's `aria-live` region;
//   · and the engine's SONAR answers "where is a merge", which reading cell by cell would cost sixteen stops.
import type { GameDeclaration } from '@the-inclusionist/engine/core/contract.js';
import { SIZE } from '../board.ts';
import { BOARD, BOARD_X, BOARD_Y, TILE, cellRect } from '../geometry.ts';

/** What the grid needs to ask. The MINIMAL slice of the declaration — `core/contract`'s own rule. */
export type Falante = Pick<GameDeclaration, 'roleAt' | 'nameAt'>;

export interface GradeDom {
  /** The element carrying `role="grid"`. Whoever builds the page decides where it goes. */
  readonly raiz: HTMLElement;
  /**
   * Repaints the 16 squares' labels and roles.
   *
   * ⚠️ It does NOT receive the board, on purpose: everything it needs comes from the DECLARATION — `roleAt`
   * gives the role and `nameAt` gives the name. Holding the board here too would be a second source of the
   * same truth, and the second source is the one that drifts.
   */
  atualizar(falante: Falante, t: (k: string, p?: Record<string, string | number>) => string): void;
  /** Moves the reading cursor and returns the new index. Wraps at the edges, like the engine's letter grid. */
  mover(dx: number, dy: number): number;
  /** Where the cursor is. It is what field 4 of the declaration returns as `focusOf`. */
  cursor(): number;
  /** Puts the browser's focus on the cursor's cell — which is what makes the screen reader read. */
  focar(): void;
}

const px = (n: number) => `calc(${n} * var(--px))`;

/**
 * Builds the 16 cells once. After that, `atualizar` only swaps text and attributes.
 *
 * Rebuilding the grid on every move would be the classic defect: the focused element stops existing, focus
 * falls back to `<body>` and the screen reader loses its place — mid-round, on every key.
 */
export function criarGradeDom(doc: Document): GradeDom {
  const raiz = doc.createElement('div');
  raiz.id = 'p2-board';
  raiz.className = 'p2-board';
  raiz.setAttribute('role', 'grid');
  raiz.style.left = px(BOARD_X);
  raiz.style.top = px(BOARD_Y);
  raiz.style.width = px(BOARD);
  raiz.style.height = px(BOARD);

  // ⚠️ EVERY CELL IS POSITIONED BY `cellRect`, NOT BY FLEXBOX. Measured in the browser on 2026-09-05: with flex
  // rows and `margin: GAP/2`, the DOM cells sat 2 logical pixels to the left of the squares painted on the
  // canvas — 8 real px at k=4. Two rulers for one board, which is exactly what `app/js/geometry.ts` exists to
  // prevent; the flexbox was reimplementing the geometry instead of reading it.
  //
  // The defect is invisible to the eye at k=2 and invisible to every logic test.
  // `tests/board-alinhado.browser.test.ts` now compares the two directly.
  //
  // The rows are still REAL elements (`role="row"`), positioned in their band: `display: contents` would solve
  // the layout in one line and has been the reason a row vanished from the accessibility tree in browsers that
  // still circulate on school machines. A grid without rows cannot be navigated.
  const celulas: HTMLElement[] = [];
  for (let y = 0; y < SIZE; y++) {
    const faixa = cellRect(y * SIZE);
    const linha = doc.createElement('div');
    linha.setAttribute('role', 'row');
    linha.className = 'p2-row';
    linha.style.top = px(faixa.y - BOARD_Y);
    linha.style.height = px(TILE);
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const r = cellRect(i);
      const c = doc.createElement('div');
      c.setAttribute('role', 'gridcell');
      c.className = 'p2-cell';
      c.dataset.i = String(i);
      // ROVING tabindex: exactly one cell is reachable by Tab, and Shift+arrows moves which one.
      // Sixteen Tab stops inside a board would be hostile to anyone using only a keyboard.
      c.tabIndex = i === 0 ? 0 : -1;
      c.style.left = px(r.x - BOARD_X);
      c.style.width = px(r.w);
      c.style.height = px(r.h);
      linha.appendChild(c);
      celulas.push(c);
    }
    raiz.appendChild(linha);
  }

  let atual = 0;

  return {
    raiz,
    cursor: () => atual,

    atualizar(falante, t) {
      raiz.setAttribute('aria-label', t('a11y.board', { cols: SIZE, rows: SIZE }));
      celulas.forEach((c, i) => {
        const at = { x: i % SIZE, y: Math.floor(i / SIZE) };

        // ⚠️ THE CELL NO LONGER CARRIES THE NUMBER, and the change is architectural rather than stylistic. It
        // used to be the tile: it had the digit, the colour and the type size. A tile that SLIDES cannot be
        // that, because the square does not move — it has a fixed position, focus and a label, and the tile
        // crosses several of them on the way. The number moved to `ui/tiles-layer`, the layer that moves.
        //
        // What stayed here is what a SQUARE is: a place with a name, which can take focus and which the engine
        // can question. It is also what the screen reader always read — the `aria-label` already replaced the
        // content, so nothing that was announced stopped being announced.

        // THE ROLE comes from the declaration, not from a second copy of the rule in here. It is what makes
        // high contrast and the highlight agree with what the sonar points at.
        const papel = falante.roleAt(at);
        c.dataset.role = papel;

        // THE LABEL IS THE WHOLE CELL, and not just the number: whoever is listening needs where, what, and
        // whether it can merge. `nameAt` answers the "what" — including the translated word for an empty
        // square.
        const nome = falante.nameAt(at)?.text ?? '';
        const params = { row: at.y + 1, col: at.x + 1, what: nome };
        c.setAttribute('aria-label', t(papel === 'goal' ? 'a11y.cellMergeable' : 'a11y.cell', params));
      });
    },

    mover(dx, dy) {
      const x = (((atual % SIZE) + dx) % SIZE + SIZE) % SIZE;
      const y = ((Math.floor(atual / SIZE) + dy) % SIZE + SIZE) % SIZE;
      celulas[atual].tabIndex = -1;
      atual = y * SIZE + x;
      celulas[atual].tabIndex = 0;
      return atual;
    },

    focar() {
      celulas[atual].focus();
    },
  };
}
