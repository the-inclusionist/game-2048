// SPDX-License-Identifier: AGPL-3.0-or-later
// es — español NEUTRO latinoamericano, por elección léxica y no por etiqueta.
//
// La etiqueta BCP-47 sigue siendo `es` a secas: la engine se la entrega así al navegador para que este elija
// la variante local. Lo neutro está en las PALABRAS — se usa `ustedes` y nunca `vosotros`, y se evita el
// vocabulario que solo se entiende en una región. Un niño en Lima, en Bogotá o en Asunción tiene que leer
// esto sin tropezar.
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

  'end.win': 'Llegaste a 2048. Son once duplicaciones, de principio a fin.',
  'end.stuck': 'No quedan jugadas. La ficha más alta fue {value}, que son {doubles} duplicaciones.',
  'end.again': 'Jugar otra vez',
};

export default es;
