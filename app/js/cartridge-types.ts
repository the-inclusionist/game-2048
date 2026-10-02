// SPDX-License-Identifier: AGPL-3.0-or-later
// THE CARTRIDGE CONTRACT, as this repository implements it — ADR-0139, with the holes it leaves marked.
//
// ========================= THESE ARE NOT THE ENGINE'S TYPES, AND THAT IS THE POINT =========================
// The engine publishes `CreateGameOptions` and, since 9.0.0, `CartridgeHooks` — the game-owned half as a
// `Pick<>` of its own options. What it does not publish is `GameCtx`, `GameInstance` or `Cartridge`: those
// live in `the-inclusionist-site/docs/cartridge-contract.md` as a derivation, and in ADR-0139 §2 as a sketch.
// So they are written here, deliberately narrow, and every departure from the record is marked.
//
// ⚠️ AND THE RECORDS SAY TO EXPECT CORRECTIONS. ADR-0068 §6 puts `game-whackwhack` through this first; the Dev
// decided on 2026-09-11 that this repository goes now. Going first means deriving what the records leave open
// — and one derivation has already been overruled within a day (`declines`, settled as game-owned by engine
// 9.0.0's `MetadeDoJogo`). Each `DERIVED HERE` below is a place to expect the same.
import type { Engine } from '@the-inclusionist/engine';
import type { Rng } from '@the-inclusionist/engine/core/rng.js';
import type { GameDeclaration } from '@the-inclusionist/engine/core/contract.js';
import type { CartridgeHooks } from '@the-inclusionist/engine';

/** What a shell hands a cartridge. Five members, read off `cartridge-contract.md`. */
export interface GameCtx {
  /** Exactly what `createGame` returned. ONE instance, however many cartridges exist (ADR-0139 §2). */
  readonly engine: Engine;
  /** This cartridge's element. It may write inside it and nothing outside it (ADR-0139 §4). */
  readonly region: HTMLElement;
  /** This cartridge's own stream. NOT a convenience — see ADR-0141 and `app/js/keyboard-save.ts`'s neighbour. */
  readonly rng: Rng;
  /** Translate, already scoped to the active locale. */
  readonly t: (chave: string, params?: Record<string, string | number>) => string;
  /**
   * What the shell decided this cartridge may read from the address.
   *
   * 📌 THIS GAME READS NOTHING FROM IT, and the member stays anyway: in platform mode there is ONE address for
   * every cartridge, so a game reading `location.search` directly reads another game's parameters. Keeping the
   * door means never being tempted to reach past it.
   */
  readonly params: URLSearchParams;
}

/**
 * What a cartridge hands back.
 *
 * ⚠️ `declaration` IS AN ADDITION — `DERIVED HERE`. ADR-0139 §2 puts `declaration` on the CARTRIDGE, beside
 * `create`, as a module-level value. That cannot work for a game whose declaration OBSERVES per-instance state:
 * ours reads the board, the cursor and the heading, so a module-level declaration would need a module-level
 * "current instance" pointer — which is exactly the state spec D14 forbids a cartridge to hold, and the reason
 * two games on one page collide.
 *
 * ⚠️ ADR-0142 is what makes the alternative honest rather than a workaround: engine 9.0.0 gained
 * `mount(declaration, ganchos)`, so the declaration can arrive WITH the instance and be mounted per swap. The
 * shell calls `engine.mount` — the cartridge never does, because `mount` reaches the one engine everybody
 * shares.
 */
export interface GameInstance {
  /** One tick of the host's loop. `dt` in FRAMES, never seconds. */
  readonly update: (dt: number) => void;
  /** Release everything. After this returns, nothing of this instance is left on the page. */
  readonly teardown: () => void;
  /** This instance's live declaration, for the shell to `mount`. See the note above. */
  readonly declaration: GameDeclaration;
  /**
   * The game-owned half of the options, for the same `mount` call.
   *
   * ⚠️ ALSO AN ADDITION — `DERIVED HERE`, and for a second reason on top of the declaration's. `preset`
   * carries the WORDS a child reads on the remapping screen, and words come from the dictionary. A preset
   * built at module scope resolves against a table the shell has not filled yet, so every label would be the
   * raw key — `act.sonar` in front of a child, which is precisely what ADR-0074 forbids.
   *
   * 📌 So the rule is one rule, not two: **anything that needs the instance or the locale travels with the
   * instance and is mounted.** Everything else stays on the `Cartridge`.
   */
  readonly hooks: CartridgeHooks;
}

// The game-owned half of `CreateGameOptions`. The engine names this type `CartridgeHooks` directly as of
// 10.0.0 (English rename, note CN) — before that it was `GanchosDoCartucho` and this file aliased it to the
// current English name; the engine took the name over, so the import at the top is the whole re-export.

/** What the package exports — ADR-0139 §2 and the `inclusionist-check-cartridge` reader. */
export interface Cartridge {
  /** Matches the repository and the package name (ADR-0082 §1). */
  readonly slug: string;
  /**
   * THE PLACEHOLDER DECLARATION — a well-formed `GameDeclaration` that says «there is no game yet». Read at
   * import time by `inclusionist-check-cartridge` (H9, note DV); replaced at run time by the live
   * declaration that `create(ctx)` returns, through `motor.mount(instance.declaration)`.
   *
   * 🔴 ⚠️ `declaration` MOVED TO THE DEFAULT EXPORT IN H9, which is a RETREAT from Part Two's `DERIVED
   * HERE` note. ADR-0139 §5 wanted a delegating declaration here, forwarding to the mounted instance; that
   * shape still throws on 11.0.0 (measured). The honest placeholder is the compromise: it is wrong about
   * the game and the checker accepts it, which is what the checker was built to assert.
   */
  readonly declaration: GameDeclaration;
  /**
   * THE GAME-OWNED HALF OF `CreateGameOptions`, MINUS `declaration` — preset, accommodations, dictionaries,
   * isNavigable and the rest of what `CartridgeHooks = Omit<GameHalf, 'declaration'>` names.
   */
  readonly hooks: CartridgeHooks;
  /**
   * Convenience alias into `hooks.dictionaries` — the SAME object, exposed at the top level so a consumer
   * that only wants words does not need to reach through the hooks structure. The gate in
   * `tests/cartridge.node.test.ts` reads it here.
   */
  readonly dictionaries: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /**
   * Nothing runs until this is called. No side effects at module scope — spec D14. Returns a `GameInstance`
   * carrying the LIVE declaration that observes per-instance state, which the shell mounts.
   */
  readonly create: (ctx: GameCtx) => GameInstance;
}
