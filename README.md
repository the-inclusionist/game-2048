# 2048 · Potência de 2

A sliding-merge number puzzle for Brazilian public schools, built on
[The Inclusionist engine](https://github.com/the-inclusionist/the-inclusionist-engine) — accessible first,
at the engine's 320×180 pixel grid, offline as a PWA.

> ⚠️ **This repository has NOT been built yet.** It holds a licence, this README, an ownership statement and
> a CI caller, and no product code. The sentence you are reading is a debt with a due date: it becomes false
> on the day the first product commit lands, and removing it is part of that commit (ADR-0067 §3).

## Which record declares it

**ADR-0073**, in the engine's `docs/2-Architecture/adr/`. It records the address `the-inclusionist/pixi-2048`
declared by the Dev on 2026-09-05, and suspends ADR-0068 §1's `the-inclusionist-game-<slug>` naming pattern.

⚠️ **A game repository holds no `adr/` folder and never will** (ADR-0068 §5). The records — the ten
non-negotiable pillars, the accessibility contract, the licence posture — live in the engine and are
inherited. This repository states only what is its own: its art, its credits and its third-party terms.

## What has to exist before the first product commit

1. The seven fields of `core/contract` answered for a 4×4 grid — the FIRST `grid` topology in the project
   (the quiz gave `hotspots`, and ADR-0030 says the contract stops being a hypothesis at the second one).
2. The rules, written from scratch: slide, merge-once-per-move, seeded spawn. See **Origin** below.
3. The board as real DOM text over a PixiJS canvas, because pillar 2 says text always lives in the DOM.
4. `pt-BR`, `en-US` and neutral Latin-American `es` dictionaries, registered through the engine's
   `registerDict()`.

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
