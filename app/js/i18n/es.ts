// SPDX-License-Identifier: AGPL-3.0-or-later
// es — NEUTRAL Latin American Spanish, by lexical choice rather than by tag.
//
// The BCP-47 tag stays a bare `es`: the engine hands it to the browser that way so the browser picks the local
// variant. What is neutral lives in the WORDS — `ustedes` and never `vosotros`, and no vocabulary that only
// one region understands. A child in Lima, in Bogotá or in Asunción has to read this without stumbling.
//
// ⚠️ The VALUES below stay in Spanish, which is not an exception to the English-prose rule — it is the rule
// working. This is i18n content, not prose about the code.
import type { Dicionario } from './pt.ts';

export const es: Dicionario = {
  'game.title': '2048 · Potencia de dos',
  'game.tagline': 'Une fichas iguales y duplica hasta llegar a 2048.',

  'cell.empty': 'vacío',
  'hud.nome.dobras': 'duplicaciones',

  'hud.score': 'Puntos',
  'hud.best': 'Ficha más alta',
  'hud.objective': 'Llegá a la ficha 2048',

  'a11y.board': 'Tablero de {cols} por {rows}',
  'a11y.cell': 'Fila {row}, columna {col}: {what}',
  'a11y.cellMergeable': 'Fila {row}, columna {col}: {what}, se puede unir',
  'a11y.instructions': 'Usá las flechas para empujar el tablero. La tecla de tabulación mueve el cursor de lectura.',

  'move.none': 'Nada se mueve hacia {dir}.',
  'move.merged': 'Se unieron: {pairs}.',
  'move.pair': '{a} y {a} formaron {b}',
  'move.spawned': 'Apareció {value} en la fila {row}, columna {col}.',
  'move.doubles': '{have} de {need} duplicaciones.',

  'dir.left': 'la izquierda',
  'dir.right': 'la derecha',
  'dir.up': 'arriba',
  'dir.down': 'abajo',

  'act.up': 'Empujar hacia arriba',
  'act.down': 'Empujar hacia abajo',
  'act.left': 'Empujar hacia la izquierda',
  'act.right': 'Empujar hacia la derecha',
  'act.sonar': 'Dónde hay una unión',
  'act.sonar.hint': 'Dice dónde hay una unión posible, hacia qué lado y a qué distancia.',
  'help.push': 'Empuja el tablero hacia un lado. Todas las fichas se mueven a la vez: las flechas mueven el tablero, no un cursor.',
  'help.merge': 'Dos fichas con el mismo número que se encuentran se vuelven una sola, con el doble: 2 y 2 hacen 4.',
  'help.goal': 'Después de cada jugada aparece una ficha nueva. Sigue doblando hasta llegar a la ficha 2048.',


  'end.win': 'Llegaste a 2048. Son once duplicaciones, de principio a fin.',
  'end.stuck': 'No quedan jugadas. La ficha más alta fue {value}, que son {doubles} duplicaciones.',
  'end.again': 'Jugar otra vez',
};

export default es;
