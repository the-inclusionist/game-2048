// SPDX-License-Identifier: AGPL-3.0-or-later
// THE CARTRIDGE — what the platform installs, and the entry of the `lib` build (ADR-0140 §1).
//
// ========================= NOTHING HERE RUNS ON IMPORT =========================
// ⚠️ THAT IS THE WHOLE FILE'S JOB, and ADR-0139's first confirmation gate: "a cartridge that is imported and
// never instantiated must do nothing observable — no DOM, no listener, no registration". Importing this
// module builds one frozen object. The game starts when `create(ctx)` is called, and not before.
//
// ========================= AND IT NEVER CALLS `createGame` =========================
// ADR-0139 §2, the clause the rest hang from. `createGame` mounts an accessibility bar, a pause card, six
// colour-vision filters, the TTS, the sonar, the settings panel, the menu navigation and the keyboard
// runtime. Six cartridges each calling it inside one platform would deduplicate the BYTES and multiply the
// RUNTIME — which appears as broken behaviour rather than as weight.
//
// 📌 It is also what makes ADR-0140 cheap: because the caller lives outside the cartridge, the caller is
// free to be `src/standalone.ts` in one build and the platform in another, from this one source.
//
// ========================= THE DEFAULT EXPORT IS READ AT IMPORT (H9, note DV) =========================
// `inclusionist-check-cartridge` imports the built entry and hands `declaration` and `hooks` from its DEFAULT
// EXPORT to the engine's own `cartridgeRefusals`. The checker runs with no page, so `declaration` and
// `hooks` must be well-formed as values — not functions that read per-instance state (there is none at
// import). The declaration is a HONEST PLACEHOLDER saying "there is no game yet"; the live declaration
// (which observes board/cursor/heading) travels WITH the instance and the shell swaps it in through
// `motor.mount(instance.declaration, instance.hooks)`.
import { criarJogo } from '../app/js/boot/main.ts';
import { criarPreset } from '../app/js/actions.ts';
import { RESPOSTAS_DAS_ACOMODACOES } from '../app/js/declaration.ts';
import pt from '../app/js/i18n/pt.ts';
import en from '../app/js/i18n/en.ts';
import es from '../app/js/i18n/es.ts';
import type { GameDeclaration } from '@the-inclusionist/engine/core/contract.js';
import type { CartridgeHooks } from '@the-inclusionist/engine';
import type { Cartridge, GameCtx, GameInstance } from '../app/js/cartridge-types.ts';

export type { Cartridge, GameCtx, GameInstance } from '../app/js/cartridge-types.ts';

/**
 * THE PLACEHOLDER DECLARATION — what the engine sees before `create(ctx)` and what the checker reads.
 *
 * ⚠️ `world: {kind:'none'}` IS RIGHT HERE AND NOWHERE ELSE. The contract warns that `none` must not be the
 * answer when somebody FORGETS; here it is the truth — there is no world because there is no game yet. The
 * shell replaces this value through `motor.mount(instance.declaration)` as soon as `create(ctx)` runs.
 *
 * 🔴 ADR-0139 §5's delegating interim does NOT boot on 11.0.0 — a delegate that answers `undefined` throws
 *    inside `createGame` instead of being reported, measured on 2026-09-11. An honest placeholder passes;
 *    the record's prescribed shape does not.
 */
const declarationTemplate: GameDeclaration = {
  topology: () => ({ kind: 'hotspots', order: ['vazio'] }),
  world: () => ({ kind: 'none' }),
  holdsAtOnce: () => 1,
  holdsKeys: () => false,
  tick: 'player',
  roleAt: () => 'free',
  nameAt: () => null,
  focusOf: () => null,
  objectiveOf: () => ({ have: 0, need: 1, name: { text: '', gender: 'n' as const, plural: false } }),
  targetsOf: () => [],
};

/**
 * THE CARTRIDGE HOOKS — the game-owned half of `CreateGameOptions` minus `declaration`.
 *
 * Everything here is MODULE-LEVEL VALUE, not a per-instance derivation: it is the same whichever instance
 * is mounted, and the engine takes it from the cartridge's default export at import time. The shell spreads
 * it into `createGame({...hooks, …})` and so does `motor.mount(declaration, hooks)`.
 */
const dictionaries = Object.freeze({ pt, en, es });
const hooks: CartridgeHooks = Object.freeze({
  preset: criarPreset(),
  accommodations: RESPOSTAS_DAS_ACOMODACOES,
  dictionaries,
  isNavigable: () => true,
});

/**
 * THE CARTRIDGE.
 *
 * 📌 `slug` MATCHES THE REPOSITORY AND THE PACKAGE, which ADR-0082 §1 requires as one word: the repository
 * is `the-inclusionist/game-2048`, the package is `@the-inclusionist/game-2048`, and this is `game-2048`.
 * A gate asserts all three agree, because the one that drifts is always the one nobody reads.
 *
 * 📌 `dictionaries` IS A SHORTCUT INTO `hooks.dictionaries` (same object), kept at the top level for the
 * `tests/cartridge.node.test.ts` assertion and for a shell that wants it without reaching through hooks.
 */
export const cartridge: Cartridge = Object.freeze({
  slug: 'game-2048',
  declaration: declarationTemplate,
  hooks,
  dictionaries,
  create(ctx: GameCtx): GameInstance {
    return criarJogo(ctx);
  },
});

export default cartridge;

/** The accommodations answer, for consumers that want it beside `cartridge.hooks.accommodations`. */
export const accommodations = RESPOSTAS_DAS_ACOMODACOES;
