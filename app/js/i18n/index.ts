// SPDX-License-Identifier: AGPL-3.0-or-later
// HANDING THE DICTIONARIES TO THE ENGINE — three lines of code with a whole decision behind them.
//
// Before 2026-09-05 this file could not exist. The engine's locales arrived through
// `import.meta.glob('../i18n/*.ts')`, a glob resolved in ITS build against ITS folder, and `DICTS` was module
// private: a game installed as a package had no door at all to its own keys. The `game-chess` paid the price
// the most expensive way possible — it wrote a SECOND i18n system, 383 lines of it, and imports the engine's
// `t` separately just for the engine's own strings.
//
// `registerDict()` is the door. This game uses the engine's i18n and nothing else.
import { registerDict } from '@the-inclusionist/engine/core/i18n.js';
import en from './en.ts';
import es from './es.ts';
import pt from './pt.ts';

export type { Chave, Dicionario } from './pt.ts';

/**
 * Registers the three languages. Call BEFORE any text reaches the screen.
 *
 * All three at once rather than on demand: they are 24 keys each, the cost is negligible, and registering
 * lazily would need a hook on the language switch that the engine does not offer — inventing one would be
 * solving, with machinery, a problem that does not exist at this size.
 */
export function registrarIdiomas(): void {
  registerDict('pt', pt);
  registerDict('en', en);
  registerDict('es', es);
}
