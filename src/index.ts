// SPDX-License-Identifier: AGPL-3.0-or-later
// THE CARTRIDGE — what the platform installs, and the entry of the `lib` build (ADR-0140 §1).
//
// ========================= NOTHING HERE RUNS ON IMPORT =========================
// ⚠️ THAT IS THE WHOLE FILE'S JOB, and ADR-0139's first confirmation gate: "a cartridge that is imported and
// never instantiated must do nothing observable — no DOM, no listener, no registration". Importing this module
// builds one frozen object. The game starts when `create(ctx)` is called, and not before.
//
// ========================= AND IT NEVER CALLS `createGame` =========================
// ADR-0139 §2, the clause the rest hang from. `createGame` mounts an accessibility bar, a pause card, six
// colour-vision filters, the TTS, the sonar, the settings panel, the menu navigation and the keyboard runtime.
// Six cartridges each calling it inside one platform would deduplicate the BYTES and multiply the RUNTIME: N
// accessibility bars competing for one document, which appears as broken behaviour rather than as weight.
//
// 📌 It is also what makes ADR-0140 cheap: because the caller lives outside the cartridge, the caller is free
// to be `src/standalone.ts` in one build and the platform in another, from this one source.
import { criarJogo } from '../app/js/boot/main.ts';
import pt from '../app/js/i18n/pt.ts';
import en from '../app/js/i18n/en.ts';
import es from '../app/js/i18n/es.ts';
import { RESPOSTAS_DAS_ACOMODACOES } from '../app/js/declaration.ts';
import type { Cartridge, GameCtx, GameInstance } from '../app/js/cartridge-types.ts';

export type { Cartridge, GameCtx, GameInstance } from '../app/js/cartridge-types.ts';

/** The accommodations answer for `CreateGameOptions.accommodations`. See `app/js/declaration.ts`. */
export const accommodations = RESPOSTAS_DAS_ACOMODACOES;

/**
 * THE CARTRIDGE.
 *
 * 📌 `slug` MATCHES THE REPOSITORY AND THE PACKAGE, which ADR-0082 §1 requires as one word: the repository is
 * `the-inclusionist/game-2048`, the package is `@the-inclusionist/game-2048`, and this is `game-2048`. A gate
 * asserts all three agree, because the one that drifts is always the one nobody reads.
 */
export const cartridge: Cartridge = Object.freeze({
  slug: 'game-2048',

  /**
   * THE DICTIONARIES, FOR THE SHELL TO HAND TO `createGame({ dictionaries })`.
   *
   * ⚠️ RENAMED FROM `dicts` TO MATCH THE ENGINE, since engine 11.0.0 (ADR-0232 D3, note DN). The three
   * language maps ride through `CreateGameOptions.dictionaries` and the root's translator registers them
   * once, before any text. This file does not call `registerDict` because the module-level `registerDict`
   * is gone in 11 — a cartridge that reached for it would import nothing.
   *
   * 📌 Two cartridges that each declare dictionaries would still be two writes to one table — but the
   * engine's own merge rule (note DN) says a `CartridgeHooks.dictionaries` from a later `mount()` is
   * ADDED to the root's, not replace them. So the «loser's strings missing with nothing said» failure the
   * old warning described cannot happen here: both read, keys unknown to every language go into
   * `problems` named.
   */
  dictionaries: Object.freeze({ pt, en, es }),

  create(ctx: GameCtx): GameInstance {
    return criarJogo(ctx);
  },
});

export default cartridge;
