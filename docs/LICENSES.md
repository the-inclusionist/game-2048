# Licences and ownership

## This software

Licensed **AGPL-3.0-or-later**. The full text is in [`LICENSE`](../LICENSE).

Every source file carries one line and only one line:

```ts
// SPDX-License-Identifier: AGPL-3.0-or-later
```

**No copyright notice appears in any source file, and that is deliberate.** It matches the engine and the
chess game exactly, and it avoids asserting in code something the executive branch has not yet granted —
publication under AGPL is the object of a *requerimento*, not a decision of whoever wrote the code.

## Ownership

⚠️ **Economic ownership belongs to the MUNICÍPIO, not to the developer.** Software produced in the exercise
of one's duties belongs to the employer (Lei nº 9.609/1998, art. 4º), which is why AGPL publication is a
petition to the executive branch rather than a developer's call.

**That fact is stated HERE, and deliberately not in the package name.** ADR-0071 (engine, 2026-09-05) settled
that a scope names the container — `@the-inclusionist` — and ADR-0066 §2 had already decided that an ownership
claim belongs inside a repository rather than in a name, *because a name is read by strangers who will not
open the repository*. A scope named for the Prefeitura, published by a servidor before the ato, would be a
public claim on an institution's name.

The cost is worth stating: whoever reads only the dependency line learns nothing about the Município. That is
the price the engine accepted, and this file is where the fact lives instead.

⚠️ **AND THE TITLE IS ONLY CLEAN IF THE CODE IS OURS**, which is the whole reason this game is written from
the rules rather than forked. See *The 2048 lineage* below.

## Dependencies

| | Licence | Note |
|---|---|---|
| `@the-inclusionist/engine` | AGPL-3.0-or-later | Same owner. Installed from the registry (per ADR-0072) since 2026-09-06, and **pinned exactly to `8.0.0`** since 2026-09-11 — no caret, because a range would have accepted a release candidate. This repo is its second consumer, after the chess, and the first to consume it as a published package. |
| `pixi.js` 7.4.2 | MIT | Pinned to the engine's exact version — a second PixiJS in one page is a bug, not a fallback. |
| `vite`, `vitest`, `typescript`, `playwright` | MIT / Apache-2.0 | Build and test only; not shipped. |

## Art

Nothing in this game is a bitmap. The tiles, the board and the digits' surface are **procedural** — drawn at
run time from a palette and a role, through the engine's `render/canvas` helpers. This is the engine's "art
is data" rule (no PNG embedded in a game), and here it also happens to settle the licence question by
removing it: there is no third-party art to license, and no artist's Lei nº 9.610/1998 rights to respect,
because there is no drawn asset.

⚠️ The engine's own **fonts** are a different matter and are NOT ours: the 18 faces it ships (Atkinson
Hyperlegible, Andika, Lexend and the rest) are **SIL OFL 1.1**, and travel with the engine package.

## The 2048 lineage — read, credited, not copied

The genre is **Threes!** (Asher Vollmer & Greg Wohlwend, 2014), by way of **1024** and then **2048**
(Gabriele Cirulli, 2014), which is MIT and which nearly every later version descends from. Two of those
descendants were read as references for feature parity:

- [`DaoCloud/dao-2048`](https://github.com/DaoCloud/dao-2048) — MIT. Cirulli's game wrapped in Docker, nginx
  and Helm for Kubernetes demos.
- [`jrocha-io/esp-2048-game-css`](https://github.com/jrocha-io/esp-2048-game-css) — MIT. Another fork of the
  same trunk, HTML/CSS/JS.

**No code is copied from either, and no colour of the original palette is reused.**

The legal shape of that sentence, stated because this is municipally-owned software: **the rules of a game
are not protected by copyright — a particular implementation of them is.** Merging equal tiles on a 4×4 grid
is an idea and a system; the JavaScript that does it, and the visual design that dresses it, are expression.
MIT would in fact permit reuse with attribution, so this is not a licence obstacle being routed around — it
is a TITLE decision: what the Município owns should be, in whole, what the Município owns, with no
third-party author's rights layered inside it.

It is the same move made twice already in this project: the engine reimplemented
[Clarity](https://github.com/dissimulate/Clarity) rather than forking it, and the chess game reimplemented
`3D-Hartwig-chess-set` rather than forking it.

Credit is due and is given regardless, in [`CREDITS.md`](CREDITS.md) and in the README.

⚠️ **The name.** "2048" is the objective of the game and has become the name of the genre; the internal title
is **"2048 · Potência de 2"**, which says what it teaches. Neither reproduces Cirulli's visual identity, and
no logo, palette or layout of his is used.
