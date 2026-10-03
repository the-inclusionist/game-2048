// SPDX-License-Identifier: AGPL-3.0-or-later
// WHAT EACH ENGINE POSITION MEANS IN THIS GAME — the whole mapping, in one pure module.
//
// ========================= WHY A MODULE INSTEAD OF TWO LINES IN THE BOOT =========================
// It used to be two lines in `boot/main.ts`: a record from action to direction, and a hard-coded `Alt+S` for
// the sonar. Neither could be tested, because `boot/main.ts` only exists in a browser — and the sonar's half
// was not even expressed in the engine's vocabulary, which is the defect this module removes.
//
// ========================= THE POSITIONS ARE THE ENGINE'S; THE WORDS ARE OURS =========================
// `core/actions` numbers the four diamond positions on purpose, and says why: "four positions in a cross have
// no names that cross genres — what a platformer calls jump, a quiz calls confirm". So the engine owns WHERE
// the button is and this file owns WHAT IT MEANS HERE.
//
// ⚠️ AND A GAME THAT USES A POSITION WITHOUT NAMING IT IS A DEFECT, not an omission. ADR-0074 forbids an
// abstract name reaching a person, and `labellerFrom` returns `null` rather than `action1` precisely so that
// nobody can accidentally show it. A position we read but do not name would appear in the remapping screen as
// a blank line — which, to a child using a screen reader, is a button that exists and has no name.
import {
  isAction, labellerFrom, presetActions, wordsOf, type Action, type ActionPreset,
} from '@the-inclusionist/engine/core/actions.js';
import type { Direction } from './board.ts';

/**
 * The diamond position that asks "where is a merge available?".
 *
 * ⚠️ IT REPLACED A HARD-CODED `Alt+S`, and the difference is not ergonomics. A raw `e.code === 'KeyS' &&
 * e.altKey` is invisible to the engine: it is not in the remapping table, it cannot be rebound, it is not
 * checked against any other binding, and a keyboard layout that puts `S` elsewhere moves it silently. Read as
 * an ACTION, it travels through `actionOf` like every other key this game reads, and whatever remapping the
 * child has stored applies to it.
 *
 * 📌 THE FACTORY DEFAULT IS KEPT — `action1` is `KeyU`, and this game does not declare
 * `mapeamentoDoTeclado` to move it. A mnemonic `S` was tempting ("sonar" in all three languages), and the
 * contract would allow it, but the diamond's whole point is that the same PHYSICAL position means whatever
 * the game at hand says it means. A child who learns the position in one game keeps it in the next; a
 * per-game mnemonic trades that for a letter she still has to be told.
 */
export const ACAO_DO_SONAR: Action = 'action1';

// ========================= 🔴 A READING MODE STOOD HERE FOR ONE DAY, AND IT TOOK THE GAME AWAY =========================
// `ACAO_DE_LER = 'action2'` toggled the four directions between pushing the board and walking a cursor over it. I added it
// in E8 as the engine-native replacement for `Shift` + arrow, and the reasoning was sound as far as it went: a
// `VirtualCommand` carries no modifiers, so the chord only ever worked for a child with a keyboard.
//
// 📏 WHAT IT COST, reproduced on the built page: ONE press of `action2` — a labelled button on the engine's on-screen pad
// («2, Ler o tabuleiro»), a key, a stop of the one-button scan, a spoken command — and every direction from every
// transport stopped playing. All four moved a selector and none moved a tile, with no way back a child would find.
//
// The Dev: «ao usar o direcional eu uso um seletor para "andar" pelo tabuleiro, num jogo onde isso não faz o menor
// sentido! Os direcionais no 2048 são para fazer as peças deslizarem pelo tabuleiro na direção especificada, não?»
//
// 📌 THE LESSON IS NOT «THE CHORD WAS BETTER». It is that in this game the directional has ONE meaning, and any mode that
// borrows it is a mode that can strand the child mid-round. Reading the board is already answered by things that take no
// direction: the grid is real DOM with a label on every cell, which a screen reader walks on its own, and the sonar
// (`ACAO_DO_SONAR`) says where a merge is without moving anything.


/**
 * The four directions, and in this game they PUSH THE BOARD. Always — there is no mode in which they do
 * anything else. Pushing IS the verb of a 2048, so a direction that navigated instead would leave a child who
 * plays by positions unable to play at all.
 */
export const ACAO_PARA_DIRECAO: Readonly<Partial<Record<Action, Direction>>> = {
  left: 'left', right: 'right', up: 'up', down: 'down',
};

/** Every engine position this game actually reads. The preset must name all of them, and nothing else. */
export const ACOES_USADAS: readonly Action[] = ['up', 'down', 'left', 'right', ACAO_DO_SONAR];

/**
 * The push this key means, or `undefined` — and the guard is the point.
 *
 * ⚠️ `actionOf` RETURNS `string | null`, NOT `Action`, and that is honest rather than sloppy: what comes back
 * can have been through a child's stored remapping, which is data from outside this program. `isAction` is the
 * engine's own boundary guard for exactly that ("guard for data that came from outside — a saved map, a
 * remapping"), so a key bound to something this game does not read falls out here instead of indexing a table
 * with a string nobody checked.
 */
export function direcaoDe(action: string | null | undefined): Direction | undefined {
  return action && isAction(action) ? ACAO_PARA_DIRECAO[action] : undefined;
}

/** Is this the sonar's position? Same boundary, same reason — one place that knows the answer. */
export function ehSonar(action: string | null | undefined): boolean {
  return action === ACAO_DO_SONAR;
}

// ========================= `ehAtalhoDoSistema` LEFT ON 2026-10-03, AND SO DID ITS SUBJECT =========================
// It answered «does this keystroke belong to the SYSTEM rather than to the game?» — `e.ctrlKey || e.altKey ||
// e.metaKey` — and it existed because this game listened to `keydown` itself. 📏 Measured on 2026-09-11 in the
// browser: `Ctrl+S` played a move AND was swallowed, so the browser's Save never opened, because `KeyS` is
// `down` in the engine's solo scheme and the handler read the action without asking whether a modifier was
// held. The person it cost most was the one this game is for: screen readers and magnifiers live on modifier
// chords — NVDA on `Insert`/`CapsLock`, VoiceOver on `Ctrl+Option`, the Windows Magnifier on `Win` + keys —
// and a game that calls `preventDefault()` on those takes away the assistive technology the child is using to
// reach the game in the first place.
//
// 🔴 THE GUARD IS NOT GONE; THE DUPLICATE IS. This game no longer has a `keydown` listener at all: the engine
// mounts the keyboard, presses `engine.controller`, and the controller carries a `VirtualCommand` to
// `onCommand`. The engine's own `input/key-default` is what decides that a press «belongs to something else» —
// a field being typed into, the engine's own control, a chord — and `press()` answers `toPlay: false` for it,
// so it reaches nobody. One answer to one question, which is ADR-0223's whole point.
//
// 📌 WHAT TO DO IF THE DEFECT COMES BACK: it is the engine's now. Measure it against `input/key-default`
// rather than re-adding a guard here, because a second guard is a second answer, and two answers to one
// question is how the two doors came to disagree in the first place.

/**
 * This game's vocabulary, as KEYS of its own dictionaries.
 *
 * PARTIAL on purpose, and the contract says why: requiring all fourteen positions would force a quiz to
 * invent a name for a trigger it does not have, "and an invented name ends up on a remapping screen in front
 * of a child".
 *
 * ⚠️ KEYS AND NOT WORDS, SINCE ENGINE 11.0.0 (ADR-0232 D3, erratum of 2026-09-25). This used to take `t` and
 * return resolved words — the engine `wordsOf`ed the preset itself and the labels became literals in the
 * boot language. Measured by the engine: a preset built with `t` in Portuguese still read «Acima» after
 * `setLocale('en')`. A key is resolved by the root's translator each time the engine draws or speaks it, so
 * one `setLocale` changes every word at once (ADR-0225), and the game never needs to know how (ADR-0216).
 */
export function criarPreset(): ActionPreset {
  return {
    up: { labelKey: 'act.up' },
    down: { labelKey: 'act.down' },
    left: { labelKey: 'act.left' },
    right: { labelKey: 'act.right' },
    [ACAO_DO_SONAR]: { labelKey: 'act.sonar', hintKey: 'act.sonar.hint' },
  };
}

/**
 * The rows the engine's keyboard-remap panel shows: one per position this game reads, with its word.
 *
 * ⚠️ IT IS THE PRESET, READ BACK — not a second list. `ui/settings-controls` asks for `{action, label}` and
 * `createGame` asks for an `ActionPreset`; building the two independently would be the duplicated fact that
 * drifts, and the drift would show as a remapping screen naming an action the game does not read, or reading
 * one it does not name. `wordsOf` + `labellerFrom` are the engine's own readers, so the pairing cannot come
 * apart — the first resolves the preset's keys through the live translator, the second turns the result into
 * a per-action label function.
 *
 * 📌 `labellerFrom` returns `null` for a position whose word the translator could not resolve, which is
 * ADR-0074 refusing to put `action1` in front of a child. Those are dropped rather than filled in with the
 * key: a row with no name is a button a screen reader reads as nothing, and this list exists precisely to be
 * read aloud. The caller passes `engine.word` — `string | null`, exactly what `wordsOf` asks for.
 */
export function acoesComRotulo(word: (chave: string) => string | null): readonly { action: Action; label: string }[] {
  const preset = criarPreset();
  const words = wordsOf(preset, word);
  const label = labellerFrom(words);
  return presetActions(preset)
    .map((action) => ({ action, label: label(action) }))
    .filter((r): r is { action: Action; label: string } => typeof r.label === 'string' && r.label.length > 0);
}
