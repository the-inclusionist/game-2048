// SPDX-License-Identifier: AGPL-3.0-or-later
// THREE LANGUAGES ARE A FLOOR, AND THIS FILE IS WHAT STOPS THE FLOOR SINKING WITHOUT A SOUND.
//
// The `Dicionario` type already forces `en` and `es` to hold exactly `pt`'s keys — forgetting one is a compile
// error. So why a test? Because a type does not run: it disappears at build time, and three defects it does
// NOT catch are exactly the ones that produce a half-translated interface with nobody noticing —
//
//   · a translation left IDENTICAL to the Portuguese by oversight (the type is satisfied, the child reads pt);
//   · a key whose `{param}` was lost in translation (the sentence comes out with a hole where the number went);
//   · an EMPTY translation (the screen reader simply goes silent, which is accessibility's worst failure mode).
import { describe, expect, it } from 'vitest';
import en from '../app/js/i18n/en.ts';
import es from '../app/js/i18n/es.ts';
import pt, { type Chave } from '../app/js/i18n/pt.ts';

const IDIOMAS = { en, es } as const;
const chaves = Object.keys(pt) as Chave[];
/** A sentence's `{param}`s, as a set — order does not matter, presence does. */
const params = (s: string): Set<string> => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

describe('pillar 3’s three languages', () => {
  it('[Interface] en and es hold EXACTLY pt’s keys', () => {
    for (const [nome, dict] of Object.entries(IDIOMAS)) {
      expect(Object.keys(dict).sort(), nome).toEqual(chaves.slice().sort());
    }
  });

  it('[Zero] no translation is empty — an empty string makes the screen reader GO SILENT', () => {
    for (const [nome, dict] of Object.entries({ pt, ...IDIOMAS })) {
      const vazias = chaves.filter((k) => !dict[k].trim());
      expect(vazias, nome).toEqual([]);
    }
  });

  it('[Right] each key’s {param}s survive the translation', () => {
    for (const [nome, dict] of Object.entries(IDIOMAS)) {
      for (const k of chaves) {
        expect([...params(dict[k])].sort(), `${nome} → ${k}`).toEqual([...params(pt[k])].sort());
      }
    }
  });

  it('[Boundary] no en or es sentence came out IDENTICAL to the Portuguese', () => {
    // An identical pair is almost always an oversight. Where it is legitimate, the exception goes HERE, named
    // — and a list of exceptions that grows is the signal that translation has stopped happening.
    // ⚠️ TWO ENTRIES, BOTH SPANISH, BOTH REAL. "Alto contraste" and "Teclas" are the correct Spanish and
    //    happen to be spelled exactly as the Portuguese — the languages share the words. They are named here
    //    rather than worked around, which is the point of the list: an exception with a reason is a decision,
    //    an exception without one is an oversight that learned to pass.
    //
    // 📌 And the list is the METER the comment above describes. Two is fine. If it reaches a dozen, the
    //    signal is not that Spanish resembles Portuguese — it is that somebody stopped translating.
    // 🔴 THE LIST IS EMPTY SINCE 2026-10-03, and that is the meter reading the comment above asks for. Both
    //    entries were `tools.*` keys — the words on this game's own toolbar — and the toolbar is gone: E1
    //    deleted the typography, colour and keys buttons once it was measured that engine 11.0.0 mounts all
    //    three, and the ◐ contrast button followed when the engine's 🌗 axis turned out to be mounted by
    //    declaring `setPlayerTheme`. The exceptions went with their subject rather than outliving it.
    const LEGITIMAS: readonly Chave[] = [];
    for (const [nome, dict] of Object.entries(IDIOMAS)) {
      const iguais = chaves.filter((k) => dict[k] === pt[k] && !LEGITIMAS.includes(k));
      expect(iguais, nome).toEqual([]);
    }
  });

  it('[Cross-check] the two keys the DECLARATION asks for exist in all three', () => {
    // If these vanish, the engine narrates a raw key to a blind child. It is the coupling between
    // `declaration.ts` and the dictionary, and there is nowhere else it can be verified.
    for (const [nome, dict] of Object.entries({ pt, ...IDIOMAS })) {
      expect(dict['cell.empty'], nome).toBeTruthy();
      expect(dict['hud.nome.dobras'], nome).toBeTruthy();
    }
  });

  it('[Exception] the Spanish is NEUTRAL: no `vosotros`', () => {
    const vosotros = /\b(vosotros|vuestr\w+|áis|éis)\b/i;
    const tropeços = chaves.filter((k) => vosotros.test(es[k]));
    expect(tropeços, 'neutral Latin American Spanish').toEqual([]);
  });
});
