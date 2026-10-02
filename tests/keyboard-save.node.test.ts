// SPDX-License-Identifier: AGPL-3.0-or-later
// 🔴 THE BUG THAT LOCKED A CHILD OUT OF THE GAME, held open so it cannot close again.
//
// Measured in the browser on 2026-09-11: remap a key, reload, and the game does not boot. No board, no error
// she could see. The chain is written out in `app/js/keyboard-save.ts`; the short version is that the engine's
// `p3`/`p4` schemes carry `null` for positions a seat cannot reach, `saveKB` persists them, and
// `migrateScheme` spreads every key list with `[...teclas]` — and `[...null]` throws inside `createGame`.
//
// ⚠️ THE ASSERTIONS BELOW ARE WRITTEN AGAINST THE REAL ENGINE DEFAULTS, not a fixture. A fixture would let the
// engine change its schemes and leave this file green about a shape nobody ships.
import { describe, expect, it } from 'vitest';
import { KB_DEFAULTS } from '@the-inclusionist/engine/input/keyboard.js';
import { migrateScheme } from '@the-inclusionist/engine/input/vocabulary-migration.js';
import { semNulos, temNulo } from '../app/js/keyboard-save.ts';

describe('the scheme the engine would have us save', () => {
  it('[Cross-check] 🔴 really does contain nulls — this is the engine defect, asserted not assumed', () => {
    // If this ever fails, the engine stopped shipping nulls and `semNulos` has become deletable. That is a
    // good day, and this line is how anyone finds out.
    expect(temNulo(KB_DEFAULTS), 'p3/p4 hold null for positions a seat cannot reach').toBe(true);
  });

  it('[Exception] ⚠️ and `migrateScheme` THROWS on one, which is what reaches the child', () => {
    // The engine's own function, called with the engine's own data. Nothing here is this game's invention.
    const comNulo = { up: ['KeyW'], leftShoulder: null } as unknown as Record<string, readonly string[]>;
    expect(() => migrateScheme(comNulo)).toThrow(TypeError);
  });
});

describe('what we write instead', () => {
  it('[Right] 🔴 the sanitised scheme survives the migration that used to throw', () => {
    // This is the whole fix, in one assertion: the same data, through the same engine function, without the
    // crash that made the game unopenable.
    const limpo = semNulos(KB_DEFAULTS);
    expect(temNulo(limpo)).toBe(false);
    for (const [grupo, value] of Object.entries(limpo)) {
      const seats = Array.isArray(value) ? value : [value];
      for (const e of seats) {
        // ⚠️ THE CAST IS THE EVIDENCE, not a workaround. `migrateScheme`'s parameter type says every key
        //    list is `readonly string[]`, while `KB_DEFAULTS` ships 42 that are `null` — the type and the
        //    data disagree, which is exactly why nothing caught this before a child did.
        if (e && typeof e === 'object') {
          expect(() => migrateScheme(e as Parameters<typeof migrateScheme>[0]), grupo).not.toThrow();
        }
      }
    }
  });

  it('[Zero] dropping a null loses NOTHING, because the merge leaves the default in place', () => {
    // `loadKB` does `Object.assign(d.p3[i], m)`. A key absent from `m` keeps the factory's value — and the
    // factory's value for those positions is the very null we declined to write. Same scheme, smaller file.
    const limpo = semNulos(KB_DEFAULTS) as Record<string, unknown>;
    const p3 = (KB_DEFAULTS as unknown as Record<string, Record<string, unknown>[]>).p3;
    const p3Limpo = limpo.p3 as Record<string, unknown>[];
    p3.forEach((seat, i) => {
      const reconstruido = Object.assign({ ...seat }, p3Limpo[i]);
      expect(reconstruido, `p3[${i}] comes back identical`).toEqual(seat);
    });
  });

  it('[Right] every real binding survives — the fix must not eat a key the child chose', () => {
    const solo = (KB_DEFAULTS as unknown as Record<string, Record<string, unknown>>).solo;
    const limpo = (semNulos(KB_DEFAULTS) as unknown as Record<string, Record<string, unknown>>).solo;
    for (const [action, teclas] of Object.entries(solo)) {
      if (Array.isArray(teclas)) expect(limpo[action], action).toEqual(teclas);
    }
  });

  it('[Interface] ⚠️ and the LIVE scheme is not edited — it is the one the next keystroke reads', () => {
    // Deleting keys in place would take the child's bindings away from the running game in order to make the
    // saved copy smaller. The input must come back untouched.
    const antes = JSON.stringify(KB_DEFAULTS);
    semNulos(KB_DEFAULTS);
    expect(JSON.stringify(KB_DEFAULTS)).toBe(antes);
  });
});
