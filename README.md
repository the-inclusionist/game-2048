# 2048 · Potência de 2

A sliding-merge number puzzle for Brazilian public schools, built on
[The Inclusionist engine](https://github.com/the-inclusionist/the-inclusionist-engine) — accessible first,
at the engine's 320×180 pixel grid, offline as a PWA.

> ⚠️ **Playable, and not finished.** A full round runs start to end; what is missing is listed under *Still
> owed*. The sentence that stood here first said the repository held no product code at all, and removing it
> was part of the commit that made it false (ADR-0067 §3).

## State

| | |
|---|---|
| ✅ The rules | `app/js/board.ts` — slide, merge-once-per-move, seeded spawn, `mergeSpots`, `canMove`, `maxTile`. Pure: no DOM, no renderer. **Eight mutations proven red** before the green counted. |
| ✅ The declaration | `app/js/declaration.ts` — the seven fields of `core/contract` for a 4×4 `grid`, **the project's first**. **Nine mutations red.** The objective counts *doublings*: the engine's `{have} de {need} {nome}` frame reads **"4 de 11 dobras"**, and 11 is what 2048 *is*. |
| ✅ The screen | PixiJS paints the figure at 320×180 (`render/board-canvas`); the numbers are real DOM text over it (`ui/board-dom`), with `role="grid"`, roving focus and labels built from the declaration. One geometry (`geometry.ts`) feeds both, and a browser test compares them cell by cell. |
| ✅ Colour | `render/palette.ts` — the ink is *computed*, not chosen. Every tile clears WCAG 1.4.3 AA as a gate; seven of thirteen reach AAA, counted and never claimed in bulk. |
| ✅ Speech | `narration.ts` — the sentence a blind child receives, testable without a browser. Each merge is spoken with **both addends and the result** ("2 e 2 viraram 4"), because that is the curriculum, not a status line. |
| ✅ a11y gate | `scripts/axe-check.mjs` runs axe-core against the RUNNING game and the CI caller asks for it (`a11y: true`). **Zero WCAG A/AA violations, with no exclusions at all** — until engine 10 the engine excluded the third-party VLibras widget; in 11.0.0 the Unity player left entirely for the free `ui/libras-avatar-player` (ADR-0234, note DO). This game loads neither, so nothing in the page the gate measures is exempt. Proven able to fail before being trusted, and it also refuses to judge a page that is not this game. |
| ✅ i18n | `pt-BR`, `en-US`, neutral Latin-American `es`, declared through `CreateGameOptions.dictionaries` since engine 11.0.0 (ADR-0232 D3, note DN). A browser test plays a move in Spanish and reads it back out of the live region, and asserts a `setLocale` moves every drawn label at once. |
| ✅ Animation | Tiles **slide**, and the two layers move on ONE clock: the canvas paints the piece, the DOM carries the number, both from the same `pecasNoInstante(t)` in the same frame. Zero animation when the child asks for less — from the SYSTEM (`prefers-reduced-motion`, WCAG 2.3.3) **or** from the engine's 🧩 TEA/calm icon in the bar. 🔴 The second was being ignored until 2026-09-11: the click wrote `reducedMotion` and the tiles went on sliding, so the icon was half a dead control. Either source is enough; neither can switch the other off. |
| ✅ The accessibility bar | Since engine **8.0.0**, `createGame` writes and wires it into `#p2-a11y`: 🦯 blind mode, 🗨️ TTS, 🤟 Libras and 🧩 TEA/calm, none of which this game writes a line of — and none of which was reachable here before. The ☝️ latch is deliberately ABSENT, because `holdsKeys()` answers `false` (renamed from `seguraTeclas` in engine 10.0.0, note CI) and a control that does nothing is worse than a missing one. |
| ✅ Input as intent | Every key this game reads is an engine ACTION with a word of its own (`app/js/actions.ts`, declared through `preset`) — including the **sonar**, which was a hard-coded `Alt+S` until engine 8.0.0 and is now `action1`, one keystroke, remappable by the engine's layer. ✅ **And the screen that WRITES a remapping is now mounted** (`⌨ Teclas`): the engine's own `ui/settings-controls`, listing this game's five positions by the words above, with the sonar among them. A child rebinds it and the game obeys the new key — measured, and it persists. |
| ✅ Installable | Two build targets from one source (ADR-0140): **app** bundles the engine and is the PWA; **lib** externalises it and is what gets published — 19 kB against the app build's 587 kB, which is the deduplication made visible. The engine and PixiJS are declared **twice**, as peers (what a consumer must supply) and as devDependencies (so a clean clone builds). `npm run build` runs both, because ADR-0140 calls that gate "not optional". |
| ✅ A cartridge | `src/index.ts` default-exports `{ slug, declaration, hooks, dictionaries, create(ctx) }` (ADR-0139 §2 plus ADR-0253 §DV — `inclusionist-check-cartridge` reads the four at import) and **never calls `createGame`**; importing it does nothing observable, which is the record's own first gate. `src/standalone.ts` is the shell: it calls `createGame({ declaration: cartridge.declaration, ...cartridge.hooks, host, declines, downloadHeavy })` once, calls `motor.mount(instance.declaration)` once (engine 9.0.0 added `mount`, still here on 11.0.0), and runs the one loop. The platform will be a different shell around the same factory. |
| ✅ A factory, not a boot | `bootar()` returns `{ motor, update, teardown }` and owns its state in a closure — the four module-level `let`s are gone (spec D14). The SHELL runs the one loop and ticks `update(dt)` in **frames**; the PixiJS surface is `autoStart: false`, so this game opens no frame callback of its own (ADR-0139 §3). `teardown()` releases the three things that escaped the region — a `resize` on the window, a `visibilitychange` on the document, and the `__incl2048` global — plus its nodes and the WebGL context. |
| ✅ Offline | A real PWA since 2026-09-11: service worker, `manifest.webmanifest` (`lang: pt-BR`, scoped to this game rather than the origin) and a **vector** icon — `docs/LICENSES.md` says this repository has no drawn asset, and a PNG would have made that false in the commit that made line 5 true. 57 precache entries, 2.1 MB. ⚠️ A development and demonstration route, **never a delivery route to children** (ADR-0140 §3). |
| ⬜ Still owed | A merge **flash**; a run on real school hardware; and a pause card that can reach the engine's own adjustment panels. |

**Verified** on engine **9.0.0**, pinned exactly: `npm run validate` green — typecheck clean, **224 assertions** across node and browser, build
passing, and the axe gate reporting zero WCAG A/AA violations with no exclusions. A full round played in a
real browser: 222 moves to a stuck board, largest tile 256, HUD in step with the model.

## Which record declares it

**ADR-0081**, in [`the-inclusionist-docs`](https://github.com/the-inclusionist/the-inclusionist-docs), at
`docs/2-Architecture/adr/`. ⚠️ This line used to say «in the engine's», and stopped being true on 2026-09-09
(**ADR-0123**): the whole tree moved to a repository of its own, one for the project. It records the address
`the-inclusionist/game-2048`
declared by the Dev on 2026-09-06. It superseded **ADR-0073 whole**, which had declared `pixi-2048` the day
before: the old address sat in that record's title, and a title is a record's identity rather than one of its
clauses. The rename cost three strings because it happened before the repository existed — the window
ADR-0073 had itself predicted.

**ADR-0082** then made the address a rule instead of an exception: a game repository is named `game-<slug>`
and mirrors its package. It replaces ADR-0068 §1's suspended `the-inclusionist-game-<slug>` pattern — the
container is already named by the organisation, so repeating it would say the word twice (ADR-0071 §1). It
exists because ADR-0081 had justified leaving the rule open with a stale fact about another repository, which
is a mistake worth naming rather than editing away.

⚠️ **A game repository holds no `adr/` folder and never will** (ADR-0068 §5). The records — the ten
non-negotiable pillars, the accessibility contract, the licence posture — live in the engine and are
inherited. This repository states only what is its own: its art, its credits and its third-party terms.

## What this game gave back to the engine

A consumer is worth more than its own screen: it is the only thing that measures what an engine actually
delivers. This one is the **second preset** ADR-0030 was waiting for — the quiz gave `hotspots`, a list with
no space at all; this gives `grid`, where distance and neighbourhood exist — and it forced three fixes on the
engine before a line of the game could be written:

| Found here | Fixed there |
|---|---|
| A game outside the engine repository had **no way to register its own strings**: locales arrive through an `import.meta.glob` resolved in the engine's build, against the engine's folder, and `DICTS` is module-private. The chess game had paid for this with a second i18n system, 383 lines of it. | `core/i18n` gained `registerDict()` in 8.0.0 with a five-step resolution chain and a gate proven red first — and in 11.0.0 (ADR-0232 D3) the module-level door closed again in favour of a declarative one: dictionaries ride into `createGame({ dictionaries })`, which is where this cartridge now hands them (`src/index.ts`). |
| The engine **was not publishable**: `private: true`, `exports` pointing at raw `.ts`, `pixi.js` as a devDependency, and the panel CSS plus 18 font faces required by borrowed dialogs that no export named. | `tsconfig.pkg.json`, a real `exports` map with `types`, and `./style.css` + `./assets/*`. |
| Two **Vite-only constructs survived `tsc`** into the emitted package and would have failed — one of them *silently*, turning every non-Portuguese locale back into Portuguese. | Static locale loaders; `render/sprites` and `env.d.ts` excluded from the package; a gate that scans the shipped source. |

## Deviations, written down rather than buried

- **The arrow keys play; they do not read.** The APG `grid` pattern says arrows navigate between cells. Here
  pushing the board *is* the verb, and arrows that only read would leave the keyboard-only child unable to
  play — precisely the person the pattern exists to serve. **Shift + arrows** move the reading cursor
  instead, Tab is never hijacked, every move is summarised into the live region, and the engine's sonar
  answers "where is a merge" in one keystroke. See the header of `app/js/ui/board-dom.ts`.
- **The colour-vision control is four VISIBLE rows, not a `<select>`** — behind a labelled button since 2026-09-12. The engine's own `ui/visual-axes-panel` records why: inside a closed box, a control whose reason to exist is to be *found* by someone who sees poorly is “almost the same as not having moved it”. The rows are the engine's `linhasDoEixo`, so it reads the same here as in every other game. ⚠️ They sat **open in the page** until 2026-09-12, and that was measured to cost the board its screen: `<main>` is a flex column whose only flexible item is the stage, so the panel's 311 px came out of the game — 119 px of the board clipped on a 1024×768 tablet, and the document does not scroll, so the cut part was unreachable. `🚥 Correção de cor` now opens them from the same row as «Alto contraste»: the objection above is to a `<select>`, and a named button one press away is not one. Gated by `scripts/layout-check.mjs` on four real screens. ⚠️ Only the **correction** axis is mounted — the engine's *contrast* axis offers `hc3`/`hc45`/`hc7`, three levels it renders by repainting the platformer's textures, and this game has ONE by-role palette. Three rows that all did the same thing would be three-quarters of a dead control, so contrast stays a single button until there are three palettes to answer with.
- **Modifier chords are the system's, not ours.** `Ctrl`, `Alt` and `Cmd` are handed straight back — measured on 2026-09-11, `Ctrl+S` used to play a move AND swallow the browser's Save, because `KeyS` is `down` in the engine's scheme. Assistive technology lives on modifier chords (VoiceOver on `Ctrl+Option`, NVDA on `Insert` combinations), so taking them is taking the tool the child uses to reach the game. **Shift** is the one exception, and it is a verb here rather than a modifier.
- **The engine's 🌗 and 🚥 icons stay unmounted, and the reason is measured.** Engine 9.0.0 opened both
  writer doors. 🌗 is refused by arithmetic: the axis' `hc7` asks three role colours to sit pairwise at 7:1,
  which needs **49:1** between the extremes when the WCAG scale stops at **21** — impossible at any effort,
  not merely unbuilt. 🚥 is refused by a half-open door: the icon READS its current value from `players`,
  typed «esquema de teclas e nada mais», so it would read the default on every click and stick after one.
  Gated in `tests/visual.node.test.ts`.
- **AAA is counted, never claimed.** Every tile clears AA (WCAG 1.4.3) as a hard gate. Seven of thirteen
  reach AAA; that number is reported and asserted only to be *honest*, because 1.4.6 fights vivid colour and
  pillar 2 says mark where only AA is reachable.

## Origin, and what is deliberately not inherited

The genre descends from **Threes!** (Asher Vollmer & Greg Wohlwend, 2014) by way of **1024** and
**2048** (Gabriele Cirulli, 2014, MIT). Two MIT descendants were read as references for feature parity:
[`DaoCloud/dao-2048`](https://github.com/DaoCloud/dao-2048) and
[`jrocha-io/esp-2048-game-css`](https://github.com/jrocha-io/esp-2048-game-css).

⚠️ **No line of code and no colour of the original palette is inherited.** The rules of a game are not
protected by copyright; an implementation is. A clean reimplementation is the only way the Município holds
title to the whole of what it owns (`docs/LICENSES.md`), and it is the same move the engine made with
Clarity and the chess game made with `3D-Hartwig-chess-set`. Credit is due and given regardless — see
[`docs/CREDITS.md`](docs/CREDITS.md).

Two features of those forks are deliberately **absent**, and the reason is a pillar rather than an omission:

| Not here | Why |
|---|---|
| Persisted best score | ADR-0037: there is no save, and the Inclusionist stores nothing about a child. The score lives for the round and dies with it. |
| Endless play past 2048, score chasing | ADR-0006 (no compulsion loops) and ADR-0049 (every reward deterministic; the only celebration is growth). |

## Licence

Code: **AGPL-3.0-or-later** ([`LICENSE`](LICENSE)). Economic ownership belongs to the **Município**, not to
the developer — the reasoning and the citation are in [`docs/LICENSES.md`](docs/LICENSES.md), which is where
that fact lives rather than in a package name.
