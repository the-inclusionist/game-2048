// SPDX-License-Identifier: AGPL-3.0-or-later
// THE SEVEN FIELDS — the only thing the engine's accessibility stack knows about this game.
//
// ========================= WHAT THIS FILE BUYS =========================
// By answering these seven questions, the game gets a screen reader, sonar navigation, high contrast by role,
// scanning and Libras without writing a line of any of them. That is ADR-0027's product, and it is the reason
// an engine exists here instead of "one more 2D engine".
//
// ========================= AND WHAT IT PAYS BACK =========================
// ADR-0030 says "the contract is enough" stops being a hypothesis only when TWO presets exist. There was one —
// the `consumer-quiz`, topology `hotspots`, a list with no space at all. This is the second, and it is `grid`.
//
// The difference is field 5. In the quiz, the consumer itself recorded that its sonar came out "correct and
// useless": in a linear questionnaire the only target is the question the child is already on, and pointing at
// the right answer would be cheating. On a grid there is distance, neighbourhood and direction — so
// `targetsOf` starts answering WHERE A MERGE IS AVAILABLE, which for someone who cannot see the screen is the
// whole mechanic of the game and not an ornament.
//
// ========================= NO STATE OF ITS OWN, ON PURPOSE =========================
// This module keeps neither board nor cursor: it OBSERVES. The fields are functions because the answer changes
// with every move, and the owner of the state is whoever plays. Keeping a copy here would create the second
// version of the truth that drifts on the first `undo`.
import type {
  Focus, GameDeclaration, Heading, Objective, Role, Speakable, Spot, Topology, WorldScope,
} from '@the-inclusionist/engine/core/contract.js';
import { OBJETIVO, SIZE, maxTile, mergeSpots, type Board } from './board.ts';

/** What the declaration needs to ASK the game. Nothing beyond this, and nothing that writes. */
export interface Observado {
  board(): Board;
  /** Where the keyboard cursor is — field 4 answers "where the child is" with this. */
  cursor(): Spot;
  /** The last direction played. `'none'` before the first move, which is the truth and not a filler value. */
  heading(): Heading;
  /** The engine's `t()`, INJECTED: a test passes a `t` that returns the key and measures which was asked for. */
  t(key: string): string;
}

const dentro = (at: Spot): boolean => at.x >= 0 && at.x < SIZE && at.y >= 0 && at.y < SIZE;
const indice = (at: Spot): number => at.y * SIZE + at.x;
const casa = (i: number): Spot => ({ x: i % SIZE, y: Math.floor(i / SIZE) });

export function criarDeclaracao(o: Observado): GameDeclaration {
  return {
    // 1 · TOPOLOGY. With a metric, and it is the metric that makes the sonar possible: on a grid the distance
    //     is in SQUARES, so "two squares to the left" is sayable without mentioning a pixel.
    //
    //     ⚠️ IT IS A FUNCTION, and it became one in the published engine. This game always returns the same
    //     grid, so the shape looks like ceremony — it is not: `game-15puzzle` has a 3×3, 4×4 or 5×5 board in
    //     the same session, and with a constant field it only fitted the type through a GETTER, which the
    //     engine's contract calls "a TypeScript coincidence, not a contract". The sonar's port always asked
    //     for `() => Topology`.
    topology(): Topology {
      return {
        kind: 'grid',
        size: [SIZE, SIZE],
        // ⚠️ ORTHOGONAL, and the choice changes what the sonar SAYS. In 2048 a tile travels in a straight line
        //    and never diagonally, so the diagonal square is TWO steps away and not one. The engine uses this
        //    as the metric (L¹ for orthogonal, L∞ for diagonal), and declaring `diagonal` here would have the
        //    sonar call "very close" a place the tile cannot reach. The game's movement rule IS the ruler the
        //    narration measures with.
        move: 'orthogonal',
        // Compass, not clock: this is a board seen from above, where row and column are north and east. The
        // clock is the PLATFORMER's frame of reference, seen from the side, where "north" means nothing.
        frame: 'compass',
      };
    },

    // 1b · WHICH ELEMENT IS THE WORLD — a new field in the published engine, and required on purpose.
    //
    //      It is where the engine applies what belongs to the WORLD and only there: colour-vision correction,
    //      high contrast, empathy simulations. Here it is `#game-region` — the same element `ui/layout` locks
    //      to 320×180, and the same one this game already applied the vision filter to by hand, in
    //      `boot/boot.ts`.
    //
    //      ⚠️ AND IT IS NOT `none`. The contract warns that `none` must not be what happens when somebody
    //      forgets: it is for an activity WITHOUT space — a painting canvas, a form — where there is no target
    //      for the sonar to point at. A 4×4 board has space, distance and neighbourhood; declaring `none` here
    //      would switch off the sonar and empathy in a game where they are the mechanic.
    world(): WorldScope {
      return { kind: 'element', selector: '#game-region' };
    },

    // 1c · HOW MANY POSITIONS ARE HELD AT ONCE — required by the contract since engine 8.0.0 (ADR-0104 §A).
    //
    //      ONE. A move in 2048 is a single press that resolves completely before the next one is read: there
    //      is no "run while walking", no charge-and-release, nothing to hold down. A child playing on a phone
    //      that registers one finger at a time can play this game in full.
    //
    //      ⚠️ AND ONE IS NOT THE SAFE ANSWER TO GIVE WHEN UNSURE, which is why the contract refuses to have a
    //      default. The engine's note records the blind spot it was built to close: the platformer declared
    //      nine ACTIONS and had nine places on the on-screen pad, so the reach check passed — but running,
    //      walking and jumping together are three fingers, and on a two-touch tablet the child simply cannot,
    //      with nothing anywhere saying why. Reaching an action and holding it alongside another are different
    //      questions. Here the answer is one because the game genuinely asks for one, and the ceiling is the
    //      assertion `tests/declaration.node.test.ts` protects.
    //
    //      A FUNCTION and not a value, for the same reason as `topology`: a game whose phases differ can ask
    //      for more in one than in another. This one cannot, and answering through a function costs nothing.
    holdsAtOnce(): number {
      return 1;
    },

    // 1d · DOES THIS GAME HOLD A KEY DOWN? — required since engine 8.0.0 (ADR-0115).
    //
    //      NO. A move is one press that resolves completely; there is nothing to hold, nothing to charge, no
    //      direction to keep pushing. And `holdsAtOnce` above does NOT answer this, which is the finding that
    //      forced a second field: it counts SIMULTANEOUS positions and refuses zero, so "one at a time" and
    //      "one held" come out as the same number while meaning different things.
    //
    //      ⚠️ ANSWERING `false` REMOVES A CONTROL rather than hiding one, and that is the point. The latch
    //      (☝️) exists for a child who cannot KEEP a key pressed: she presses once to start and once to stop.
    //      In a game where nothing is held there is nothing to latch — so the engine leaves the icon out of
    //      the accessibility bar entirely, instead of offering her a switch that does nothing. That dead
    //      button is what ADR-0106 §5 forbids, and it is worse than a missing one: she turns on the very
    //      adjustment she depends on and learns that it is broken.
    seguraTeclas(): boolean {
      return false;
    },

    // 6 · WHOSE TURN IT IS. The player's — and this is not a detail: with the player's turn, time does not
    //     press, scanning can wait, and WCAG 2.2.1 (Timing Adjustable) is satisfied BY CONSTRUCTION rather
    //     than by an option somebody has to find in a menu.
    tick: 'player',

    // 2 · SEMANTIC ROLE, and this is where high contrast takes its colours from instead of a tile table.
    //
    //     ⚠️ `goal` is the tile that CAN MERGE NOW, not the highest-valued one. That is the field read
    //     correctly — "what the round asks" — and it is what makes the high-contrast highlight point at the
    //     available move for a child with low vision, rather than decorating the board by size.
    roleAt(at: Spot): Role {
      if (!dentro(at)) return 'free';
      const b = o.board();
      const i = indice(at);
      if (b[i] === 0) return 'free';
      return mergeSpots(b).includes(i) ? 'goal' : 'structure';
    },

    // 3 · SPEAKABLE NAME — the same data the screen reader says and Libras translates.
    //
    //     ⚠️ THE NUMBER DOES NOT GO THROUGH THE DICTIONARY, and the word does. `8` is `8` in any language:
    //     mathematics is not a language subject, and sending a numeral to `t()` would only create 2048 keys to
    //     translate a digit. "Empty" is a word, so it is a key. The rule is the one pillar 3 uses: the frame
    //     lives in the key, the content passes through.
    nameAt(at: Spot): Speakable | null {
      if (!dentro(at)) return null;
      const e = o.board()[indice(at)];
      if (e === 0) return { text: o.t('cell.empty'), gender: 'n', plural: false };
      return { text: String(2 ** e), gender: 'm', plural: false };
    },

    // 4 · FOCUS. No body and no physics: what holds the focus is the keyboard cursor, and "where it points" is
    //     the last direction pushed — which is what the cane and the scanning need to know.
    focusOf(): Focus | null {
      return { id: 'p0', at: o.cursor(), heading: o.heading() };
    },

    // 5a · THE OBJECTIVE, IN DOUBLINGS — and this is the decision in this file I am proudest of.
    //
    //      The engine's HUD frame is `'{have} de {need} {nome}'`. With VALUES it would read "16 of 2048": true,
    //      and teaching nothing. With EXPONENTS it reads **"4 of 11 doublings"**, and 11 is exactly what 2048
    //      IS — eleven doublings. The counter starts stating the subject instead of marking points, and it
    //      cost neither a new field in the engine nor a line of conditional: it is the same `have`/`need` that
    //      used to count coins.
    objectiveOf(): Objective {
      return {
        name: { text: o.t('hud.nome.dobras'), gender: 'f', plural: true },
        have: maxTile(o.board()),
        need: OBJETIVO,
      };
    },

    // 5b · WHERE THE TARGETS ARE. The half the sonar uses, and the one the quiz had no way to exercise.
    //
    //      Empty when no merge is available, and empty is an ANSWER: it means "there is nowhere to point",
    //      which at the end of a round is the most honest information there is.
    targetsOf(): readonly Spot[] {
      return mergeSpots(o.board()).map(casa);
    },
  };
}
