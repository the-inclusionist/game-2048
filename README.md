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
| ✅ a11y gate | `scripts/axe-check.mjs` runs axe-core against the RUNNING game and the CI caller asks for it (`a11y: true`). **Zero WCAG A/AA violations, with no exclusions at all** — the engine excludes the third-party VLibras widget; this game does not load it, so nothing here is exempt. Proven able to fail before being trusted. |
| ✅ i18n | `pt-BR`, `en-US`, neutral Latin-American `es`, delivered through the engine's `registerDict()`. A browser test plays a move in Spanish and reads it back out of the live region. |
| ✅ Animation | Tiles **slide**, and the two layers move on ONE clock: the canvas paints the piece, the DOM carries the number, both from the same `pecasNoInstante(t)` in the same frame. Zero animation under `prefers-reduced-motion` — WCAG 2.3.3, read from the system and never from a menu of ours. |
| ⬜ Still owed | The **sonar** on a remappable binding rather than `Alt+S`; a merge **flash**; Libras; and a run on real school hardware. |

**Verified**: `npm run validate` green — typecheck clean, **137 assertions** across node and browser, build
passing, and the axe gate reporting zero WCAG A/AA violations with no exclusions. A full round played in a
real browser: 222 moves to a stuck board, largest tile 256, HUD in step with the model.

## Which record declares it

**ADR-0073**, in the engine's `docs/2-Architecture/adr/`. It records the address `the-inclusionist/pixi-2048`
declared by the Dev on 2026-09-05, and suspends ADR-0068 §1's `the-inclusionist-game-<slug>` naming pattern.

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
| A game outside the engine repository had **no way to register its own strings**: locales arrive through an `import.meta.glob` resolved in the engine's build, against the engine's folder, and `DICTS` is module-private. The chess game had paid for this with a second i18n system, 383 lines of it. | `core/i18n` gained `registerDict()`, with a five-step resolution chain and a gate proven red first. |
| The engine **was not publishable**: `private: true`, `exports` pointing at raw `.ts`, `pixi.js` as a devDependency, and the panel CSS plus 18 font faces required by borrowed dialogs that no export named. | `tsconfig.pkg.json`, a real `exports` map with `types`, and `./style.css` + `./assets/*`. |
| Two **Vite-only constructs survived `tsc`** into the emitted package and would have failed — one of them *silently*, turning every non-Portuguese locale back into Portuguese. | Static locale loaders; `render/sprites` and `env.d.ts` excluded from the package; a gate that scans the shipped source. |

## Deviations, written down rather than buried

- **The arrow keys play; they do not read.** The APG `grid` pattern says arrows navigate between cells. Here
  pushing the board *is* the verb, and arrows that only read would leave the keyboard-only child unable to
  play — precisely the person the pattern exists to serve. **Shift + arrows** move the reading cursor
  instead, Tab is never hijacked, every move is summarised into the live region, and the engine's sonar
  answers "where is a merge" in one keystroke. See the header of `app/js/ui/board-dom.ts`.
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
