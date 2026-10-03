// SPDX-License-Identifier: AGPL-3.0-or-later
// THE KEY THE CHILD PRESSES, CHECKED WITHOUT A KEYBOARD.
//
// ========================= WHAT THIS FILE EXISTS TO STOP =========================
// Until engine 8.0.0 the sonar was `e.code === 'KeyS' && e.altKey`, written inline in the boot. Three things
// were wrong with that and none of them could fail a test:
//
//   · the engine did not know the binding existed, so it could not be remapped, could not be checked against
//     another binding, and moved silently on a layout that puts `S` elsewhere;
//   · it was a CHORD, and the README promised "in one keystroke";
//   · `boot/main.ts` only exists in a browser, so nothing could assert on it at all.
//
// Moving the mapping into `actions.ts` is what makes the assertions below possible, and the assertions are
// what keep the promise in the README from drifting away from the code.
//
// ========================= AND THE NAMING IS NOT DECORATION =========================
// ADR-0074 forbids an abstract name reaching a person, which is why `labellerFrom` returns `null` instead of
// `action1`. A position this game READS but does not NAME would show up in the remapping screen as a line
// with no text — to a child on a screen reader, a button that exists and has no name. The [Cross-check] below
// is that rule, asserted against the engine's own validator rather than restated here.
import { describe, expect, it } from 'vitest';
import { isAction, presetActions, presetProblems } from '@the-inclusionist/engine/core/actions.js';
import {
  ACAO_DE_LER, ACAO_DO_SONAR, ACAO_PARA_DIRECAO, ACOES_USADAS, acoesComRotulo, criarPreset, direcaoDe,
  ehLer, ehSonar,
} from '../app/js/actions.ts';
import pt from '../app/js/i18n/pt.ts';
import en from '../app/js/i18n/en.ts';
import es from '../app/js/i18n/es.ts';

/**
 * A `word` that echoes the key, so the test measures WHICH key the engine's `wordsOf` asked for — never a
 * translation. Returns `string | null`, which is the shape `wordsOf` wants (null is «unknown», dropped).
 *
 * ⚠️ RETURNS A STRING FOR EVERY KEY, including unknown ones. The preset we build only names positions this
 * game uses, so no «unknown» ever appears here — the null branch is proven by the dedicated test below.
 */
const word = (k: string): string | null => `word:${k}`;

describe('the positions this game reads', () => {
  it('[Interface] every one of them is an action the ENGINE knows', () => {
    // The guard against a typo becoming a key that nothing ever matches: `actionOf` would simply never return
    // it, and the control would be dead with no error anywhere.
    for (const a of ACOES_USADAS) expect(isAction(a), a).toBe(true);
  });

  it('[Right] the sonar is a DIAMOND position, not a direction', () => {
    // If it were a direction it would collide with playing: an arrow pushes the board, and the sonar has to
    // be askable without moving a tile.
    expect(ACAO_DO_SONAR).toBe('action1');
    expect(ACAO_PARA_DIRECAO[ACAO_DO_SONAR], 'the sonar must not also mean a push').toBeUndefined();
  });

  it('[Many] the four directions map to the four pushes, and to nothing else', () => {
    expect(ACAO_PARA_DIRECAO).toEqual({ left: 'left', right: 'right', up: 'up', down: 'down' });
  });

  it('[Zero] no position is read twice under two meanings', () => {
    expect(new Set(ACOES_USADAS).size, 'a repeated position would make one of the two unreachable')
      .toBe(ACOES_USADAS.length);
  });
});

describe('reading what `actionOf` gives back — a boundary, not a lookup', () => {
  it('[Right] a direction comes back as the push it means', () => {
    expect(direcaoDe('left')).toBe('left');
    expect(direcaoDe('down')).toBe('down');
  });

  it('[Zero] and the sonar is NOT a push, so nothing moves when it is asked', () => {
    expect(direcaoDe(ACAO_DO_SONAR), 'asking where a merge is must not play a move').toBeUndefined();
    expect(ehSonar(ACAO_DO_SONAR)).toBe(true);
  });

  it('[Boundary] a key bound to an action this game does not read falls out quietly', () => {
    // `action4` is a real engine position; this game simply does not use it. Quietly is right: the child
    // pressed a key that means nothing here, and the answer is nothing — not an error, not a move.
    expect(direcaoDe('action4')).toBeUndefined();
    expect(ehSonar('action4')).toBe(false);
  });

  it('[Exception] ⚠️ and so does a string that is not an action at all', () => {
    // `actionOf` is typed `string | null`, not `Action`, and the type is honest: what comes back may have
    // been through a child's stored remapping, which is data from outside this program. Without the
    // `isAction` guard this would be a table indexed by an unchecked string.
    expect(direcaoDe('lefft')).toBeUndefined();
    expect(direcaoDe('constructor'), 'a prototype key must not resolve to a move').toBeUndefined();
    expect(direcaoDe(null)).toBeUndefined();
    expect(direcaoDe(undefined)).toBeUndefined();
    expect(ehSonar(null)).toBe(false);
  });
});

// ========================= THE CHORD GUARD LEFT WITH THE KEYBOARD LISTENER =========================
// 🔴 A WHOLE DESCRIBE STOOD HERE — «the keystrokes that are NOT the game's» — around `ehAtalhoDoSistema`,
//    five assertions holding that `Ctrl`, `Alt` and `Cmd` hand the key back to the system while `Shift` stays
//    the game's as the reading mode's modifier. Every one of them was true, and the whole block lost its
//    subject on 2026-10-03: this game no longer listens to `keydown`.
//
//    📏 The defect it was born from is worth keeping in writing, because it is the kind that comes back:
//    measured in the browser on 2026-09-11, `Ctrl+S` played a move AND was swallowed, so the browser's Save
//    never opened — `KeyS` is `down` in the engine's solo scheme and the handler never asked about
//    modifiers. Assistive technology lives on modifier chords (NVDA on `Insert`/`CapsLock`, VoiceOver on
//    `Ctrl+Option`, the Windows Magnifier on `Win` + keys), so a game that `preventDefault()`s them takes
//    away the software the child uses to reach the game at all.
//
//    📌 THE QUESTION IS THE ENGINE'S NOW, and asking it twice is the defect ADR-0223 names. `input/key-default`
//    decides that a press belongs to something else and `controller.press()` answers `toPlay: false`, so it
//    reaches nobody. A gate here would be a second answer to a question this game no longer asks.

describe('the position that switches pushing for reading', () => {
  it('[Right] 🔴 it is a DIAMOND position, so it cannot collide with a push', () => {
    // The same argument as the sonar's, one position over. If reading were a direction it would have to be
    // one of the four that play, and the child would have no way to ask for it without moving a tile.
    expect(ACAO_DE_LER).toBe('action2');
    expect(ACAO_PARA_DIRECAO[ACAO_DE_LER], 'reading must not also mean a push').toBeUndefined();
    expect(ACAO_DE_LER, 'and it is not the sonar either').not.toBe(ACAO_DO_SONAR);
  });

  it('[Interface] 🔴 it is NAMED, which is what makes it reachable by anything but a keyboard', () => {
    // ⚠️ THIS IS THE WHOLE REASON IT EXISTS. It was `Shift` + arrow until 2026-10-03, and a `VirtualCommand`
    //    carries `{ action, pressed, source, player }` — no `shiftKey`, because the eyes, the face, the
    //    hands, the voice, the gamepad and the on-screen pad have no Shift to hold. An unnamed position
    //    would also appear on the remap screen as a blank row, which ADR-0074 refuses: to a child using a
    //    screen reader that is a button that exists and has no name.
    const p = criarPreset();
    expect(p[ACAO_DE_LER], 'a position this game reads must be named').toBeTruthy();
    expect(p[ACAO_DE_LER]?.labelKey).toBe('act.ler');
    expect(pt[p[ACAO_DE_LER]!.labelKey as keyof typeof pt], 'and the key resolves in pt-BR').toBeTruthy();
    expect(pt[p[ACAO_DE_LER]!.hintKey as keyof typeof pt], 'the hint too').toBeTruthy();
  });

  it('[Right] the guard answers for it, and for nothing near it', () => {
    expect(ehLer(ACAO_DE_LER)).toBe(true);
    expect(ehLer(ACAO_DO_SONAR), 'the sonar is not the reading mode').toBe(false);
    for (const d of ['up', 'down', 'left', 'right']) expect(ehLer(d), d).toBe(false);
    expect(ehLer(null)).toBe(false);
    expect(ehLer(undefined)).toBe(false);
    expect(ehLer('shiftKey'), 'what it replaced is not a position').toBe(false);
  });

  it('[Many] ⚠️ the three announcements it switches between exist in all three languages', () => {
    // A mode with no sentence is a mode a blind child cannot tell she is in. `motor.say` reads these.
    for (const k of ['a11y.reading.on', 'a11y.reading.off'] as const) {
      expect(pt[k as keyof typeof pt], `pt ${k}`).toBeTruthy();
      expect(en[k as keyof typeof en], `en ${k}`).toBeTruthy();
      expect(es[k as keyof typeof es], `es ${k}`).toBeTruthy();
    }
    expect(pt['a11y.reading.on'], 'on and off must not read the same').not.toBe(pt['a11y.reading.off']);
  });
});

describe('the rows the remapping panel shows', () => {
  it('[Many] one row per position this game reads, each with a word', () => {
    const linhas = acoesComRotulo(word);
    expect(linhas.map((l) => l.action).sort()).toEqual(ACOES_USADAS.slice().sort());
    for (const l of linhas) expect(l.label, l.action).toBeTruthy();
  });

  it('[Cross-check] ⚠️ the rows are the PRESET read back, not a second list', () => {
    // Two independently-built lists would drift, and the drift shows as a remapping screen naming an action
    // the game does not read — or reading one it does not name. `wordsOf` + `labellerFrom` are the engine's
    // own readers, so the pairing cannot come apart without this assertion noticing. The rows carry the
    // RESOLVED word; the preset carries the KEY — hence the double echo in the comparison.
    const preset = criarPreset();
    for (const l of acoesComRotulo(word)) {
      const chaveDoRotulo = preset[l.action]?.labelKey;
      expect(chaveDoRotulo).toBeTruthy();
      expect(l.label, l.action).toBe(`word:${chaveDoRotulo}`);
    }
  });

  it('[Zero] a position whose word is unknown is DROPPED, never filled in with its key', () => {
    // ADR-0074: `labellerFrom` returns null rather than `action1` so an abstract name cannot reach a person.
    // Here the word function says null for every key — simulating a dictionary that holds none of them —
    // and the result must be EMPTY, not a list of raw keys.
    const semPalavras = acoesComRotulo((_k) => null);
    expect(semPalavras).toEqual([]);
    // And a row the preset does NOT declare must not appear even when every known key resolves.
    //
    // ⚠️ THE LITERAL WAS `action2` UNTIL 2026-10-03, AND IT ROTTED INTO THE OPPOSITE OF A GATE. `action2`
    //    became this game's reading mode, so the assertion went from «an undeclared position stays out» to
    //    «a declared one stays out» — and it failed, which is the lucky outcome. Had the preset gained the
    //    position without this row being read, the gate would have gone on passing about nothing.
    //
    // 📌 THE CROSS-CHECK IS WHAT KEEPS THAT FROM BEING SILENT NEXT TIME: the literal is asserted to be
    //    absent from `ACOES_USADAS` FIRST. If somebody later gives this game an `action3`, the gate says so
    //    in a sentence instead of quietly measuring a position that is now declared.
    const naoUsada = 'action3';
    expect(ACOES_USADAS, `${naoUsada} must still be a position this game does not read`)
      .not.toContain(naoUsada);
    expect(acoesComRotulo(word).some((l) => l.action === naoUsada),
      'a position this game does not use').toBe(false);
  });

  it('[Interface] every word still comes from the dictionary', () => {
    for (const l of acoesComRotulo(word)) expect(l.label).toMatch(/^word:act\./);
  });
});

describe('the vocabulary shown to a child', () => {
  it('[Cross-check] the preset is well formed by the ENGINE’s own validator', () => {
    // `presetProblems` catches the silent one: an EMPTY key breaks nothing, warns nobody, and leaves the
    // remapping screen with a mute line.
    expect(presetProblems(criarPreset())).toEqual([]);
  });

  it('[Right] it names EXACTLY the positions the game reads — no more, no fewer', () => {
    // Fewer is a nameless button in front of a child (ADR-0074). More is a name invented for a control this
    // game does not have, which the contract says "ends up on a remapping screen in front of a child".
    expect(presetActions(criarPreset()).slice().sort()).toEqual(ACOES_USADAS.slice().sort());
  });

  it('[Interface] every entry is a KEY, since 11.0.0', () => {
    // The preset carries `labelKey`/`hintKey` — not the resolved word. The engine's root translates them at
    // every drawing, so a `setLocale` changes every surface at once.
    const p = criarPreset();
    expect(p.up?.labelKey).toBe('act.up');
    expect(p[ACAO_DO_SONAR]?.labelKey).toBe('act.sonar');
  });

  it('[Cross-check] 🔴 and every key it asks for exists in all THREE dictionaries (D6)', async () => {
    // The pairing that no type checks: `criarPreset` asks for keys, and those keys must be in EVERY
    // language the cartridge declares, or the engine's root will leave the position unnamed in whichever
    // locale is missing. The engine's rule (D3 note DN) is specific: «a declared key missing in every
    // language becomes a line of `problems`; a key present in some but not others leaves the surface
    // unnamed in the missing language». For the preset — which the remap screen and the sonar read every
    // frame — unnamed is worse than silent: it is a button a screen reader reads as nothing.
    //
    // 📌 WIDENED FROM PT-ONLY IN D6 OF PART FOUR. The pasted guide (the pattern game-platformer applies
    // to its `game-keys.ts`) names this cross-check as the one that catches a translation gap before CF
    // Pages ships it.
    const en = (await import('../app/js/i18n/en.ts')).default;
    const es = (await import('../app/js/i18n/es.ts')).default;
    const p = criarPreset();
    const chaves = [
      ...Object.values(p).map((e) => e?.labelKey),
      ...Object.values(p).map((e) => e?.hintKey),
    ].filter((s): s is string => typeof s === 'string');
    for (const k of chaves) {
      expect(Object.keys(pt), `pt: ${k}`).toContain(k);
      expect(Object.keys(en), `en: ${k}`).toContain(k);
      expect(Object.keys(es), `es: ${k}`).toContain(k);
    }
  });

  it('[One] the sonar carries a HINT key, because it is the one position nobody can guess', () => {
    // A push is self-evident from the arrow; "where is a merge" is not. The hint is the sentence the
    // remapping screen shows when the child asks what the button does.
    expect(criarPreset()[ACAO_DO_SONAR]?.hintKey).toBe('act.sonar.hint');
  });
});
