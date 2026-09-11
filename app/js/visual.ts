// SPDX-License-Identifier: AGPL-3.0-or-later
// COLOUR-VISION CORRECTION, AS AN AXIS — the pure half of the control the child uses to see the board.
//
// ========================= WHY THIS STOPPED BEING A `<select>` =========================
// It was `<select id="viz">`, and the engine's own `ui/visual-axes-panel` records why that is the wrong
// shape, in the Dev's words: inside a closed box, a control whose reason to exist is to be FOUND by someone
// who sees poorly is "almost the same as not having moved it". The rows are now visible, and the markup that
// draws them is the engine's `linhasDoEixo` — so this game does not invent a second look for a control the
// rest of the catalogue already has.
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
// way to supply them. ✅ 9.0.0 added `setTemaDoJogador` and `setCorrecaoDoJogador` to the game's half. The
// door is open.
//
// THE HALF THAT DID NOT: `tema` offers `hc3`, `hc45` and `hc7` — three levels named after the contrast ratio
// they guarantee — and this game has ONE palette, repainted by the contract's ROLE (field 2), which is the
// quiz's finding 8. Mounting three rows that all did the same single thing would be three-quarters of a dead
// control — the defect ADR-0106 §5 names, and the one `seguraTeclas()` exists to avoid elsewhere. Having a
// door does not supply three answers to walk through it with.
//
// So the contrast axis stays the game's own binary button until this game has three palettes to answer it
// with. That is a colour-design decision with its own contrast gates, and it is not this module's to take.
import {
  CORRECOES, PADRAO, SIMULACOES, aplicacao, type Correcao, type VisualState,
} from '@the-inclusionist/engine/render/viz-axes.js';
import { VIZ_FILTER } from '@the-inclusionist/engine/render/viz-modes.js';

/** The four values of the correction axis, in the engine's order. `tricro` first, and it is a NAME. */
export const CORRECOES_OFERECIDAS: readonly Correcao[] = CORRECOES;

/**
 * The full visual state for a chosen correction.
 *
 * ⚠️ `simulacao` STAYS `null`, AND THAT IS A SAFETY PROPERTY RATHER THAN A DEFAULT. The simulations —
 * protanopia, blur, tunnel, blind — exist to show an ADULT what an impairment is like, and offering one to
 * the child who opened this menu to be able to play would hand her a mode that makes her vision worse. The
 * old `<select>` had to filter them out by hand with `simulatesDisability`; on this axis they cannot appear,
 * because they are a different field.
 */
export function estadoDa(correcao: Correcao): VisualState {
  return { ...PADRAO, correcao };
}

/**
 * The CSS `filter` this correction needs — `''` for none.
 *
 * The key comes from the engine (`aplicacao().filtro`) and the declaration of what that key MEANS comes from
 * the engine too (`VIZ_FILTER`). This game supplies neither; it only puts the result on the element it owns.
 */
export function filtroCssDe(correcao: Correcao): string {
  const chave = aplicacao(estadoDa(correcao)).filtro;
  return chave ? (VIZ_FILTER[chave] ?? '') : '';
}

/**
 * Is this a correction this game offers? A boundary guard, for the same reason `actions.ts` has one: the
 * value arrives from a `data-valor` attribute in the DOM, which is a string like any other.
 */
export function ehCorrecao(x: unknown): x is Correcao {
  return typeof x === 'string' && (CORRECOES as readonly string[]).includes(x);
}

/** Every simulation key, so a test can assert that none of them can reach the child through this control. */
export const SIMULACOES_CONHECIDAS: readonly (string | null)[] = SIMULACOES;
