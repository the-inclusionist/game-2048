// SPDX-License-Identifier: AGPL-3.0-or-later
// COLOUR-VISION CORRECTION, AS AN AXIS — the pure half of the control the child uses to see the board.
//
// ========================= WHY THIS STOPPED BEING A `<select>` =========================
// It was `<select id="viz">`, and the engine's own `ui/visual-axes-panel` records why that is the wrong
// shape, in the Dev's words: inside a closed box, a control whose reason to exist is to be FOUND by someone
// who sees poorly is "almost the same as not having moved it". The rows are visible rows now, and the markup
// that draws them is the engine's `axisRows` — so this game does not invent a second look for a control
// the rest of the catalogue already has.
//
// ⚠️ AND ON 2026-09-12 THEY MOVED AGAIN, FROM THE PAGE INTO A PANEL. The sentence above is about the SHAPE of
// the control and is unchanged; what changed is where the shape hangs. As an always-open section it was the
// only flexible sibling's worth of height taken from `<main>`'s flex column, and the board — the one thing
// the control exists to make visible — was clipped by up to 119 px on a school tablet, with no scrollbar to
// reach it. The rows now open from `🚥 Correção de cor`, a labelled button in the same row as «Alto
// contraste», which is what keeps the engine's objection answered: the objection was to a `<select>`, and a
// named button one press away is not one. Measured by `scripts/layout-check.mjs` on four real screens.
//
// ========================= AND WHY ONLY ONE OF THE TWO AXES =========================
// Engine 8.0.0 splits the visual state in two: `tema` (contrast) and `correcao` (colour). The panel renders
// both, and this game mounts only the second.
//
// ⚠️ THE REASON IS MEASURED, NOT TASTE — AND HALF OF IT EXPIRED IN ENGINE 9.0.0, so both halves are kept
// apart here on purpose.
//
// THE HALF THAT EXPIRED: against 8.0.0 the writers lived only in `render/viz-setters`, whose context asks
// for ~34 fields of a PixiJS platformer render graph this game does not have, and `createGame` offered no
// way to supply them. ✅ 9.0.0 added them to the game's half — renamed in 10.0.0 to the current
// `setPlayerTheme` and `setPlayerCorrection` (note CN). The door is open.
//
// THE HALF THAT DID NOT, and it stopped being a matter of effort: `tema` offers `hc3`, `hc45` and `hc7` —
// three levels named after the contrast RATIO they guarantee — and this game answers with ROLE colours, of
// which it has three: goal, structure, free.
//
// 🔴 `hc7` IS NOT HARD, IT IS IMPOSSIBLE. Contrast is multiplicative across a middle value: for
// luminances A > B > C, c(A,C) = c(A,B) · c(B,C). Demanding 7:1 on both neighbouring pairs demands **49:1**
// end to end, and the WCAG scale stops at **21:1** (pure black against pure white). No palette anyone
// designs later can satisfy it with three roles. `hc45` survives only as a hairline — 20.25 against 21 —
// pinning the middle role into a luminance band about 0.008 wide.
//
// Mounting the axis would therefore offer a child one row that works, one that is a coincidence, and one
// that cannot exist. That is the dead control of ADR-0106 §5 dressed as a colour choice. The arithmetic is
// a gate in `tests/visual.node.test.ts`, so this paragraph cannot quietly stop being true.
//
// So the contrast axis stays the game's own binary button. Not "until we build three palettes" — two of the
// three levels have no honest answer at any effort.
//
// ========================= AND THE COLOUR-VISION ICON HAS THE OPPOSITE PROBLEM =========================
// ⚠️ MEASURED AGAINST ENGINE 9.0.0, RE-MEASURED ON 11.0.0 (H11, 2026-10-02): the 🚥 icon can be WRITTEN to —
// `setPlayerCorrection` exists (renamed from `setCorrecaoDoJogador` in 10.0.0, note CN) — but it still
// cannot be READ. `ui/pause-icons` takes the current value from `(P()[i] || {}).visual`, and the only door
// a `createGame` consumer has for players is typed `Pick<ControlledPlayer,'ctrl'>`, which its own comment
// describes as «esquema de teclas e nada mais». The read-back that would recover it from storage,
// `lerVisualGuardado`, lives in `render/viz-setters` — the PixiJS-shaped module `createGame` never mounts.
//
// So a mounted 🚥 would read `DEFAULT_VISUAL` on every click and cycle from the first value for ever: it would
// LOOK like it worked once and then stick. 9.0.0 opened the write door and not the read door, which is why
// the four visible rows below remain this game's own control.
import {
  CORRECTIONS, DEFAULT_VISUAL, SIMULATIONS, howItApplies, type Correction, type VisualState,
} from '@the-inclusionist/engine/render/viz-axes.js';
import { VIZ_FILTER } from '@the-inclusionist/engine/render/viz-modes.js';

/** The four values of the correction axis, in the engine's order. `tricro` first, and it is a NAME. */
export const CORRECOES_OFERECIDAS: readonly Correction[] = CORRECTIONS;

/**
 * The full visual state for a chosen correction.
 *
 * ⚠️ `simulacao` STAYS `null`, AND THAT IS A SAFETY PROPERTY RATHER THAN A DEFAULT. The simulations —
 * protanopia, blur, tunnel, blind — exist to show an ADULT what an impairment is like, and offering one to
 * the child who opened this menu to be able to play would hand her a mode that makes her vision worse. The
 * old `<select>` had to filter them out by hand with `simulatesDisability`; on this axis they cannot appear,
 * because they are a different field.
 */
export function estadoDa(correcao: Correction): VisualState {
  return { ...DEFAULT_VISUAL, correcao };
}

/**
 * The CSS `filter` this correction needs — `''` for none.
 *
 * The key comes from the engine (`howItApplies().filter`) and the declaration of what that key MEANS comes from
 * the engine too (`VIZ_FILTER`). This game supplies neither; it only puts the result on the element it owns.
 */
export function filtroCssDe(correcao: Correction): string {
  const chave = howItApplies(estadoDa(correcao)).filter;
  return chave ? (VIZ_FILTER[chave] ?? '') : '';
}

/**
 * Is this a correction this game offers? A boundary guard, for the same reason `actions.ts` has one: the
 * value arrives from a `data-valor` attribute in the DOM, which is a string like any other.
 */
export function ehCorrecao(x: unknown): x is Correction {
  return typeof x === 'string' && (CORRECTIONS as readonly string[]).includes(x);
}

/** Every simulation key, so a test can assert that none of them can reach the child through this control. */
export const SIMULACOES_CONHECIDAS: readonly (string | null)[] = SIMULATIONS;
