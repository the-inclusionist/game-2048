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
  /**
   * 🔴 THE ON-SCREEN PAD IS ASKED FOR IN BOTH HALVES, AND THE DUPLICATION IS THE POINT (ADR-0166).
   *
   * It is also on the INSTANCE's hooks in `app/js/boot/main.ts`, because `mount` replaces the whole game
   * half and would otherwise take it away. It has to be HERE as well for a reason of ORDER, measured in the
   * browser on 2026-10-03: `input/touch-bindings.attach()` begins with
   *
   *     const tc = ctx.$('#touch-controls'); if (!tc) return;   // nothing to wire
   *
   * and it runs inside `createGame`, while `drawPad()` only writes `#touch-controls` for a cartridge whose
   * `onScreenPad` is true. Declared only on the instance, the pad is drawn at `mount` — after `attach` has
   * already given up — so the `pointerdown`/`touchstart` listeners that REVEAL it are never wired. 📏 The
   * pad existed in the document with its buttons correctly named from this game's `preset`, stayed
   * `hidden`, and no touch brought it back. Nothing reports that: `padGapProblems` asks whether the pad's
   * map has gaps, not whether anybody can see it.
   */
  onScreenPad: true,
  /**
   * 🔴 THE 🌗 ICON EXISTS ONLY FOR A GAME THAT HANDS IN THIS WRITER. `iconsThatAct` asks
   * `contrast: (w) => w.theme` and the root answers `theme: Boolean(ctx.setPlayerTheme)` — so without this
   * line the engine's whole contrast axis is simply not mounted, and the absence looks from the outside like
   * this game having its own controls. The engine says so itself: «a gap the consumer reads as a choice is
   * the worst kind». That is exactly what happened here — a `◐ Alto contraste` button of our own, and a
   * month of believing the engine offered nothing.
   *
   * ⚠️ IT HAS TO BE ON THE MODULE-LEVEL HOOKS, not the instance's, and that is not a style choice.
   * `boot/create-game.js:812` captures `const setGameTheme = cartridge.setPlayerTheme` and hands it to
   * `initPauseIcons` on the very next line, so the writer the engine calls forever is the one present at
   * `createGame`. A `mount` cannot replace it — the opposite of `onCommand`, which only works THROUGH mount.
   * 📏 Both were measured; neither is documented as an ordering rule, and getting either backwards fails in
   * silence.
   *
   * 📌 SO IT WRITES AN ATTRIBUTE AND NOT A FIELD. This function cannot close over an instance — a
   * module-level «current instance» pointer is the defect spec D14 names, and the one `tests/
   * factory.browser.test.ts` exists to catch. `data-tema` on the root element is state that belongs to the
   * PAGE, readable by any instance and by the stylesheet; `app/js/boot/main.ts` observes it and repaints.
   */
  setPlayerTheme: (_i: number, tema: string) => {
    /*
     * 🔴 THE ENGINE'S CYCLE IS STUCK, AND THIS STEPS AROUND IT WITHOUT TAKING THE AXIS BACK.
     *
     * 📏 Measured on the built page, 2026-10-03: the 🌗 icon moves `padrao → hc3` on the first press and
     * then reports `hc3` for ever. The cause is two lines that disagree about where the theme lives:
     *
     *   · `ui/pause-icons.js:539`  `const v = nextTheme((P()[i] || {}).visual ?? DEFAULT_VISUAL)`
     *   · `boot/create-game.js:935` `setPlayerTheme: (i, theme) => { setGameTheme(i, theme);
     *                                 worldState = { ...worldState, tema: theme }; applyCrt(); }`
     *
     * The next step is computed from `player.visual`; the press writes `worldState`. Nothing ever writes the
     * THEME into `player.visual` — the two places that do write it (`create-game.js:980` and `:1544`) are
     * the CORRECTION and the SIMULATION, which is why the 🚥 icon cycles correctly and this one does not.
     * And the public `players` type is `{ ctrl, audioSink? }[]`, with no `visual` at all, so no cartridge can
     * populate it either. A child who needs 7:1 cannot reach it, and cannot switch the 3:1 back off.
     *
     * ⚠️ THIS IS THE G1 PREDICTION COMING TRUE ON THE OTHER ICON. Part Five recorded «G1 predicted the 🚥
     * icon would stick after one click because `players` is typed without `visual` … the icon cycles
     * correctly» and drew the lesson «reading a type is not measuring a behaviour». The lesson holds; the
     * conclusion that the gap was harmless does not. I measured the icon that has an engine-side default and
     * concluded about the one that does not.
     *
     * 📌 SELF-HEALING, so the step disappears the day the engine is fixed: an incoming value that is NOT
     * `hc3` means the engine computed a real next step, and it is used as given. Only the stuck case — being
     * handed `hc3` when `hc3` or later is already showing — advances on this side.
     *
     * ⚠️ WHAT IS NOT FIXED HERE is the engine's own announcement: `srSay` says `SHORT_THEME[v.tema]`, so a
     * child using narration hears «3:1» at every level. Saying it a second time from this game would be two
     * voices disagreeing over one control, which is worse. It is reported, not papered over.
     */
    const CICLO = ['hc3', 'hc45', 'hc7'] as const;
    const atual = document.documentElement.dataset.tema;
    const preso = tema === 'hc3' && (atual === 'hc3' || atual === 'hc45' || atual === 'hc7');
    const proximo = preso
      ? (CICLO[CICLO.indexOf(atual as typeof CICLO[number]) + 1] ?? 'padrao')
      : tema;
    if (proximo === 'padrao') delete document.documentElement.dataset.tema;
    else document.documentElement.dataset.tema = proximo;
  },
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

/**
 * `uses` — THE OPT-IN PORT (ADR-0255, note DW). This game declares NONE of the three ports:
 *
 *   · `neuralVoice: true`   — opts into Kokoro (371 MB lazy-loaded). 2048 declines through
 *                             `declines.noNeuralVoice: true` (H3). Browser voice is enough for the
 *                             sentences this game speaks; the budget decision is in `src/standalone.ts`.
 *   · `reading: true`       — opts into the ~850 MB of reading models. 2048 has NO reading flow — the
 *                             board carries no text to read aloud, only digits spoken through TTS.
 *   · `fonts: [...]`        — library font families. 2048 uses only «Atkinson Hyperlegible», one of the
 *                             engine's 19 free faces (H7 copy pipeline), so no library family is declared.
 *
 * EXPORTED EXPLICITLY AS `undefined` SO THE DECISION HAS A WRITTEN PLACE (D5 of Part Four). A reader
 * inspecting the cartridge's exports finds the absence as a decision rather than as an oversight; a shell
 * that imports it alongside `accommodations` sees the pair. The `tests/neural-voice-decision.node.test.ts`
 * forward gate asserts the shell's `createGame({...})` call does NOT contain a `uses:` key for any of the
 * three ports.
 *
 * ⚠️ `as undefined` is deliberate — a bare `undefined` value is still typed, and the declaration carries
 * what the game chose. A future opt-in replaces the value AND the typed shape at once; a lazy omission here
 * would silently gain a port without the gate noticing.
 */
export const uses: undefined = undefined;
