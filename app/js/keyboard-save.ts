// SPDX-License-Identifier: AGPL-3.0-or-later
// WHAT GETS WRITTEN TO DISK WHEN A CHILD REMAPS A KEY — and why it is not simply what the engine hands us.
//
// ========================= 🔴 THE DEFECT THIS EXISTS TO SURVIVE =========================
// MEASURED IN THE BROWSER ON 2026-09-11, and it is as bad as it sounds: **a child who remapped a key could
// not open the game again.** Blank page, no board, no error she could see.
//
// The chain, each link verified:
//
//   1. The engine's multi-player schemes legitimately carry `null` for a position a seat cannot reach —
//      `p3` and `p4` hold 42 of them, and `null` rather than `{}` is a deliberate choice (issue #118: "a
//      scheme that reaches nothing says so with fourteen declared absences").
//   2. `saveKB(kb)` persists the WHOLE `KBDefaults`, nulls included. That is what the remap panel calls.
//   3. On the next boot `loadKB()` → `migrarSalvo()` → `migrarEsquema()`, whose line 102 is
//      `saida[nova] = saida[nova] ? [...new Set([...saida[nova], ...teclas])] : [...teclas]`.
//      `esquema` is guarded on the line above; the individual key lists are not.
//   4. `[...null]` throws `TypeError: teclas is not iterable`, inside `createGame`, before anything renders.
//
// ⚠️ IT IS AN ENGINE DEFECT AND IT IS REPORTED AS ONE. This module is not a disagreement with the engine —
// it is the narrowest thing that keeps a child out of that hole while the engine is fixed, and it is written
// to become deletable: when `migrarEsquema` guards its key lists, `semNulos` stops being load-bearing and the
// test below will still pass, which is how anyone will know it is safe to remove.
//
// ========================= WHY DROPPING THEM IS LOSSLESS =========================
// `loadKB` merges the saved scheme over the factory with `Object.assign(d.p3[i], m)`. A key ABSENT from `m`
// leaves the factory's value in place — and the factory's value for those positions is the very `null` we are
// declining to write. So the scheme that comes back is identical, and the one that goes to disk is smaller.

/** One seat's map: a position to the keys that reach it, or `null` where the seat cannot reach it at all. */
type Esquema = Record<string, readonly string[] | null>;

/** What the engine keeps: the solo scheme plus one list per player count. */
export interface EsquemaGuardado {
  readonly [grupo: string]: Esquema | readonly (Esquema | null)[] | undefined;
}

/** A seat's map with every non-list entry removed. Returns a new object; the input is not touched. */
function seatSemNulos(e: Esquema): Esquema {
  return Object.fromEntries(Object.entries(e).filter(([, teclas]) => Array.isArray(teclas)));
}

/**
 * The scheme as it should reach storage: every position that names no key is left out rather than written
 * as `null`.
 *
 * 📌 IT COPIES RATHER THAN EDITS, and that is not politeness: the object handed in is the engine's LIVE `kb`,
 * the same one `kbFor()` reads on the next keystroke. Deleting keys from it in place would take the child's
 * bindings away from the running game to make the saved copy smaller.
 */
export function semNulos<T extends EsquemaGuardado>(kb: T): T {
  const saida: Record<string, unknown> = {};
  for (const [grupo, value] of Object.entries(kb)) {
    if (Array.isArray(value)) {
      saida[grupo] = value.map((e) => (e ? seatSemNulos(e as Esquema) : e));
    } else if (value && typeof value === 'object') {
      saida[grupo] = seatSemNulos(value as Esquema);
    } else {
      saida[grupo] = value;
    }
  }
  return saida as T;
}

/** Would this scheme survive `migrarEsquema`? Used by the gate, and by nobody else. */
export function temNulo(kb: EsquemaGuardado): boolean {
  for (const value of Object.values(kb)) {
    const seats = Array.isArray(value) ? value : [value];
    for (const e of seats) {
      if (!e || typeof e !== 'object') continue;
      for (const teclas of Object.values(e as Esquema)) if (!Array.isArray(teclas)) return true;
    }
  }
  return false;
}
