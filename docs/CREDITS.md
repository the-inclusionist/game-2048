# Credits

The licence terms are in [`LICENSES.md`](LICENSES.md). This file is about attribution — who made what this
game stands on. Credit is owed even where nothing was copied, and this project has said so twice before.

## The game it descends from

**Threes!** — Asher Vollmer, Greg Wohlwend and Jimmy Hinson (2014). The mechanic starts here: a grid where
equal tiles merge when the board is tilted, and a new tile arrives after every move that changed something.

**1024** and then **2048** — Gabriele Cirulli (2014, MIT), which simplified the merge rule to powers of two
and made the genre what it is. Nearly every later version, including the two read here, descends from his.

**References read for feature parity**, both MIT and both forks of Cirulli's:
[`DaoCloud/dao-2048`](https://github.com/DaoCloud/dao-2048) and
[`jrocha-io/esp-2048-game-css`](https://github.com/jrocha-io/esp-2048-game-css).

⚠️ **Nothing was copied.** The rules were reimplemented from their description, for the reason explained in
[`LICENSES.md`](LICENSES.md): the Município's title should have no third-party author's rights inside it.
Reading a game to learn what it does is not the same as taking how it did it, and the difference is what
this paragraph exists to record honestly rather than quietly.

## The engine

[**The Inclusionist engine**](https://github.com/the-inclusionist/the-inclusionist-engine) —
AGPL-3.0-or-later, same owner. What this game gets without writing a line of it: the screen reader layer,
the sonar, the colour-vision filters, the remappable keyboard, the typography panel with its 18 faces, the
neural voice, and the seven-field contract that makes all of the above work for a genre the engine has never
seen.

## Fonts

All **SIL OFL 1.1**, shipped by the engine and served from this game's `public/vendor/`:

- **Atkinson Hyperlegible** and **Atkinson Hyperlegible Mono** — Braille Institute of America.
- **Andika** and **Lexend** — SIL International.
- Plus the remaining faces the engine's typography panel offers.

## Art

None third-party. Every tile, digit surface and board frame in this game is drawn procedurally at run time —
see [`LICENSES.md` § Art](LICENSES.md#art). There is no artist to credit here, and that is a fact about how
the game is built rather than an omission.

## Libraries

- **PixiJS** — MIT, © 2013–present Mathew Groves, Chad Engler. The renderer under the board.
