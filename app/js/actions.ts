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
  isAction, labellerFrom, presetActions, type Action, type ActionPreset,
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

/**
 * The four directions, which in this game PUSH THE BOARD rather than move a cursor.
 *
 * The reading cursor is Shift + the same arrows — the APG deviation declared in the header of
 * `ui/board-dom.ts`, and the reason is there: in 2048 pushing IS the verb, so arrows that only navigated
 * would leave a keyboard-only child unable to play.
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
export function direcaoDe(acao: string | null | undefined): Direction | undefined {
  return acao && isAction(acao) ? ACAO_PARA_DIRECAO[acao] : undefined;
}

/** Is this the sonar's position? Same boundary, same reason — one place that knows the answer. */
export function ehSonar(acao: string | null | undefined): boolean {
  return acao === ACAO_DO_SONAR;
}

/** The modifier flags of a `KeyboardEvent`, and nothing else — so this stays testable without a keyboard. */
export interface Modificadores {
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
}

/**
 * Does this keystroke belong to the SYSTEM rather than to the game?
 *
 * ⚠️ MEASURED ON 2026-09-11, IN THE BROWSER: `Ctrl+S` played a move AND was swallowed, so the browser's Save
 * never opened. `KeyS` is `down` in the engine's solo scheme, and the handler read the action without ever
 * asking whether a modifier was held — so every `Ctrl`/`Alt`/`Cmd` chord built on `W`, `A`, `S`, `D`, `U` or
 * an arrow was quietly taken from whoever pressed it.
 *
 * 🔴 AND THE PERSON IT COSTS MOST IS THE ONE THIS GAME IS FOR. Screen readers and magnifiers live on modifier
 * chords — NVDA on `Insert`/`CapsLock` combinations, VoiceOver on `Ctrl+Option`, Windows Magnifier on
 * `Win` + keys. A game that calls `preventDefault()` on those does not merely ignore them: it takes them away
 * from the assistive technology the child is using to reach the game in the first place.
 *
 * ⚠️ SHIFT IS DELIBERATELY NOT HERE. It is the one modifier this game claims, and it claims it as a VERB:
 * `Shift` + arrow moves the reading cursor instead of pushing the board (the APG deviation in the header of
 * `ui/board-dom.ts`). Adding it would delete that reading mode.
 */
export function ehAtalhoDoSistema(e: Modificadores): boolean {
  return e.ctrlKey || e.altKey || e.metaKey;
}

/**
 * This game's vocabulary, for the engine to SHOW when it has to name a key.
 *
 * PARTIAL on purpose, and the contract says why: requiring all fourteen positions would force a quiz to
 * invent a name for a trigger it does not have, "and an invented name ends up on a remapping screen in front
 * of a child".
 *
 * `t` is INJECTED rather than imported, for the same reason it is injected into `declaration.ts`: a test can
 * pass a `t` that echoes the key and measure WHICH key was asked for, without asserting on a translation.
 */
export function criarPreset(t: (chave: string) => string): ActionPreset {
  return {
    up: { label: t('act.up') },
    down: { label: t('act.down') },
    left: { label: t('act.left') },
    right: { label: t('act.right') },
    [ACAO_DO_SONAR]: { label: t('act.sonar'), hint: t('act.sonar.hint') },
  };
}

/**
 * The rows the engine's keyboard-remap panel shows: one per position this game reads, with its word.
 *
 * ⚠️ IT IS THE PRESET, READ BACK — not a second list. `ui/settings-controls` asks for `{acao, rotulo}` and
 * `createGame` asks for an `ActionPreset`; building the two independently would be the duplicated fact that
 * drifts, and the drift would show as a remapping screen naming an action the game does not read, or reading
 * one it does not name. `labellerFrom` is the engine's own reader, so the pairing cannot come apart.
 *
 * 📌 `labellerFrom` returns `null` for a position the preset does not name, which is ADR-0074 refusing to put
 * `action1` in front of a child. Those are dropped rather than filled in with the key: a row with no name is
 * a button a screen reader reads as nothing, and this list exists precisely to be read aloud.
 */
export function acoesComRotulo(t: (chave: string) => string): readonly { acao: Action; rotulo: string }[] {
  const preset = criarPreset(t);
  const rotulo = labellerFrom(preset);
  return presetActions(preset)
    .map((acao) => ({ acao, rotulo: rotulo(acao) }))
    .filter((r): r is { acao: Action; rotulo: string } => typeof r.rotulo === 'string' && r.rotulo.length > 0);
}
