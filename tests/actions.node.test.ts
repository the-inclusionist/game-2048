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
  ACAO_DO_SONAR, ACAO_PARA_DIRECAO, ACOES_USADAS, acoesComRotulo, criarPreset, direcaoDe,
  ehAtalhoDoSistema, ehSonar,
} from '../app/js/actions.ts';
import pt from '../app/js/i18n/pt.ts';

/** A `t` that echoes the key, so the test measures WHICH key was asked for and never a translation. */
const t = (k: string) => `t:${k}`;

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

describe('the keystrokes that are NOT the game’s', () => {
  const mods = (m: Partial<Record<'ctrlKey' | 'altKey' | 'metaKey', boolean>> = {}) =>
    ({ ctrlKey: false, altKey: false, metaKey: false, ...m });

  it('[Zero] a bare key is the game’s', () => {
    expect(ehAtalhoDoSistema(mods())).toBe(false);
  });

  it('[Many] ⚠️ Ctrl, Alt and Cmd each hand the key back to the system', () => {
    // Measured in the browser on 2026-09-11: `Ctrl+S` played a move and was SWALLOWED, so the browser's Save
    // never opened. `KeyS` is `down` in the engine's solo scheme, and the handler never asked about modifiers.
    for (const k of ['ctrlKey', 'altKey', 'metaKey'] as const) {
      expect(ehAtalhoDoSistema(mods({ [k]: true })), k).toBe(true);
    }
  });

  it('[Exception] ⚠️ but SHIFT is the game’s, and that is the whole reading mode', () => {
    // Shift + arrow moves the READING cursor instead of pushing the board — the APG deviation declared in
    // `ui/board-dom.ts`. Treating Shift as a system chord would delete it, and a mutation that adds it here
    // has to fail loudly rather than quietly remove the way a blind child inspects the board.
    expect(ehAtalhoDoSistema({ ctrlKey: false, altKey: false, metaKey: false }), 'Shift is not even read here')
      .toBe(false);
  });

  it('[Boundary] a screen reader’s chord is left alone even on a key this game uses', () => {
    // The cost is not "one shortcut missed": assistive technology LIVES on modifier chords, and a game that
    // calls `preventDefault()` on them takes them from the software the child needs to reach the game at all.
    expect(ehAtalhoDoSistema(mods({ ctrlKey: true, altKey: true })), 'VoiceOver-style Ctrl+Option').toBe(true);
  });
});

describe('the rows the remapping panel shows', () => {
  it('[Many] one row per position this game reads, each with a word', () => {
    const linhas = acoesComRotulo(t);
    expect(linhas.map((l) => l.acao).sort()).toEqual(ACOES_USADAS.slice().sort());
    for (const l of linhas) expect(l.rotulo, l.acao).toBeTruthy();
  });

  it('[Cross-check] ⚠️ the rows are the PRESET read back, not a second list', () => {
    // Two independently-built lists would drift, and the drift shows as a remapping screen naming an action
    // the game does not read — or reading one it does not name. `labellerFrom` is the engine's own reader,
    // so the pairing cannot come apart without this assertion noticing.
    const preset = criarPreset(t);
    for (const l of acoesComRotulo(t)) {
      expect(l.rotulo, l.acao).toBe(preset[l.acao]?.label);
    }
  });

  it('[Zero] a position with no word is DROPPED, never filled in with its key', () => {
    // ADR-0074: `labellerFrom` returns null rather than `action1` so an abstract name cannot reach a person.
    // A row carrying the key instead would be exactly that, in the one screen built to be read aloud.
    const linhas = acoesComRotulo(t);
    for (const l of linhas) expect(l.rotulo).not.toMatch(/^action\d$/);
    expect(linhas.some((l) => l.acao === 'action2'), 'a position this game does not use').toBe(false);
  });

  it('[Interface] every word still comes from the dictionary', () => {
    for (const l of acoesComRotulo(t)) expect(l.rotulo).toMatch(/^t:act\./);
  });
});

describe('the vocabulary shown to a child', () => {
  it('[Cross-check] the preset is well formed by the ENGINE’s own validator', () => {
    // `presetProblems` catches the silent one: an EMPTY label breaks nothing, warns nobody, and leaves the
    // remapping screen with a mute line.
    expect(presetProblems(criarPreset(t))).toEqual([]);
  });

  it('[Right] it names EXACTLY the positions the game reads — no more, no fewer', () => {
    // Fewer is a nameless button in front of a child (ADR-0074). More is a name invented for a control this
    // game does not have, which the contract says "ends up on a remapping screen in front of a child".
    expect(presetActions(criarPreset(t)).slice().sort()).toEqual(ACOES_USADAS.slice().sort());
  });

  it('[Interface] every word comes from the DICTIONARY, so it is not Portuguese for everybody', () => {
    const p = criarPreset(t);
    expect(p.up?.label).toBe('t:act.up');
    expect(p[ACAO_DO_SONAR]?.label).toBe('t:act.sonar');
  });

  it('[Cross-check] and every key it asks for exists in the dictionary', () => {
    // The pairing that no type checks: `criarPreset` asks `t()` for a string, and `t()` answers the key back
    // when the key is missing. Without this, a renamed key would ship as raw `act.sonar` on screen.
    const pedidas = [
      ...Object.values(criarPreset((k) => k)).map((w) => w?.label),
      ...Object.values(criarPreset((k) => k)).map((w) => w?.hint),
    ].filter((s): s is string => typeof s === 'string');
    for (const k of pedidas) expect(Object.keys(pt), k).toContain(k);
  });

  it('[One] the sonar carries a HINT, because it is the one position nobody can guess', () => {
    // A push is self-evident from the arrow; "where is a merge" is not. The hint is the sentence the
    // remapping screen shows when the child asks what the button does.
    expect(criarPreset(t)[ACAO_DO_SONAR]?.hint).toBe('t:act.sonar.hint');
  });
});
