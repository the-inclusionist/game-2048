// SPDX-License-Identifier: AGPL-3.0-or-later
// en — American English, by lexical choice rather than by tag.
//
// The BCP-47 tag stays a bare `en`: the engine hands the browser `en` on purpose so it picks the local
// variant, and pinning `en-US` would impose an American accent on a child in India or Nigeria. What is
// American here is the WORDING, which is what a dictionary is for.
import type { Dicionario } from './pt.ts';

export const en: Dicionario = {
  'game.title': '2048 · Power of Two',
  'game.tagline': 'Merge equal tiles and double your way to 2048.',

  'cell.empty': 'empty',
  'hud.nome.dobras': 'doublings',

  'hud.score': 'Score',
  'hud.best': 'Largest tile',
  'hud.objective': 'Reach the 2048 tile',

  'a11y.board': 'Board, {cols} by {rows}',
  'a11y.cell': 'Row {row}, column {col}: {what}',
  'a11y.cellMergeable': 'Row {row}, column {col}: {what}, can merge',
  'a11y.instructions': 'Use the arrow keys to push the board. Tab moves the reading cursor.',

  'move.none': 'Nothing moves {dir}.',
  'move.merged': 'Merged: {pairs}.',
  'move.pair': '{a} and {a} became {b}',
  'move.spawned': '{value} appeared at row {row}, column {col}.',
  'move.doubles': '{have} of {need} doublings.',

  'dir.left': 'left',
  'dir.right': 'right',
  'dir.up': 'up',
  'dir.down': 'down',

  'act.up': 'Push up',
  'act.down': 'Push down',
  'act.left': 'Push left',
  'act.right': 'Push right',
  'act.sonar': 'Where a merge is',
  'act.sonar.hint': 'Says where a merge is available, which way, and how far.',
  'act.ler': 'Read the board',
  'act.ler.hint': 'Switches what the arrows do: push the tiles, or walk the squares to hear each one.',
  'help.push': 'Push the board to one side. Every tile moves at once — the arrows move the board, not a cursor.',
  'help.merge': 'Two tiles with the same number that meet become one, worth double: 2 and 2 make 4.',
  'help.goal': 'A new tile appears after every move. Keep doubling until you reach the 2048 tile.',
  'a11y.reading.on': 'Reading on: the arrows walk the squares.',
  'a11y.reading.off': 'Reading off: the arrows push the tiles again.',


  'end.win': 'You reached 2048. That is eleven doublings, start to finish.',
  'end.stuck': 'No moves left. The largest tile was {value}, which is {doubles} doublings.',
  'end.again': 'Play again',
};

export default en;
