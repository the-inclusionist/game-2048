# Plan — game-2048: engine 8 ✅ → engine 9 ✅ → cartridge ✅ → engine 11 ✅ → Cloudflare ✅ → give the UI back to the engine ⬜

**Legend:** ✅ done · 🆕 newly possible (engine 9.0.0) · ⬜ not started · 🔴 defect · ⏸ waiting on Dev · 🚫 n/a

---

## Part one — adopting engine 8.0.0 ✅ COMPLETE (2026-09-11)

| Item | Commit | What landed |
|---|---|---|
| ✅ **A** — remappable sonar | `fb6604a` | `action1` with a word of its own; the pad's `aria-label`s translated; plus the `Ctrl+S` chord defect it exposed |
| ✅ **B** — truth in the docs | `5c4889a` | The AAA count pinned at 7; the CREDITS neural-voice claim corrected |
| ✅ **C** — reduced motion | `d668e85` | The 🧩 icon wrote `reducedMotion` while the tiles kept sliding — half a live control |
| ✅ **D** — the `<select>` | `ffb17a0` | Four visible rows from the engine's `linhasDoEixo`, correction axis only |

State: 174 assertions, typecheck clean, build passing, axe 0 WCAG A/AA with no exclusions, CI green.
Seven mutations proven red and restored byte-identical.

---

## Part 1.5 — Engine 9.0.0 shipped, and it already did three things this plan was waiting on

`latest` is **9.0.0**, and ✅ **this repository is on it since `080196d`**. Measured against the published tarball before upgrading:

| What | Status |
|---|---|
| ✅ **ADR-0142's `mount`/`unmount`** | **BUILT.** `mount(declaration, ganchos?)` and `unmount()` are on `Engine`. The plan listed this as engine work to wait for; it is done. |
| ✅ **`getPauseActs`** | **CLOSED** — the gap I reported in part one. The pause card's panels, including the **remapping screen**, become reachable by a `createGame` consumer. |
| ✅ **`setTemaDoJogador` / `setCorrecaoDoJogador`** | **CLOSED** — the other gap. The 🌗 and 🚥 icons can now mount in the bar. |
| ⬜ **`rmKeys` / `rm`** | **Still absent.** The calm-mode half is still unreachable, so part one's fix (`querMenosMovimento`) stands and the finding stays open. |
| ✅ **remapping** | **Not an engine gap after all** — reported as one in part one, corrected in G2. It was ours to mount, and now is. |
| ⬜ **§5's interim throws on 9.0.0** | 🔴 **New, found in G6.** ADR-0139 §5 prescribes a delegating declaration for the boot-ordering problem; engine 9.0.0 throws on a malformed declaration instead of reporting it, so a delegate with nothing mounted cannot boot. The record was written against 8.x. |
| ⬜ **`migrarEsquema` spreads nulls** | 🔴 **New, found in G4.** `KB_DEFAULTS` ships 42 `null` key lists; `saveKB` persists them; `migrarEsquema` does `[...teclas]` and throws inside `createGame`. Any consumer whose child uses the remap panel cannot boot again. Its parameter TYPE already forbids the nulls its own data ships. |
| ✅ **`initKeydown` for consumers** | 🎉 **CLOSED IN 11.0.0.** Measured by H11 2026-10-02: `createGame` now installs the capture-key router at `boot/create-game.js:3006` and `ui/menu-nav` installs the Escape chain router at `ui/menu-nav.js:494`. Both of our G2/G11 workarounds deleted; the engine does the routing for every consumer, pads and all. |
| ⬜ **the 🚥 READ door** | 🔴 **New gap, found in G1.** `setCorrecaoDoJogador` writes, but nothing lets a `createGame` consumer supply the value the icon reads (`players` is `Pick<ControlledPlayer,'ctrl'>`; `lerVisualGuardado` lives in the unmounted `render/viz-setters`). |

Also in 9.0.0: `setPauseActor` joins the game's half, and `problems`/`alcance` become **derived** — they
describe the mounted cartridge instead of whatever booted first.

⚠️ **`declines` is GAME-owned, and this supersedes the answer I derived.** The previous version of this plan
derived "split by member" from 8.0.0's implementation. Engine 9 settles it: `MetadeDoJogo` is
`Pick<CreateGameOptions, 'declaration' | … | 'declines' | 'getPauseActs' | 'setPauseActor' |
'setTemaDoJogador' | 'setCorrecaoDoJogador'>`, and its own comment says ADR-0139's split *"deixou `declines`,
`getPauseActs`, `setPauseActor`, `setTemaDoJogador` e `setCorrecaoDoJogador` de fora"*. The derivation was
marked `DERIVED HERE` precisely so it could be overruled by an implementation; it has been.

**Upgrade risk, measured:** `core/contract.d.ts` is **byte-identical** between 8 and 9 — no new mandatory
declaration field, unlike the 7→8 jump. `problems: readonly string[]` and `alcance: Alcance` keep their
declared shapes, so `motor.problems.length` still compiles. The new game-half fields are all optional.

### 🔴 And four claims we wrote in part one go stale the moment we upgrade

They were true against 8.0.0 and are false against 9.0.0. This repository's posture is that its claims are
gated, so they are work, not trivia:

- `app/index.html` — *"`createGame` passes neither, with no option for a consumer to supply them"*
- `app/js/boot/main.ts` — the same, beside the sonar
- `app/js/visual.ts` — the header explaining why only the correction axis is mounted
- `README.md` — the *Input as intent* row's caveat that the remapping screen is unreachable

---

## Part two — the cartridge conversion

### ⚠️ The order, and whose decision it is

`ADR-0068` §6 and the cartridge brief put **whackwhack** first. I raised it; **the Dev decided on
2026-09-11 that game-2048 goes now.** His record to set aside; recorded here rather than re-argued.

Going first means deriving what the records leave open. Items marked **`DERIVED HERE`** are ours to revisit
when whackwhack lands — and Part 1.5 is what that looks like in practice: one of the two derivations was
overruled by the engine within a day.

### The records

| Record | What it decides |
|---|---|
| **ADR-0139** | A cartridge supplies **half** of `CreateGameOptions` and **never calls `createGame`** |
| **ADR-0140** | Standalone **PWA** *and* **cartridge** from one source; supersedes ADR-0117 in part |
| **ADR-0141** | A cartridge **owns its random stream**; four `core/rng` imports forbidden |
| **ADR-0142** | ✅ built in engine 9.0.0 — see Part 1.5 |
| **ADR-0117** | The PWA is the **site**; the platform loads fonts, voices and runtime **once** |

### What was measured in THIS repository

| Blocker | Where | Status |
|---|---|---|
| ~~`createGame` is called by the game~~ | now `src/standalone.ts` only | ✅ `6805b11` |
| ~~Four module-level `let`~~ | `boot/main.ts` | ✅ `c95d52d` |
| ~~`import { reseed, rnd }`~~ | `boot/main.ts` | ✅ `e940c1b` |
| ~~README promises "offline as a PWA" with no SW or manifest~~ | `README.md:5` | ✅ `cf741a4` |
| ~~`new PIXI.Application` with no `autoStart: false`~~ | `boot/main.ts` | ✅ `c95d52d` |
| ~~`private: true`, no `exports`/`files`; deps~~ | `package.json` | ✅ `99dfd98` |
| ~~One build target~~ | `vite.config.ts` | ✅ `99dfd98` |

~~**What escapes our region**~~ — ✅ all three released by `teardown()` since `c95d52d`, and asserted by
`tests/factory.browser.test.ts`. ⚠️ One remains and it is the SHELL's: the `keydown` listener `boot.ts` adds
to the document to deliver a captured key (G2). It becomes the shell's to release in G6.

**Already correct:** keyboard on `#game-region`; no `location.search`; `spawn(board, rnd)` takes its
generator injected; `dt` in frames; `criarAnimador(relogio, …)` takes its **clock injected** — which is what
makes G3 a swap rather than a rewrite.

### Still open, and answered here

- **Seed policy — `DERIVED HERE`.** The shell owns the seed; the cartridge never reseeds. `novaRodada()`
  keeps drawing from `ctx.rng`. A new round continuing one stream is as random as a reseeded one, and it
  removes the forbidden call instead of reimplementing it privately.
- **`GameCtx`** — read off `cartridge-contract.md`: `engine`, `region`, `rng`, `t`, `params`. We use four;
  `params` goes unused because this game reads no query string.
- **`world()` returns a selector while the platform owns the region — `OPEN`.** Settle against the engine's
  resolution code in G4. Do not invent a second mechanism.

---

## The work, in order

Each step independently committable. Every new gate **born red with the mutation confirmed** first.

| | Step | Status |
|---|---|---|
| **G0** | **Engine 9.0.0**, pinned exactly, plus the claims it falsifies. Written out in full below. | ✅ `080196d` |
| **G1** | 🌗/🚥 icons: **MEASURED, NOT MOUNTABLE** — and the reasons are now gates. 🌗 is refused by arithmetic (`hc7` needs 49:1 between the extremes; the scale stops at 21 — impossible, not unbuilt). 🚥 is refused by a half-open door: 9.0.0 added the WRITE door, but the icon READS from `players`, typed «esquema de teclas e nada mais», so it would stick after one click. | ✅ `4c3a2e1` |
| **G1b** | 🆕 **Report the 🚥 read-door gap** to the Dev for the engine side — it is new, and distinct from the two gaps 9.0.0 closed. | ✅ reported |
| **G2** | **The remap panel is MOUNTED** (`⌨ Teclas`) — and not via `getPauseActs`. ⚠️ The part-one caveat blamed the wrong thing: remapping was never behind `getPauseActs`, nothing in the engine opens `settings-controls`, and it was mountable on engine 8. Second wall found and paid: `createGame` never calls `initKeydown`, so the captured key is delivered by one document listener of ours. Rebind measured end to end. | ✅ `a197677` |
| **G3** | **The README's PWA promise is true.** `vite-plugin-pwa` on the app build — `sw.js`, manifest (`lang: pt-BR`, `scope: ./`), 57 precache entries, 2.1 MB, and a **vector** icon so `LICENSES.md`'s no-drawn-asset claim survives. Gate is `scripts/pwa-check.mjs`, chained into `test:a11y` because that is the only post-build hook the shared workflow gives a game. | ✅ `cf741a4` |
| **G4** | **This game owns its stream.** `createRng` at boot; `novaRodada` no longer reseeds. Source-reading gate over all of `app/js`, born red on the real defect and proven to catch a reintroduction elsewhere. | ✅ `e940c1b` |
| **G4b** | 🔴 **Lockout fix, found while verifying G4** — a child who remapped a key could not open the game again. Engine defect (`migrarEsquema` spreads `null` key lists); `semNulos` stops us persisting them. Reported. | ✅ `af6f686` |
| **G5** | **The factory.** `bootar()` returns `{ motor, update, teardown }`; four module-level `let`s gone; `autoStart: false` with the SHELL running one loop and an error boundary; the animator fed by `criarRelogioDeQuadros`. Teardown releases the three escapes, its nodes and the WebGL context. 🔴 A gate caught that tearing down twice threw — now idempotent. | ✅ `c95d52d` |
| **G6** | **The split.** `src/index.ts` (cartridge, no `createGame`) + `src/standalone.ts` (shell). 🔴 ADR-0139 §5's delegating declaration does NOT boot on 9.0.0 — it throws on malformed — so the shell boots with an honest placeholder and uses `mount`. Declaration and hooks travel with the INSTANCE (`DERIVED HERE`). 🔴 `tsconfig` did not cover `src/`. | ✅ `6805b11` |
| **G7** | **Installable.** Peer + dev for engine and PixiJS (range vs exact pin), `exports`, `files` with the licence docs, `private` gone. `npm ci` + both builds verified; `npm pack` is 25 files / 125 kB. | ✅ `99dfd98` |
| **G8** | **Two targets.** app 587 kB (engine bundled, PWA) vs lib **19 kB** (engine external, no SW). `scripts/build-lib.mjs` also emits types and rewrites the `.ts` specifiers TypeScript 5.9.3 leaves in `.d.ts` re-exports. | ✅ `99dfd98` |
| **G9** | **CI builds BOTH** — ADR-0140 calls this *"not optional"*. Verified in the log for `99dfd98`, then gated: CI gives a game ONE build step whose inputs cannot be extended, so "both" is true only while `scripts.build` chains both — a simplification back to `vite build` would undo it and leave CI green. Four assertions, four mutations, four reds. | ✅ `10af2f7` |
| **G10** | 🔴 **Retired — WRONG DELIVERY ROUTE.** G10 was written as `npm publish` under the assumption the platform would npm-install the cartridge. The Dev's clarification 2026-10-02: the delivery is **Cloudflare Pages + R2 + a Router Worker** under `o-inclusionista.jrocha.dev.br/<slug>/*`, not npm. The G7 preparation (`publishConfig.access: public`, version off `0.0.0`, `inclusionist-check-cartridge` green) stays valuable — it keeps the cartridge library installable for a future platform that chooses npm, and it is what the engine's own checker reads — but **no `npm publish` is to be run** for this cartridge. See Part Four for the real delivery track. | ⏸ (retired) |
| **G11** | 🔴 **The board did not fit on the screen.** Found by the Dev, 2026-09-12. `<main>` is a flex column with `overflow: hidden` and `#stage-wrap` is its only flexible item, so the always-open «Correção de cor» panel (311 px) squeezed the stage: 103 px of the board cut off on a 1280×800 laptop, 113 px at 800×600, 119 px at 1024×768, the wrapper collapsed to **zero** at 570×415 — and the page does not scroll, so none of it was reachable. The rows moved behind `🚥 Correção de cor`, the same overlay shape `⌨ Teclas` uses. Two more repaired on the way: **Escape closed none of the three panels** (the engine’s keydown router is never installed for a consumer, so every `inEscapeChain: true` declared into a chain nobody walked), and the **44 px touch floor** was missing from two panels (`var(--tap)` is out of scope outside `#game-region`). New gate `scripts/layout-check.mjs` on four real screens, chained into `test:a11y`; four source assertions, four mutations. 🔴 Two gates were WRONG when first written and the mutations caught it — one matched its own explanatory comment, the other a different call site. 📏 Known boundary written into the gate: below ~500 px viewport height the stage is still clipped, because `ui/layout` holds k=2 instead of stepping to k=1 — not this game’s. | ✅ `ef48a40` |

---

## G0 in full — everything needed to run on engine 9.0.0 ✅ DONE (`080196d`)

> Landed 2026-09-11, pushed. The measurement held exactly: the pin was the only code change, nothing needed
> editing to compile, and 174 assertions passed unchanged. G0.1–G0.4 done; G0.5's historical lines left
> alone as planned.

### What the upgrade actually costs, measured against the published tarball

| Measurement | Result |
|---|---|
| Modules we import whose `.d.ts` changed | **exactly one** — `boot/create-game.d.ts`. The other thirteen (`core/*`, `input/touch`, `platform/storage`, `render/*`, `ui/*`) are **byte-identical** |
| Removals from `create-game.d.ts` | **none** — the diff is **purely additive** |
| `core/contract.d.ts` | **byte-identical.** No new mandatory declaration field, unlike the 7→8 jump that added `holdsAtOnce` and `seguraTeclas` |
| `problems` / `alcance` | declared shapes unchanged (`readonly string[]`, `Alcance`), so `motor.problems.length` still compiles |
| `pixi.js` | still peer-pinned to `7.4.2`, which is what we already have |

**So the code change required to run on 9.0.0 is: the pin.** Everything else in G0 is claims that stop being
true — which in this repository is work, not bookkeeping.

### G0.1 · The pin

```bash
npm install --save-exact @the-inclusionist/engine@9.0.0
```

Exact, no caret — the same reasoning as 8.0.0: a range would have accepted `8.0.0-rc.2`, and the `rc` tag is
still published today.

### G0.2 · Verify before believing

`npm run typecheck && npx vitest run` (expect **174** unchanged), `npm run build`, the axe gate, then CI.
⚠️ Nothing here should need editing; if something does, the "purely additive" measurement above was wrong and
the finding matters more than the upgrade.

### G0.3 · Current-state claims that must move

| File | Claim | Becomes |
|---|---|---|
| `package.json:64` | `"@the-inclusionist/engine": "8.0.0"` | `9.0.0` |
| `docs/LICENSES.md:39` | *"pinned exactly to `8.0.0`"* | `9.0.0`, keeping the no-caret reasoning |
| `README.md:27` | *"Verified on engine 8.0.0, pinned exactly"* | `9.0.0`, with the re-run numbers |

### G0.4 · 🔴 Four claims whose REASON 9.0.0 falsifies

Each says the engine offers no door. Each door now exists. They are not cosmetic: they are the stated
justification for controls this game hand-rolls, and leaving them is arguing against our own code.

| File | The now-false sentence |
|---|---|
| `README.md:24` | *"The screen that WRITES a remapping is not reachable from this game: `CreateGameOptions` has no `getPauseActs`"* |
| `app/index.html` (the `.p2-tools` block) | *"the contrast icon needs `setTemaDoJogador`, the colour-vision icon needs `setCorrecaoDoJogador`, and `createGame` passes neither, with no option for a consumer to supply them"* |
| `app/js/boot/main.ts` (beside the sonar) | *"the child cannot REACH a remapping screen from this game … a field `CreateGameOptions` does not have"* |
| `app/js/visual.ts` (header) | the whole argument for mounting only the correction axis — *"whose context asks for ~34 fields of a PixiJS render graph this game does not have"* |

⚠️ **Correct them by saying what changed, not by deleting them.** Each records a real finding of part one
that was true against 8.0.0; the honest edit adds "and 9.0.0 opened the door", so the reader learns the
history rather than meeting a silent reversal.

📌 **And G0.4 is what turns G1 and G2 from ideas into obligations.** Once the code stops claiming the doors
are shut, a control that is still hand-rolled needs a *current* reason — which is exactly what G1 and G2
supply or retire.

### G0.5 · What must NOT be touched, and why

Every other `8.0.0` in the repository is a **historical** statement — *"since engine 8.0.0"*, *"until engine
8.0.0"*, *"required by the contract since engine 8.0.0"*, in `main.ts`, `declaration.ts`, `animation.ts`,
`visual.ts`, `index.html`, `README.md:23` and `docs/CREDITS.md:28`. They say when something changed and stay
true for ever.

The ADR README names this exact trap: *"RENOMEAR FICHEIRO NÃO É ERRATA … perseguir um rename por nove
registros aceitos é nove edições no lugar para manter prosa em dia com um refactor — a churn que esta regra
existe para impedir."* The test it gives is whether **the sentence still governs**, not whether the number is
current. Sweeping them would be that churn, and it would erase the dates that make the history readable.

---

## Not ours, and not to be invented

- **The engine's remaining gap:** `rmKeys`/`rm` are still absent, so the calm-mode half stays unreachable.
  Reported, not patched. Nothing is written in the engine repository without the Dev's authorisation.
- **Records.** A game repository holds no `adr/` folder, ever (ADR-0068 §5).

## Verification

```bash
npm run typecheck && npx vitest run
```

```bash
npm run build
```

```bash
AXE_URL=http://localhost:8197/ npm run test:a11y
```

- Both build targets, every time, from G8 onward.
- CI green on push (`gh run list`) — where the axe gate runs without my machine.
- ⚠️ Browser checks need the pane **visible**: a hidden pane freezes `rAF`, and G5 is precisely about who
  drives frames. Measure through the game's own counters, never by eye — and note `__incl2048` is one of the
  globals G5 removes, so those checks move to what the shell exposes.

---

## Part three — adopting engine 11.0.0 (jumping 10)

### Context

Engine **10.0.0** (26 breaking notes CC–DE) and **11.0.0** (18 notes DF–EB) landed between 2026-09-14 and
2026-09-27, three weeks after this plan's Part Two closed. The engine itself has no 9→11 migration guide and
no 10→11 one; the per-note tables in `the-inclusionist-engine/docs/6-DevOps-SRE/Breaking-Changes.md` are
what a game follows. This section is the 2048's walk through them.

**Measured against this repository's imports (`src/standalone.ts` + `app/js/**`)** — not inferred from the
changelog alone:

| What changed | Shape |
|---|---|
| **The whole public surface is in English** (10.0.0 notes CI–CN) | `Correcao→Correction`, `Desenho→Drawing`, `ROTULO_DA_CORRECAO→CORRECTION_LABEL`, `linhasDoEixo→axisRows`, `escolhaDoBotao→buttonChoice`, `lerCenaGuardada→readStoredScene`, `fabricaComOJogo→factoryWithGame`, `GanchosDoCartucho→CartridgeHooks`, `motor.cenas→motor.scenes`, `motor.pausa→motor.pause`, `motor.alcance→motor.reach`, `motor.aoFalhar→motor.onFailure` |
| **`core/i18n` module-level `t`/`registerDict`/`setLocale` are GONE** (10.0.0 CV + 11.0.0 DN) | `engine.t`, `engine.setLocale()`, `createTranslator(port?)`; a game's words move into `CreateGameOptions.dictionaries` and become **keys** (`labelKey`, `hintKey`, `textKey`, `nameKey`) |
| **`core/a11y-sr` `srSay`/`srAlert` are GONE** (10.0.0 CY) | `engine.say(text)` / `engine.alert(text)`; `createAnnouncer({doc, raf})` for pre-engine boot failures |
| **`platform/storage` module-level API is GONE** (10.0.0 CT) | `createStorage(backend)`; under `createGame` the root builds it from `host.storage` and injects it everywhere |
| **`input/keyboard` module-level `kb`/`initKB`/`setKB`/`resetKB` are GONE** (10.0.0 DA) | `Engine.keyboardConfig: KeyboardConfigApi` with `.kb()`, `.set`, `.save`, `.reset`, `.factoryWithGame()` |
| **`declines` field renames** (10.0.0 CN) | `semVozNeural→noNeuralVoice`, `semAtorDePausa→noPauseActor`; `semAssistenteDePad` **retires with no replacement** (ADR-0231) |
| **`baixarPesados→downloadHeavy`** (10.0.0 CN) | plus `aoProgredirPesados→onHeavyProgress` |
| **`uses: { reading?, neuralVoice?, fonts? }` is NEW** (11.0.0 DW) | replaces `carregarVozNeural`; opt-in for neural voice (`uses.neuralVoice: true`) and library fonts. 2048 declines neural, so `declines.noNeuralVoice: true` suffices — no `uses.neuralVoice` |
| **`accommodations: AccommodationAnswers` is REQUIRED** (10.0.0 CN, erratum of ADR-0153) | 56 known accommodations; a game lists its answers as `{ [name]: AccommodationKeys \| false }`; GAME_KEYED entries not declared are not mounted |
| **`GameDeclaration` shape** (11.0.0 CI/DU) | `seguraTeclas → holdsKeys()`; `focusOf`/`objectiveOf`/`targetsOf` take `playerIndex`; new optional `needsPointer`, `keyboardMapping`, `padMapping`. ⚠️ `wizardClosed`/`oneButtonOnly`/`borrow`/`underCursor`/`choose` are NOT on `GameDeclaration` — they are required on types we never double (`GamepadCtx`, `VoiceControlDeps`, `VoiceControl`, `MenuNavApi`, `Reading`). An earlier read of mine confused these; nothing to add to `declaration.ts` beyond the two renames and the `playerIndex` widening |
| **Fonts leave the package** (11.0.0 DW) | 19 free faces still mounted by the engine itself (incl. Atkinson Hyperlegible — the one this game uses). Only LIBRARY faces need declaring. 2048 uses no library face, so `uses.fonts` stays absent and `scripts/copy-engine-assets.mjs` + the `/vendor/fonts.css` link + its PWA precache entry all become dead code |
| **Two build commands** (ADR-0253, 11.0.0 DV) | `vite build` → app; `vite build --mode cartridge` → `dist-lib/cartridge.js` + `.d.ts`. `defineGameBuild({ cartridge: 'src/index.ts', config })` from `@the-inclusionist/engine/build` replaces the whole `scripts/build-lib.mjs`. **Measured 2026-09-27**: this is the engine's own call, and the shared CI runs both commands plus `inclusionist-check-cartridge` — the hand-rolled build-lib and its gate (G8/G9) retire |
| **The cartridge's default export is read at import** (11.0.0 DV) | `inclusionist-check-cartridge` imports the built entry, reads `{ slug, declaration, hooks, create }` off its DEFAULT export, hands `declaration` and `hooks` to the engine's own `cartridgeRefusals`. Current `export const cartridge = …` becomes `export default` |
| **Deaf mode, not Libras** (11.0.0 DG + DO) | `engine.libras → engine.deafMode` (rename only); the VLibras Unity player leaves the engine, replaced by the free `createLibrasAvatarInterpreter`. This game loads no Libras player; the renames are prose only (README, `scripts/axe-check.mjs:17`) |
| **Sonar reads screen text; a canvas world adds a `problems` line** (11.0.0 DM) | 2048's PixiJS canvas inside `#game-region` will trigger this line in `engine.problems`. The sonar still works (navigation sentence); the line is a known-cost finding, not a defect in us |

### What SURVIVES, measured

- `motor.mount(declaration, hooks?)` / `motor.unmount()` / NEW `motor.dispose()` — same semantics; the G6
  design stands.
- `motor.overlays.register`/`escapeTarget`/`closeById`/`restoreFocus`/`frontOverlay` — signatures
  **unchanged**; the Escape routing from G11 keeps working.
- **ADR-0139 §5 interim still throws** on a malformed declaration. The record is unchanged (status `accepted`,
  `superseded-in-part` for `sonarPlayers` only). Our `semJogoAinda` placeholder + `motor.mount()` strategy
  remains the fix.
- `createRng`, `type Rng`, `padPxPerMm`, `VIZ_FILTER`, the `core/actions.js` exports (`isAction`,
  `labellerFrom`, `presetActions`, `type Action`, `type ActionPreset`) — all unchanged in signature.

### Standing rules

- **Nothing in the engine repository without the Dev's authorisation** — this is a game session; even reading
  the engine's dist-pkg to measure a `.d.ts` is read-only.
- **In this session's prose, pt-BR only in i18n content**; everything else in English (plan file included).
- **Each gate born red with the mutation confirmed before green counts.**
- **Commits are mine, pushes are the Dev's.**

### The order

Each H is independently committable. The expensive mechanical pass (H1 English rename) comes BEFORE the
semantic changes (H2–H5) because every semantic change touches the renamed names.

| | Step | Status |
|---|---|---|
| **H0** | **Pin and measure.** `npm install --save-exact @the-inclusionist/engine@11.0.0` + restore the `^` on the peer. Measured 2026-10-02: 52 compile errors across 11 files — above the predicted ~30. The gap is sub-enumeration, not surprise: four groups fell through the H0 list (viz-axes 4 renames, preset keys 12, settings-controls/typo signature changes, `migrarEsquema` removed from `vocabulary-migration` — 🆕 the whole `semNulos` workaround from G4b may now retire). All of them absorbed by H1/H2/H6/H11 without reshape. 📏 Also measured: `saveKB` still exported with new `(store, kb)` signature; `factoryWithGame` (ex-`fabricaComOJogo`) now requires `mapping`. ⚠️ `--save-exact` quietly dropped the caret from the PEER too — restored to `^11.0.0`, or G7's pin-shape gate goes red for a reason unrelated to the migration. One new transitive on the installed graph: `three@0.186.1`, the engine's declared dependency since ADR-0234 (free Libras avatar; never loaded here). | ✅ `H0` |
| **H1** | **The English rename, mechanical pass.** Three sed passes across 15 `.ts` files + one hand edit (`cartridge-types.ts` had a self-reference after the sweep). 17 renames: identifier (type and value), plus the two `AxisChoice` field renames (`.eixo→.axis`, `.valor→.value`), the two `HowItApplies` fields (`.filtro→.filter`, `.direto→.direct`), the one `Scene` literal field (`.nome→.name`), the `Engine` field reads (`motor.cenas→.scenes` etc.). 📏 Measured 52→36 compile errors; remaining 36 all belong to H2/H3/H4/H6/H11 and are the semantic residues the plan expects. ⚠️ The sed over-swept twice: once on DOM dataset selectors (`[data-eixo][data-valor]` reverted to the engine's own HTML contract per note CM — the engine still writes them that way, measured in `render/viz-axes-labels.js:65`), once on self-reference in `cartridge-types.ts` (`type CartridgeHooks = CartridgeHooks` → just the import). Forward gate: `tests/english-rename.node.test.ts` (18 assertions, 17 identifier + 1 DOM-contract revert sentinel), born red on `Correction → Correcao` in `src/standalone.ts`, restored byte-identical. Comments are stripped before measurement, same trick G11 learned, so historical sentences like «before 10.0.0 the engine named this `GanchosDoCartucho`» stay. | ✅ `H1` |
| **H2** | **i18n moves into `CreateGameOptions.dictionaries`.** `app/js/i18n/index.ts` deleted (dead after `registerDict` left the engine); the three pt/en/es dicts stay as data imported straight into `src/index.ts`. `cartridge.dicts` → `cartridge.dictionaries`. `criarPreset(t)` → `criarPreset()` returns keys (`labelKey`/`hintKey`); `acoesComRotulo(word)` takes a `(key) => string \| null` reader. Shell announces through `motor.say`/`motor.alert`/`motor.t`; `boot/main.ts` keeps local `srSay`/`srAlert`/`t` names sourced from `ctx.engine`. **Measured 36 → 11 compile errors**, all H3/H6/H11 territory. 📊 New gate: `tests/factory.browser.test.ts > H2 — a setLocale reaches every drawn label at once` — asserts the grid cell's `aria-label` differs between pt and en and returns to pt on switch-back. Can only RUN after H6 lets `standalone.ts` compile; the assertion is in place and will be verified then. 🆕 Also absorbed: the GAME_KEYED half of H4 — the engine's `AccommodationAnswers` type requires all 18 entries, so `app/js/declaration.ts` exports `RESPOSTAS_DAS_ACOMODACOES` with every one set to `false` (2048 has no camera, no character, no cards, no text, no timing). H4 only needs to confirm the GENERAL/CONTRACT_KEYED derivation is right. 232 of 233 node tests green; the one red is `migrarEsquema` import, pure H11. | ✅ `H2` |
| **H3** | **`declines` renames; `semAssistenteDePad` retires; `baixarPesados → downloadHeavy`.** `src/standalone.ts`: `semAtorDePausa → noPauseActor`, `semVozNeural → noNeuralVoice`, `baixarPesados → downloadHeavy`; `semAssistenteDePad` deleted outright (ADR-0231 note CQ — the field had no reader for several releases). 📌 The 2026-09-11 reasoning paragraphs stay — they describe why the game declines, not what the keys are called. ⚠️ The `tests/factory.browser.test.ts` inline shell had already been migrated in H2, so H3 only touches the production shell. Forward gate: `tests/neural-voice-decision.node.test.ts`, 5 assertions. Born red on TWO mutations: `noNeuralVoice: true → false` (silent re-enablement of neural voice) and a sneak-in of `uses: { neuralVoice: true }` beside the decline (the costly combo the gate was written for — engine loads 371 MB of Kokoro while the game still refuses to speak with it). Both reds, both restored byte-identical. +238 node assertions green; the one red remains `migrarEsquema` for H11. | ✅ `H3` |
| **H4** | **`accommodations` becomes REQUIRED.** 📏 Measured: the engine's `AccommodationAnswers` is a FULL record of the 18 GAME_KEYED names (`cameraSway`, `easyMode`, `wheelchairMode`, `detectionLeniency`, `intensity`, `hints`, `reducedCharacterMotion`, `caneSpacing`, `textPace`, `lexicalDifficulty`, `wordHighlight`, `pieceSets`, `distinguishableSuits`, `timingWindow`, `aimAssist`, `repeatedInput`, `ownerColors`, `contrastOutlines`), not a Partial — so H2 had to deliver the whole thing to compile. `RESPOSTAS_DAS_ACOMODACOES` in `app/js/declaration.ts` answers every one with `false` (2048 has no camera, no character, no cards, no text, no timing). Re-exported from `src/index.ts` as `accommodations`; passed to `createGame({accommodations})` from the shell + the factory test, and to `CartridgeHooks.accommodations` from `boot/main.ts`. 📌 The 13 GENERAL/CONTRACT_KEYED entries the plan listed (`typography`, `narration`, etc.) are derived by the engine from the declaration (`core/accommodations.CONTRACT_KEYED`); the game never declares them. The behaviour gate («mounted icons ≥ declared answers») requires `#p2-a11y` population at boot, so it is deferred until H6 lets the browser project run. | ✅ `H2+H4` |
| **H5** | **`GameDeclaration` shape.** `seguraTeclas → holdsKeys` was done in H1's sed. `focusOf`/`objectiveOf`/`targetsOf` widened to accept `playerIndex: number` and ignore it (2048 is single-player; the engine passes seat 0 to every call). `semJogoAinda` placeholders in `src/standalone.ts` and `tests/factory.browser.test.ts` already use the arrow-function form `() => ...` which TS accepts as assignable to `(x: number) => ...`. 21 of 21 `tests/declaration.node.test.ts` assertions green. ✅ `wizardClosed`/`oneButtonOnly`/`borrow`/`underCursor`/`choose` are NOT on `GameDeclaration` — the typecheck would have flagged them otherwise; they live on `GamepadCtx`/`VoiceControlDeps`/`VoiceControl`/`MenuNavApi`/`Reading`, none of which we double. | ✅ `H5` |
| **H6** | **`createStorage` + `Engine.keyboardConfig` + `createLayout` + `readStoredScene` signature + `onLocaleChange` wiring.** The big one. 📏 Measured 11 → 1 compile errors; the lone red is H11's `migrarEsquema`. ⚙️ `platform/storage` module-level API is gone (note CT): `createStorage(win.localStorage)` builds a `Store` in both `boot/main.ts` and `src/standalone.ts`, same `localStorage` backend as the engine root. ⚙️ `input/keyboard` module API (note DA): `kb`, `resetKB`, `setKB` gone from the module; the shell reads `motor.keyboardConfig.kb()`/`.set`/`.save`/`.reset`/`.factoryWithGame()`. The `semNulos` wrap moves from `saveKB(semNulos(…))` to `motor.keyboardConfig.save(semNulos(…))`. ⚙️ `ui/layout`: `initLayout`/`layout` → `createLayout({doc, win, numPlayers, afterScale: () => motor.crt.scanVars()})`. ⚙️ `ui/motion-scene.readStoredScene(store, reducedByDefault)` — both args now required (note CS). 🔴 **AND THE H2 GATE BURNT WHEN WE RAN IT**: grid cells carried `aria-label` set with resolved words at build time, so `setLocale('en')` left the labels Portuguese — exactly the defect ADR-0232 D3's erratum describes. Hooked `motor.onLocaleChange(() => desenhar())` into `app/js/boot/main.ts` with the teardown guard; the gate passes. Also fixed: `tests/announcement.browser.test.ts` now hands `createTranslator` a memory `LocalePort` because 11 refuses `setLocale` on a rootless translator (ADR-0178). **260 of 261 assertions green** across both projects; the one red stays `migrarEsquema` for H11. | ✅ `H6` |
| **H7** | **The fonts copy pipeline survives — the plan's premise was wrong.** 📏 Measured 2026-10-02: engine 11.0.0 ships `app/public/vendor/fonts.css` + 29 `.woff2` files inside the published tarball (confirmed in `engine.package.json.files`) but does NOT expose them through `exports`, and does NOT write runtime `@font-face` rules for Atkinson Hyperlegible / Andika / Lexend / Atkinson Hyperlegible Mono. The plan's belief that «the engine mounts its own faces now» was wrong — the panel reads the LIBRARY (`fontInstalled`), not the four free faces. Each consumer self-hosts them, and deleting our pipeline would silently lose Atkinson on pillar 1. ⚙️ **Done:** `scripts/copy-engine-assets.mjs` resolves the engine root through `require.resolve('@the-inclusionist/engine/package.json')` (the one specifier Node always honours regardless of `exports`) and reads from `app/public/vendor/`. HTML link, `includeAssets`, pwa-check font assertion ALL stay — they describe reality. 🔴 **Finding reported, not patched:** the engine should either expose `./app/public/vendor/*` through `exports` or write the four free-face `@font-face` rules at runtime; nothing is written to the engine from this session. ✅ Build 2942 KiB precache, 48 entries, dist-lib 19.70 kB; `pwa-check` green. | ✅ `H7` |
| **H8** | **`defineGameBuild` replaces `scripts/build-lib.mjs`.** `vite.config.ts` collapses to `export default defineGameBuild({ cartridge: 'src/index.ts', config: <app config> })` + the vitest `test` field. `scripts/build-lib.mjs` deleted. `package.json` scripts: `build` chains both `vite build && vite build --mode cartridge`; `build:lib` → `vite build --mode cartridge`; `prepack` → `vite build --mode cartridge`. The output filename changed from `index.js` to `cartridge.js` (the engine's `CARTRIDGE_FILE` constant), so `package.json`'s `main`/`types`/`exports["."]` moved from `./dist-lib/index.js` + `./dist-lib/src/index.d.ts` to `./dist-lib/cartridge.js` + `./dist-lib/cartridge.d.ts`. `optimizeDeps.exclude` dropped (out of date since H6). G9 gate reshaped: now asserts `scripts.build` chains both targets with the English `--mode cartridge` spelling. 📊 Verified: app build 2942 KiB precache / 48 entries; cartridge **19.70 kB**, engine externalised (5 bare specifiers in `dist-lib/cartridge.js`), zero service-worker references. 237 of 238 node assertions green; only `migrarEsquema` still red (H11). ⏸ `inclusionist-check-cartridge` reports two refusals (`declaration missing`, `accommodations missing`) — those are H9's shape of the default export, not H8's business; the checker is NOT yet chained into `test:a11y`. | ✅ `H8` |
| **H9** | **Default export + `inclusionist-check-cartridge`.** `src/index.ts` default-exports a `Cartridge` with `{slug, declaration, hooks, dictionaries, create}` — the shape ADR-0139 §2 names and the checker reads. The placeholder declaration (10 well-formed functions saying «there is no game yet») moved from the shell into the cartridge; `semJogoAinda` deleted from both `src/standalone.ts` and `tests/factory.browser.test.ts`, which now boot with `declaration: cartridge.declaration, ...cartridge.hooks`. The `Cartridge` type widened: `declaration` and `hooks` are REQUIRED now; `dictionaries` kept at the top level as an alias into `hooks.dictionaries` (same object). ⚠️ `inclusionist-check-cartridge` chained into `test:a11y` between `layout-check` and `axe-check` via its direct `node_modules` path (npx was blocked locally; CI resolves the bin fine either way). ✅ Checker passes end-to-end. 📊 **Three gates born red:** (a) slug mutation `game-2048 → game-pinball` already caught by the ADR-0082 §1 gate; (b) `hooks.preset: criarPreset() → null as never` caught by the new `[Zero] 🔴 hooks.preset names every position` assertion; (c) a declaration-shape probe assertion for the ten template members. All three green on real source, all red on their mutations, all restored byte-identical. **264 of 265** full-suite assertions green; the lone red remains `migrarEsquema` (H11). | ✅ `H9` |
| **H10** | **Deaf-mode naming sweep.** Six files, no runtime behaviour touched. `scripts/axe-check.mjs:17` + `README.md:20`: VLibras-widget caveats extended to say the Unity player left in 11.0.0 (DO) and the free `ui/libras-avatar-player` took its place; the «0 exclusions» claim stays true (we load neither). `app/js/geometry.ts:11`, `app/js/ui/board-dom.ts:5`, `app/js/ui/tiles-layer.ts:19`: «VLibras translates TEXT» → «the Libras avatar player signs TEXT», pointing at the current engine module. `app/js/boot/main.ts:15`: the «Libras mirror» announcement path (note DG retired it — the deaf-mode interpreter signs what the sonar finds, not an announcement queue) is explicitly recorded as retired. 🆕 Also fixed: `isNavigable?.(0)` → `isNavigable?.()` in the H9 cartridge gate (the engine's type is `() => boolean`, 0 args). 264 of 265 full-suite assertions green; one red stays `migrarEsquema` (H11). | ✅ `H10` |
| **H11** | **Re-measure the three C-bucket behaviours.** Three answers, all landed in this one commit (the three probes are source-level reads, not browser runs):<br>**(1) ✅ `createGame` installs the keydown router now.** Capture-key at `boot/create-game.js:3006` (window + capture phase, calls `handleCaptureKeydown`); Escape chain at `ui/menu-nav.js:494` (`menuNavKey` walks `escapeTarget` + `closeById`). The shell's two document-level listeners from G2/G11 (`aoCapturar`, `aoEscapar`) deleted — double delivery, the engine's `stopPropagation` on `win` would have blocked ours on `document` anyway. G11 gate reshaped: now asserts (a) every registered overlay carries `inEscapeChain: true`, and (b) the shell does NOT install its own keydown listener. The two walls G2/G11 paid 2026-09-11 are both built.<br>**(2) ✅ webgazer gone (ADR-0214).** Measured 2026-10-02: `node_modules/.../dist-pkg` carries one mention of «webgazer» and it is historical prose inside `platform/heavy-catalogue.js:14`. The paragraph in `src/standalone.ts` was rewritten to say the engine closed its half; `downloadHeavy: false` keeps the ONNX precache reason.<br>**(3) ⬜ `migrarEsquema → migrateScheme` is a rename, NOT a fix.** The engine's `KB_DEFAULTS` still carries 42 nulls (6 fields × `UNREACHABLE_ON_A_SHARED_KEYBOARD`), and `migrateScheme` at `vocabulary-migration.js:103` still does `[...keys]` with no null guard. `tests/keyboard-save.node.test.ts` imports renamed to `migrateScheme`; the «throws on null» assertion still proves the defect. `semNulos` STAYS. Finding reported, not patched (engine's call). | ✅ `H11` |
| **H12** | **The stale-prose sweep.** Surgical, not blanket — the ADR README's own rule says historical sentences («since engine 8.0.0», «against 9.0.0») stay. Rewrites applied only where a sentence stated a current claim that 10.x/11.0.0 falsified:<br>**README.md**: the i18n row (`registerDict` → `CreateGameOptions.dictionaries`); the a11y-bar row (`seguraTeclas` → `holdsKeys`); the cartridge row (`{slug, dicts, create}` → `{slug, declaration, hooks, dictionaries, create}` default-exported, with the H9 shape); the Found/Fixed row for `registerDict` extended with 11.0.0's closing of the door.<br>**app/index.html**: the 🌗/🚥 block updated for `setTemaDoJogador → setPlayerTheme` / `setCorrecaoDoJogador → setPlayerCorrection` (note CN), with H11's remeasurement of the 🚥 read gap preserved.<br>**app/js/visual.ts** header: the two expired paragraphs renamed to the English setters.<br>**app/js/cartridge-types.ts**: the «declaration IS AN ADDITION — DERIVED HERE» paragraph rewritten to say the derivation was overruled by H9 (declaration + hooks ride on both the cartridge AND the instance now). Header updated with the second overruled derivation.<br>**Everything else kept as history** per the ADR README trap: version-anchored sentences describing WHEN something changed are still true forever. 📊 0 typecheck errors; 265 of 265 full-suite assertions green (unchanged — this commit touches prose only). | ✅ `H12` |

### H0 in full — the pin and the measurement

```bash
npm install --save-exact @the-inclusionist/engine@11.0.0
```

Peer in `package.json` to `^11.0.0`. Then — not in a loop, not via a script:

```bash
npm run typecheck 2>&1 | tee H0-typecheck.log
```

Expect ~30 lines, every one of them one of these three identifiers: `registerDict`, `t`, `baixarPesados`,
`semAssistenteDePad`, `semVozNeural`, `semAtorDePausa`, `srAlert`, `srSay`, `Correcao`, `ROTULO_DA_CORRECAO`,
`linhasDoEixo`, `escolhaDoBotao`, `Desenho`, `GanchosDoCartucho`, `fabricaComOJogo`, `kb`, `resetKB`, `saveKB`,
`setKB`, `lerCenaGuardada`, `initLayout`, `cenas`, `pausa`, `alcance`. Anything OUTSIDE that list is a measurement
error on my part and needs reading before anything is renamed. ⚠️ If `scripts/copy-engine-assets.mjs:20` fires
on `npm install` through its `predev`/`prebuild` hooks, it dies with "Cannot find module
`@the-inclusionist/engine/assets/vendor/fonts.css`" — expected. Move H7 before the next build if that happens.

### Open design calls (surface before touching code)

**🔴 One real one**, from 11.0.0 DM: the sonar's problems line for a `<canvas>` world. The 2048's PixiJS
canvas lives inside `#game-region`; after H0, `engine.problems` will carry *«the sonar cannot read this
game's screen: its world draws on a `<canvas>`…»*. Two paths:

- **Accept it.** The sonar keeps its navigation sentence (positional tone, pan, bearing), which is what it was
  doing already — the problems line is informational for someone reading `engine.problems`, not a failure. No
  code to write. The grid cells remain the accessible surface for a child using a screen reader.
- **Supply `host.interpreter`** (or `SonarCtx.screenText`). One function that reads the sixteen cells' labels
  and returns a sentence. This earns the sonar reading the live state ("2, 4, blank, 8, …"). Non-trivial but
  not large.

Default: **accept it, record the line as known-cost**. The second path is a separate work item worth doing
AFTER H10, not inside the migration.

### Not ours, deliberately not touched here

- The engine's own ADRs 0230/0232/0253/0255 and the EB sonar refactor — they're records of decisions already
  shipped; nothing in them asks a game to react beyond what the per-note tables above spell out.
- The 10.0.0 "receive the browser" sweep (notes CT, DA, DB, DC, DD) — these injectables are what `createGame`
  does for a game under its root. We go through `createGame`; we never hand-roll `createAudio`,
  `createKeyboardConfig`, `createCrt`, `createLqFilter`, `createHighContrast`, `createLayout`. If H1-H9 compiles,
  this layer is handled by the root.
- Nothing is written to `the-inclusionist-engine`.

### Verification — the H-tier

```bash
npm run typecheck && npx vitest run
```

```bash
npm run build && npm run build:lib
```

```bash
npx inclusionist-check-cartridge
```

```bash
AXE_URL=http://localhost:8197/ npm run test:a11y
```

- From **H8** onward, both `npm run build` and `npm run build:lib` must pass.
- From **H9** onward, `inclusionist-check-cartridge` runs in CI after every build (the shared workflow).
- All H-tier gates born red with their mutations before green counts.
- Nothing is pushed by me; every push is the Dev's.

---

## Part four — Cloudflare Pages delivery (replaces G10)

### Context

The user corrected the plan 2026-10-02: `npm publish` was the wrong deliverable. Every game ships through
**Cloudflare Pages + R2 + a Router Worker** under one origin — `o-inclusionista.jrocha.dev.br/<slug>/*` —
so the 1.2 GiB of heavy artefacts (voice, vision, recognition, reading) downloads **once per child**, not
per game (ADR-0117 + the `incl-pesados-v2` cache). 2048's share of that heavy is zero (it declines neural
voice, does not opt into reading), but the delivery shape has to match the catalogue's so this game installs
beside the others on the same origin.

**Measured against the catalogue's reference implementation (`game-platformer`, 2026-10-02) and against this
repository today:**

| Checklist item | 2048 state | What D-step does |
|---|---|---|
| `fetch()` / `Texture.from()` with relative paths | ✅ zero occurrences — the board is procedural | nothing (the 🔴 BASE_URL rule is a no-op here) |
| `<base href="/" />` in `app/index.html` | ⬜ absent | **D3** adds it |
| `vite.config.ts` with a configurable `base` | ⬜ absent | **D2** |
| `<link rel="stylesheet" href="/vendor/fonts.css">` is absolute-rooted | ⚠️ breaks under `/game-2048/` without `<base>` | fixed BY **D3** (the `<base>` lands it under the game subpath) |
| Preset keys (`act.up`, `.down`, `.left`, `.right`, `.sonar`, `.sonar.hint`) in pt/en/es | ✅ already present in `app/js/i18n/*.ts` | nothing — the pattern is satisfied by the H2 move into `CreateGameOptions.dictionaries` |
| `uses: { neuralVoice, reading }` | ✅ absent on purpose — 2048 declines neural voice (H3) and does not use reading | **D5** writes the choice down so a later reader finds the decision rather than the absence |
| `wrangler.toml` + `functions/heavy/[[path]].ts` + `scripts/post-build-cloudflare.mjs` + deploy workflow | ⬜ absent | **D1 / D7 / D8 / D9** |
| Platform-side: `game-2048` row in the Router Worker's `GAMES` table | ⬜ not yet added | **D10** — platform work, not this repo's commit |

### What this game does NOT need, by measurement

- **No `/heavy/*` proxy traffic.** 2048 declines neural voice, does not opt into reading, and uses only the
  engine's 19 free fonts (none of which touch `heavy/`). `functions/heavy/[[path]].ts` lands anyway for
  parity with the catalogue's shape — the function is cheap and a game that opts in later needs no
  structural change.
- **Nothing from the engine's «Pedido (C)».** The six engine-side asks the Dev raised 2026-10-02 (per-seat
  pause/HUD/settings-store, «sair» per seat, gamepad on title, `inclusionist-heavy --base` layout) all
  concern platform- and multi-seat behaviour. 2048 is single-player and declines the pause actor, so none
  of the six bear on this cartridge's delivery.

### Standing rules (unchanged)

- **Nothing in `the-inclusionist-engine` without the Dev's authorisation.**
- **Commits are mine, pushes are the Dev's.**
- **Each gate born red with the mutation confirmed before green counts** — same discipline as H-tier.

### The order

Each D is independently committable except where noted. **No deploy fires until the Dev decides.**

| | Step | Status |
|---|---|---|
| **D1** | **`wrangler.toml` at the repo root.** Cross-referenced against `game-platformer`'s file verbatim — same `compatibility_date`, same binding shape, same jurisdiction, slug/subpath substituted. Each explanatory paragraph adapted to 2048's shape (declines heavy, so the R2 binding is parity rather than active). Forward gate `tests/deploy-config.node.test.ts` with four assertions; three mutations proven red: `jurisdiction = "eu"` dropped, `INCL_BASE` pointing at a different game, slug typo. The 🔴 pitfall the Dev named by name (R2 bucket not found when `jurisdiction` is absent) is specifically pinned. | ✅ `D1` |
| **D2** | **`vite.config.ts` honours `INCL_BASE`.** Inside the `config` block of `defineGameBuild`: `base: process.env.INCL_BASE \|\| '/'` and `build.outDir = '../dist' + (process.env.INCL_BASE \|\| '').replace(/\/$/, '')` — the subpath lands on BOTH the resolved URLs and the output folder, matching `game-platformer`'s own vite config verbatim. 📏 Measured: a dev build (`INCL_BASE` unset) still lands in `dist/` and the delivery gate `pwa-check` is green; a prod build (`INCL_BASE=/game-2048/`) lands in `dist/game-2048/` with every absolute HTML reference correctly prefixed (`href="/game-2048/vendor/fonts.css"`, etc.). ⚠️ Windows pitfall: `INCL_BASE=/game-2048/ npm run build` under Git-Bash is mangled by MSYS2 into a Windows path; prepend `MSYS_NO_PATHCONV=1`. Linux CI unaffected. Two mutations proven red: `base` hardcoded to `'/'` and `outDir` hardcoded to `'../dist'`. | ✅ `D2` |
| **D3** | **`<base href="/" />` in `app/index.html`.** One line added in `<head>` before the first stylesheet; a block comment above records why it exists (the shared `incl-pesados-v2` cache lives at the origin root). The built HTML carries the tag verbatim. Gate asserts (a) the element is present, (b) it appears BEFORE the first `<link rel="stylesheet">` so the parser inherits from it. 🔴 Caught during the gate's own authorship: the gate's regex matched my own backtick-quoted example `<base href="/" />` inside the explanatory comment, so M1 (delete the tag) passed green when it should have failed. Fixed by stripping HTML comments before measuring — same trick H1/G11 learned — and the mutation then goes red correctly. | ✅ `D3` |
| **D4** | **The relative-path sweep.** A source gate that reads 8 game files and refuses `fetch(...)` or `Texture.from(...)` with a non-absolute, non-BASE_URL path, for asset extensions (`.json`, `.txt`, `.woff2`, etc.). 2048 draws procedurally and starts green with zero occurrences — the gate exists to catch a reintroduction. Born red on a smuggled `fetch('assets/levels/clarity.map.txt')` in `src/standalone.ts`, restored byte-identical. | ✅ `D4` |
| **D5** | **`uses` DECISION recorded on the cartridge.** `src/index.ts` now exports `uses: undefined = undefined` with a block comment that names all three ports (`neuralVoice`, `reading`, `fonts`) and the per-port reason for the 2048's absence. The existing H3 gate (`tests/neural-voice-decision.node.test.ts`) grew a `D5` block with three assertions: no `uses.reading`, no `uses.fonts`, AND the typed-export is present with the three port names catalogued in prose. 🔴 Mutation M1 (sneak `uses: { reading: true }`) and M2 (sneak `uses: { fonts: [...] }`) proven red; M3 (delete the typed export from `index.ts`) also red. ⚠️ Mutation-anchor rot caught in authorship: my first mutation targeted `dictionaries: cartridge.dictionaries,` which H9 refactored to `...cartridge.hooks,` — [[plano-de-mutacao-apodrece-com-o-codigo]] applied, anchor updated. 279 of 279 full-suite assertions green. | ✅ `D5` |
| **D6** | **Preset keys verified in all three languages.** The pt-only cross-check that H2 wrote in `tests/actions.node.test.ts` widened to pt + en + es: every key `criarPreset()` returns (`act.up`, `.down`, `.left`, `.right`, `.sonar`, `.sonar.hint`) must be declared in all three dictionaries, since the engine's rule (note DN) leaves a position unnamed in whichever language is missing. Dynamic `import('.../en.ts')` + `import('.../es.ts')` so the three dictionaries are read verbatim. Born red on M1 (drop `act.sonar` from en) and M2 (drop `act.sonar.hint` from es); restored byte-identical. The pt dictionary already had every key; en and es were measured to already have them too — the gate exists to catch a reintroduction of a translation gap before CF Pages ships it. | ✅ `D6` |
| **D7** | **`functions/heavy/[[path]].ts` for parity.** Copied verbatim from `game-platformer`'s own function with the explanatory prose translated to English and the 2048-specific preamble added (declines every heavy port, so this file sees no requests in practice). The 11-entry `MIRROR_FOLDERS` table inlined, exactly as the pasted guide prescribes (`esbuild` under CF Pages treats the engine's import as external). Not covered by `tsc` because `tsconfig.json` only includes `app/js`, `src`, `tests`, `vite.config.ts` — Pages compiles the function at deploy time with its own build and types from `@cloudflare/workers-types`. 🔴 Drift gate: three assertions in `tests/deploy-config.node.test.ts > D7` that read `@the-inclusionist/engine/platform/heavy-mirror.js` at test time and compare entry-by-entry against the function's copy. Born red on M1 (drop one entry) and M2 (add bogus entry); restored. 282 of 282 full-suite assertions green. | ✅ `D7` |
| **D8** | **`scripts/post-build-cloudflare.mjs` writes `dist/_headers`.** Copied verbatim from `game-platformer`'s own script with the prose translated to English and the slug substituted. Chained into BOTH `package.json`'s `build` (between the two targets) and `build:app` (after the app build). ⚙️ Measured: a dev build (`INCL_BASE` unset) writes paths like `/sw.js` with `no-cache` on HTML/manifest/SW and `immutable` on `assets/*` + `vendor/*`; a production build (`INCL_BASE=/game-2048/`) writes `/game-2048/sw.js`, etc. The script also removes a stale subpath copy if Vite drops one there. Three D8 assertions in `tests/deploy-config.node.test.ts`; born red on M1 (strip post-build from `build`) and M2 (strip from `build:app`); restored. 285 of 285 full-suite assertions green. | ✅ `D8` |
| **D9** | **`.github/workflows/deploy-router-worker.yml`** — OPTIONAL per the pasted guide; only in repos that also move the Router Worker. 2048 does not; skip, note in the plan. | 🚫 n/a |
| **D10** | 📌 **PLATFORM WORK — not this repo's commit.** `game-2048` gets a line in the Router Worker's `GAMES` table (`'game-2048': 'game-2048.pages.dev'`). Belongs to whichever repo owns the Router Worker. This row is the only platform-side change 2048 needs. | ⬜ |
| **D11** | **First `git push` → CF Pages auto-creates the project**, per the GitHub-integration behaviour the pasted guide describes. ⚠️ Pushing is the Dev's — this step is a note, not a command. Pitfall surfaced in the guide: if the dashboard builds the wrong SHA («Retry deployment» → same SHA), an empty commit OR a manual «Create deployment» unblocks it. | ⏸ (Dev) |

### Verification — D-tier

```bash
npm run build
```

```bash
INCL_BASE=/game-2048/ npm run build
```

(the second runs with the production base — asserts the config respects the env var; `dist/` lands with every
absolute reference under `/game-2048/`.)

- From **D1** onward, `wrangler.toml` is the single source of truth for CF Pages bindings; the dashboard is
  read-only for those fields.
- From **D3** onward, `/vendor/fonts.css` resolves to the domain root even under the subpath (the `<base href="/" />` is what does it).
- From **D5** onward, the «no neural voice, no reading» decision has a written place.
- From **D10** onward, the Router Worker routes `o-inclusionista.jrocha.dev.br/game-2048/*` to this
  project's Pages origin.
- Nothing is deployed by me; every push is the Dev's.

### Open design calls to surface before touching code

- **D1 secrets.** The pasted guide names `CLOUDFLARE_API_TOKEN` as an ORG secret with «public repos»
  visibility — a GitHub Actions secret, not something checked into this repo. No decision for 2048 here;
  recorded for future readers.
- **D7's inlined `MIRROR_FOLDERS` table drift.** The pasted guide calls out that esbuild under CF Pages
  does not resolve the engine's import stably, so the table is COPIED into `functions/heavy/[[path]].ts`.
  Copying a table that lives elsewhere is a drift risk the ADR README calls by its name — a forward gate
  on this cartridge asserting the copy matches the engine's current `platform/heavy-catalogue.MIRROR_FOLDERS`
  would catch a drift. Belongs with D7.

### Not ours, deliberately not touched here

- The Router Worker, the R2 bucket, and the shared platform origin (all platform work).
- The engine's six «Pedido (C)» asks — multi-seat / per-seat / gamepad-title / `inclusionist-heavy --base`
  layout. 2048 is single-player and declines the pause actor, so none of the six affect this cartridge.
- Nothing is written to `the-inclusionist-engine`.

---

## Part five — giving the UI back to the engine

### Context

The Dev, 2026-10-03, looking at the live deploy: *«Por que você preferiu usar o que tinha ao invés de
priorizar a engine, se adaptando à ela?»* — four hand-rolled buttons duplicating the engine's own bar, the
bar at the bottom instead of the top, and a caption that shifts the buttons horizontally so some cannot be
clicked.

**The honest answer: H0–H12 was an API migration and nothing in it asked «should this still exist?».** Every
step asked what a thing is called now. The four buttons were built in Part One against engine 8, when the
doors were genuinely shut — and three of them opened without anyone re-measuring.

### What was measured, 2026-10-03, against the live deploy and 11.0.0

| Our control | What the engine 11 already does | Verdict |
|---|---|---|
| `🔤 Tipografia` | mounts the 🔤 icon AND calls `initSettingsTypo` itself (`create-game.js:1134`) | **triplicated** |
| `🚥 Correção de cor` | mounts the 🚥 icon; **measured cycling correctly** on the live page (`desligado → protanopia → deuteranopia → tritanopia → desligado`) | **duplicated** |
| `⌨ Teclas` | calls `initSettingsControls` itself (`create-game.js:2973`) | **triplicated** |
| `◐ Alto contraste` | no icon; the axis is still `hc3`/`hc45`/`hc7` | **stays ours** — G1's arithmetic did not expire |

🔴 **Two of my own claims were wrong, and in different ways:**

- **G2 said «NOTHING in the engine opens `ui/settings-controls`».** True on engine 8, false on 11 — the
  engine calls it at `create-game.js:2973`. Never re-measured.
- **G1 predicted the 🚥 icon «would read the default on every click and stick after one», and H12 re-asserted
  it.** The TYPE still lacks `visual` on `players` — I read the type and inferred the behaviour. The icon
  cycles perfectly. 📌 **Reading a type is not measuring a behaviour.**

### The bar's real contract — ADR-0148 §3, erratum of 2026-09-13, issue #160

The engine mounts the bar, measures it, and writes **`--barra-a11y-h`** on `#game-region`: the bar's offset,
the bar, **the line of the pointed icon's NAME under it**, and a light gap. The game reads that variable and
leaves the room free. The engine's own words:

> *«The name line is counted whether or not a name is showing — reserving only while pointing would move the
> game under the child's finger.»*

**That sentence describes the Dev's bug and its fix, dated two days after I hand-rolled around it.**

📏 **Measured on the live deploy:** `--barra-a11y-h` reads **375px** on a `#game-region` that is 171px tall.
The engine measured our misplaced bar, produced a nonsense reservation, wrote it — and nothing read it. The
engine already knew.

### The caption bug, in one line of our CSS

```css
.p2-a11y { display:flex; flex-wrap: wrap; … }      /* ours — the caption becomes a flex item */
```
```css
#title-icons        { position:absolute; top:0; flex-wrap:nowrap }   /* the engine's — ONE row, at the top */
#title-icons .pause-icons-cap
                    { position:absolute; top:100%; pointer-events:none }  /* out of flow, below, unclickable */
```

📏 Measured: hovering the `idioma` icon moves it from `x=260` to `x=121` — **139 px out from under the
cursor**, because the caption's text changes width and the wrapping row reflows.

### Standing rules (unchanged)

- Nothing in `the-inclusionist-engine` without the Dev's authorisation.
- Commits are mine, pushes are the Dev's.
- Each gate born red with the mutation confirmed before green counts.

### The order

| | Step | Status |
|---|---|---|
| **E1** | **The three redundant controls are gone.** `src/standalone.ts` 380 → 213 lines; `app/index.html` 190 → 124. Out: the `🔤`/`🚥`/`⌨` buttons, the `#typo`/`#ctrl`/`#viz` overlays, our `initSettingsTypo` and `initSettingsControls` calls, the `word` helper, `acoesComRotulo`'s only caller, the shell's `createStorage`. `◐ Alto contraste` stays — the axis is still `hc3`/`hc45`/`hc7` and G1's arithmetic did not expire. Gates whose subject was deleted were replaced, not just removed: `tests/visual.node.test.ts` now holds **E1 — the shell mounts no panel the engine already mounts** (the inverted property — a regression is somebody re-adding a control the child would meet twice). 🔴 **AND THE DELETION EXPOSED A BIGGER DEFECT.** The engine builds the remap panel's `ControlsStore` inline (`create-game.js:2973`), and its `resetKB` writes `kb.p3 = factory.p3` — the schemes with the 42 nulls — straight through `saveKB(store, kb)`, which is `store.setJSON(CKEY, kb)` with no filter. **Measured end to end**, engine functions and engine data only: `saveKB(store, KB_DEFAULTS)` then `loadKB(store, null)` **throws TypeError**. The G4b lockout went from «ours to work around» to «every game's, and unreachable by any consumer» — `semNulos` has no hook left. `app/js/keyboard-save.ts` is kept in the tree, uncalled, as the measured shape of the fix the engine needs. 286 assertions green. | ✅ `E1` |
| **E2** | **The bar is at the top, as `#title-icons`, with the engine's own CSS.** The host element moved INSIDE `#game-region` (last child), `.p2-a11y` is gone from `app/css/game.css`, and `host.a11yBarHost` is gone from both the shell and `tests/factory.browser.test.ts` — the engine finds the bar by its own `A11Y_BAR_SELECTOR = '#title-icons'`. 📏 **The Dev's bug is dead, measured**: hovering each of the 12 icons in turn moves NO icon at all, with the caption's width swinging from 77 px («Menu») to 463 px («Correção de daltonismo: desligado»). The two engine rules that do it — `#title-icons{position:absolute;top:0;flex-wrap:nowrap}` and `#title-icons .pause-icons-cap{position:absolute;top:100%;pointer-events:none}` — applied the moment the host carried the engine's id. 📏 **Two more defects fell out of the same move**: `--barra-a11y-h` went from a nonsense **375 px on a 171 px region** to a sane **75 px on 360**, and `.pi-btn` recovered `--alvo-min` (22·k), which `ui/layout` writes on the region — outside it, every icon had been taking the literal 44 px fallback and had stopped growing with the board. 🔴 The old note in this file said the engine's rule was «the PLATFORMER'S title screen»; the platformer puts the bar inside `#game-region` too, and has since 02/10. | ✅ `E2` |
| **E3** | **The room the engine reserves is free (ADR-0148 §3).** The HUD reads the variable: `top: calc(max(var(--barra-a11y-h, 0px), 40 * var(--px)) + 2 * var(--px))` — a floor and not the raw value, so a retracting bar (E5) or a host with no bar cannot walk it up the screen. 🔴 **The board had to give way, and the arithmetic is why**: `--barra-a11y-h` measures **37.5 logical px** for Atkinson Hyperlegible, Lexend and Andika and **38.5** for Playwrite BR, whose higher floor takes the icon-name line from 16 px to 20 px (#172) — and a 148-side board under a 38.5 band wants **186.5 of the 180 that exist**. The GAP went 4 → 2 and the TILE did not move: `BOARD` 148 → 138, `BOARD_X` 164 → 174, `HUD_W` 148 → 158, and `BOARD_Y` stopped being `(180−148)/2 = 16` and became `TOP_BAND = 40`. 📌 Choosing the gap is the whole point — 32 logical pixels keeps `fontFor`'s type sizes and the square's touch target, and both are WCAG floors; a gap is separation the painted frame already provides in a contrasting role colour. 📏 `motor.problems` no longer carries «the game draws over the accessibility bar» — it named `h1.p2-hud__title` (box at logical y 16‥40 against a bar at y 0‥22) at every boot for three weeks. | ✅ `E3` |
| **E4** | **Gates, each born red.** New file `tests/a11y-bar.browser.test.ts`, 8 assertions, which **parses the real `app/index.html`** instead of hand-building a harness — so «the bar is inside the region» is a property of the delivery, not of the test. It loads BOTH stylesheets, because the fix was to stop writing CSS for the bar and the engine's two rules ARE the subject. (a) hovering every icon moves no centre, with a cross-check that the caption's width actually varied by >100 px; (b) the caption is `absolute` / `pointer-events:none` / below the bar, and the row is `nowrap`; (c) the band is >0 and smaller than its own region, fits inside `TOP_BAND`, and `motor.problems` has no bar-intruder line; plus the HUD box against `HUD_X`/`HUD_W` (CSS literal vs TS constant — the only thing standing between two copies of the same number) and a cycle of every 🔤 face against `TOP_BAND`. **Mutations confirmed:** the Dev's defect re-applied as `#title-icons{position:static;flex-wrap:wrap}` produces **132 recorded icon movements** and reds three gates; the bar moved back under `<main>` makes the engine measure **−155 px**; the HUD's top back to `16` reds both the `problems` gate and the HUD gate; a stale `148` width reds `HUD_W`; `TOP_BAND = 30` reds the band pair. In the node project, `BOARD_Y` back to centring, `TOP_BAND` at 30 and `GAP` back to 4 each red their own assertion (`40 + 148 = 188 > 180`). ⚠️ One unrelated red fell out: `animation.browser.test.ts` asked for agreement within 5·10⁻⁶ logical px — **below the browser's own 1/64-px layout resolution**, passing by luck of the old coordinates. It is now a named `FOLGA = 0.01`, and a 1-logical-pixel mutation in `ui/tiles-layer` still reds it. **296 assertions green; `test:a11y` clean — 4 screen sizes, axe 0 violations.** | ✅ `E4` |
| **E5** | **The bar retracts after five seconds of stillness.** The Dev, 2026-10-03: *«O painel de acessibilidade rápida deve desaparecer se recolhendo pra cima após 5 segundos de inatividade, exceto se o jogo estiver pausado. Ele deve aparecer novamente quando o mouse se dirige em suas direção ou se há um toque na tela no lugar onde ele deveria estar.»* ⚠️ **The engine has no such behaviour** — measured 2026-10-03, nothing in `ui/pause-icons`, `ui/top-band` or `style.css` hides or re-shows the bar on a timer. So this is not a case of preferring ours to the engine's; there is nothing to adapt to. 📌 **But it is engine-shaped**: every game's bar should do it, and the engine owns the bar. Written here as the game's, and flagged to the Dev as something that belongs in `the-inclusionist-engine` — which needs his authorisation. 🔴 **The constraint E3 already paid for**: a retract is a `transform`, so the bar's rectangle leaves the top and the engine's next `reserveTopBand` would publish a band of almost nothing; the canvas is immune (it reserves the constant `TOP_BAND`) and the HUD is immune because its `top` is a `max()` against that same constant. Gates: the bar is reachable again by pointer approach and by a touch where it should be; it does NOT retract while paused; and the reserved room does not move when it does. | ✅ `E5` |
| | **E5 as built.** `app/js/ui/a11y-bar-retract.ts` — one module, nothing reached for, every node and the clock injected, so moving it into the engine is a copy of one file. Two CSS rules declare a STATE (`#title-icons[data-recolhida='1']`) and the travel to it, and neither restates the engine's layout. 🔴 **«Inactivity» is read as inactivity WITH THE BAR and that reading is said out loud**, because the two sentences settle it between them: the bar returns ONLY by being approached, so a clock reset by playing would mean a child on the keyboard never sees it fold — the feature would do nothing during a match, which is the one time the top band is worth giving back. An earlier draft of the handler did restart on any pointer move inside the region; a gate now holds the opposite. ⚠️ **«Paused» is read wider than asked**: the engine has no «am I paused?» door (`isNavigable` is the game's answer TO it, `engine.pause` is write-only, and this game sets no phase), so what is observed is any engine menu being on screen — folding the bar while a panel one of its own icons opened is still up would be absurd anyway. 🔴 **Focus reveals it** (WCAG 2.4.11): the icons stay in the tab order while folded, because taking them out would take the bar from exactly the child it is for. **Measured on the built page:** out at load, folded after five seconds, back on a pointer into the top band with the caption below it moving no icon; a move over the board does not hold it out. ⚠️ Two readings cost a diagnosis each and both were the same trap — `getComputedStyle` right after the state lands returns the transform at **t=0 of the transition**, and in a hidden pane it never advances past it. Mutations: the menu check, the `focusin` reveal, the zone test, the timer and the engine's `translateX(-50%)` each red their own gate; taking `cancelar()` out of `teardown` reds the leak gate. 📌 Removing the `morto` latch reds NOTHING — it is an inert mutation, not missing coverage, and the module says so where it lives. **304 assertions green; `test:a11y` clean.** | |
| **E8** | **Every transport goes through the engine's `virtualController`.** The Dev: *«Você está a usar o virtualController? Não é para usar meios próprios de entender controle, por favor, use o virtualController»* — and, when I came back with a question instead of the work: *«É PARA USAR A ENGINE! PELAMOR! PARA DE INVENTAR!»* 🔴 **The answer was no, three times over**: a `keydown` listener on the region, a `touchstart`/`touchend` pair doing swipe arithmetic, and `click` handlers on four `[data-dir]` buttons — each ending in `jogar(dir)`, the game delivering to itself. The cartridge declared no `onCommand`, so every transport the ENGINE mounts (gamepad ADR-0224, eyes, face, hands, voice, one-button scan ADR-0218 §4) reached this game **in nothing**: the 📷 and 👄 icons sit in the bar E2 just fixed, a child presses them, and the board does not move. All three listeners are gone; the game receives through `onCommand` and asks for the engine's pad with `onScreenPad` (ADR-0166). 📏 **Measured on the built page:** a press stamped `'rosto'` moves the board. The `Shift`+arrow reading cursor became the position `ACAO_DE_LER = action2` — a `VirtualCommand` carries no modifiers, because the eyes, the face, the voice and the pad have no Shift to hold, so the chord was a reading mode for keyboard children and nobody else. **320 assertions green; `test:a11y` clean, axe 0.** | ✅ `E8` |
| | **Four things the migration turned up, each measured.** ⚠️ **`mount` replaces the whole game half**, and nothing reports it: `onCommand` given only to `createGame` received **0 commands**, given through `mount` received all of them. The same mechanism was erasing `declines` — `motor.problems` carried «there is no neural voice» post-mount while the console, which prints the PRE-mount snapshot, looked clean for weeks. ⚠️ **`onScreenPad` has to be in BOTH halves**: `touch-bindings.attach()` runs inside `createGame` and begins `if (!tc) return`, so a pad drawn later at `mount` never gets the listeners that reveal it — 📏 the pad sat in the document, correctly named from our `preset`, `hidden`, and no touch brought it back. 🔴 **The comment-stripping used by four source gates was inert on CRLF**: JavaScript's `.` does not match a carriage return, so `(^|[^:])//.*$` matches nothing and the gate reads prose as code. It surfaced as a false positive; a checkout with `core.autocrlf=true` would have had every «this source does not contain X» gate in the repository measuring comments. Fixed in all four with `\r\n?` normalisation, and proven by converting a measured file to CRLF and re-running. ⚠️ **A cross-check anchored on its own subject**: it read `/export function bootar|onCommand/`, the export is actually `criarJogo`, so the only arm that ever matched was `onCommand` — deleting `onCommand` reddened the «the file is not empty» check too. | |
| **E9** | **The contrast axis goes back to the engine, and my argument for keeping it was wrong.** The Dev: *«Por que ainda há botão de alto contraste na parte de baixo da tela? Isso é redundante, não?»* and *«É PARA O CARTUCHO USAR TUDO QUE PUDER DA ENGINE!»* 🔴 **E1 kept the `◐` button on an argument that measured the wrong pair.** It ran: three roles pairwise at 7:1 need 49:1 between the extremes, the WCAG scale stops at 21, so `hc7` is «not hard but IMPOSSIBLE» — written into `app/index.html`, `src/standalone.ts` and a whole describe in `tests/visual.node.test.ts`. 📏 The engine states what its levels mean, in the sentences a child reads (`i18n/en.js:570`): «platform vs background ~3:1», «lighter platforms and a darker background», «almost black and white». **Figure against background. One pair.** Measured with this game's own `contraste()`: `hc7` reaches **21.00:1**. And role-against-role is not even a pair that exists on this board — two tiles never touch, `GAP` of frame runs between them. 🔴 **The axis was never missing from the engine either**: `iconsThatAct` mounts 🌗 for whoever hands in `setPlayerTheme`, and this cartridge handed in none — the engine's own words for the shape are «a gap the consumer reads as a choice is the worst kind». The button, its row, `.p2-tools`, the `dataset.hc` handler and three orphaned `tools.*` keys are gone; the bar went from 12 icons to **13**. The palette was SOLVED, not chosen, against four simultaneous demands (figure vs screen at the level's ratio, number vs tile at the same, every role vs the frame at 1.4.11, and the empty square vs the frame), and `tests/palette.node.test.ts` holds the solver's constraints. ⚠️ A defect of my own on the way: the first palette left the screen and frame at their `padrao` values, which at `hc7` gave **1.00** between an empty square and the frame — the board's grid would have vanished for the child who asked for maximum contrast. Gated now. **324 assertions green; `test:a11y` clean, axe 0.** | ✅ `E9` |
| | 🔴 **An engine defect found by using it, and the G1 prediction coming true on the other icon.** The 🌗 cycle sticks: `padrao → hc3` on the first press, `hc3` for ever after. 📏 Two lines disagree about where the theme lives — `ui/pause-icons.js:539` computes the next step from `(P()[i] || {}).visual`, while `boot/create-game.js:935` writes the press into `worldState` and never into `player.visual`. The two places that DO write `player.visual` (`create-game.js:980` and `:1544`) are the CORRECTION and the SIMULATION, which is exactly why the 🚥 icon cycles correctly and this one does not. The public `players` type is `{ ctrl, audioSink? }[]`, with no `visual` at all, so no cartridge can populate it either. **A child who needs 7:1 cannot reach it and cannot switch 3:1 back off — in every game, not just this one.** ⚠️ Part Five recorded «G1 predicted the 🚥 icon would stick … the icon cycles correctly» and drew the right lesson («reading a type is not measuring a behaviour») from the wrong icon: I measured the one with an engine-side default and concluded about the one without. The cartridge steps around it **self-healingly** — an incoming value that is not `hc3` is used as given, so the step vanishes the day the engine is fixed — and the engine's own `srSay` still announces «3:1» at every level, which is **reported, not papered over**: a second voice from this game disagreeing with the engine's over one control would be worse. **Needs the Dev's authorisation to fix in `the-inclusionist-engine`.** | ⬜ |
| **E10** | **«Como jogar» goes back to the engine's help panel.** The Dev: *«É PARA O CARTUCHO USAR TUDO QUE PUDER DA ENGINE! Especialmente o virtualcontroller e os menus.»* 🔴 **What the menus were actually missing, measured on the built page rather than guessed.** Opening the pause card and reading every item's lock state: `resume`, `ajuda`, `quit` and all six inclusion panels are FREE — the engine acts on them itself, so `getPauseActs` was never the gap. Two items are locked, both correctly: `addplayer` (this game declares one seat) and `opcoesdojogo` (no `gameOptions`). 📏 And «Ajuda — Como jogar» showed **«AJUDA VOLTAR ◀ W EMPURRAR PARA CIMA ▶»** — the engine's button list and nothing else. A child who paused BECAUSE she did not know how to play found the keys she could press and no sentence saying what the game is. The engine's own record quotes the Dev on whose job that is (ADR-0195): «O "Como jogar" é justamente algo a ser feito pelo cartucho.» Three slides now, each with a figure the game draws on the engine's surface — the push, the merge, the doubling ladder — in the game's own palette, so the explanation looks like the thing it explains. ⚠️ Declared in BOTH halves, for the measured `mount` reason. 📌 `gameOptions` is deliberately still absent: this game has no settings of its own, and the locked door with its reason (ADR-0161) is the honest outcome — inventing a row to fill it is the habit this whole part is about. Gates: the declaration itself, the three sentences in three languages, 🔴 every figure a PURE function of the injected clock (WCAG 2.3.3 — under reduced motion the engine hands time 0 once and never again), and no figure leaving its surface at any instant. **328 assertions green; `test:a11y` clean, axe 0.** | ✅ `E10` |
| **E6** | **The touch pad overlaps the HUD — a finding, not yet a decision.** 📏 Measured 2026-10-03 under an emulated coarse pointer at k=2: the pad is 92.8 logical px square (`--alvo-toque` = 59.2 CSS px, 11 real mm — WCAG 2.5.5) sitting at y 81.2‥174, and the HUD column runs 42‥140.7. **Overlap: 59.5 logical px** — the score, the doubles line and «Jogar outra vez» are under the arrow keys. 🔴 **It predates E3 and E3 made it worse**, and that was measured rather than inferred: putting the HUD's `top` back to its old `16` in the live page leaves an overlap of **33.5**. The arithmetic says it never fitted — HUD content 98.7 + pad 92.8 = **191.5 logical into a 180-tall region**, before the band takes 40 of it. Every way out is a design decision (shrink the HUD text, which is already under the 16 px floor; move the pad off the HUD column, where the board leaves no room; or drop a HUD line on coarse pointers), so it is the Dev's to make, not mine. ⚠️ **E8 changed whose question this is.** The hand-built pad is gone and the ENGINE's pad is in its place, positioned by the engine's own stylesheet: 📏 measured on the built page, the stick is 74.9 logical px square at x 4‥78.9 / y 101.1‥176 and covers the HUD from y 101.1 to 140.7 — **39.6 of overlap instead of 59.5** — while the two diamond buttons (`1, Onde há fusão` and `2, Ler o tabuleiro`) and START sit over the board's right edge. `#touch-controls` is in the engine's own `ENGINE_NODES`, so the engine excludes it from the intruder check: a pad that floats over the world is its design, not an accident. What is left to decide is whether THIS game's HUD and board should move out from under it, which is the same decision as before with a different author. | ⬜ |
| **E7** | **The HUD's text is under the 16 px floor (ADR-0163).** The one line left in `motor.problems`: «the cartridge draws text under 16 px (span, p.p2-hud__line, span, p#p2-doubles.p2-hud__line)». `.p2-hud__line` is `calc(7 * var(--px))` = 14 CSS px at k=2, against a floor of 8 logical. ⚠️ It interacts with **E6** — raising it grows the HUD column by about 11 logical px into a budget that is already over — so it is sequenced after the Dev decides E6 rather than fixed in passing. | ⬜ |

### Verification — E-tier

```bash
npm run typecheck && npx vitest run
```

```bash
npm run build
```

- From **E1** onward, the suite shrinks: the tests for the deleted panels go with them.
- From **E3** onward, `motor.problems` is the engine's own verdict on whether the bar has its room.
- Nothing is deployed by me; every push and every `wrangler deploy` is the Dev's.
