# Plan — game-2048: engine 8 ✅ → engine 9 ✅ → the cartridge conversion ✅ → engine 11

**Legend:** ✅ done · 🆕 newly possible (engine 9.0.0) · ⬜ not started · 🔴 defect

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
| ⬜ **`initKeydown` for consumers** | 🔴 **New, found in G2, and it has a SECOND symptom found in G11.** `createGame` does not install the keydown router, so any panel needing a captured key must be routed by the consumer — and so must **Escape**: the router is also what walks `overlays.escapeTarget()`, so on 2026-09-12 none of this game’s three panels closed with the key, and every `inEscapeChain: true` was a true declaration into a chain nobody walked. Both halves are now routed by `src/standalone.ts`. One engine gap, two consumer workarounds. |
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
| **G10** | **Publish** — `npm publish` is spending and irreversible. **Prepared** (`ceb86b8`): `publishConfig.access: public` added, or a scoped package publishes to nobody; version off the `0.0.0` placeholder to `0.1.0`; `npm pack --dry-run` is 25 files / 46.4 kB. Gated by three assertions. ⏸ **The command itself is the Dev’s to run.** | ⏸ |
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
| **H8** | **`defineGameBuild` replaces `scripts/build-lib.mjs`.** `vite.config.ts` becomes `export default defineGameBuild({ cartridge: 'src/index.ts', config: <the existing app config> })`. `package.json` scripts: `build` → `vite build`, `build:lib` → `vite build --mode cartridge`, `build:app` kept, `prepack` → `vite build --mode cartridge`. Delete `scripts/build-lib.mjs`. ⚠️ G9's gate on `scripts.build` chaining both targets RETIRES — the shared CI now runs both commands directly (ADR-0253 §DV). The CARTRIDGE EXISTS assertion (`exports["."]` points at `./dist-lib/cartridge.js`) stays. | ⬜ |
| **H9** | **Default export + `inclusionist-check-cartridge`.** Change `src/index.ts` from `export const cartridge = …` to `export default …`. Chain `npx inclusionist-check-cartridge` into `test:a11y` after `pwa-check` and `layout-check`. Born red: one mutation that mangles the slug and one that corrupts `hooks.preset`. 📌 Our own `tests/cartridge.node.test.ts` ADR-0139 gates stay — they measure the source; the checker measures the built tarball; both answer different questions. | ⬜ |
| **H10** | **Deaf-mode naming sweep.** `engine.libras` reads retire (we had none at runtime; just prose). `scripts/axe-check.mjs:17`'s VLibras-widget exclusion caveat gets rewritten: VLibras Unity player left in 11.0.0 (DO); the comment names `ui/libras-avatar-player` as the engine's current path, and the gate's "0 exclusions" claim stays true (we still load no third-party widget). | ⬜ |
| **H11** | **Re-measure the three C-bucket behaviours.** 📏 Three browser probes in order, each `✅`/`⬜`:<br>(1) **Does `createGame` call `initKeydown` now?** If yes, drop our document-level `aoCapturar` and `aoEscapar` listeners from G2/G11 (they become double delivery). If no, the two listeners stay — gated by `tests/visual.node.test.ts`'s Escape block (G11).<br>(2) **Does webgazer still fetch?** Open the preview and read `read_network_requests` for `webgazer.cs.brown.edu`. If 11 closed it (ADR-0132), remove the paragraph at `src/standalone.ts:113–118` and the `downloadHeavy: false` decision loses one of its two reasons; keep the second (ONNX for voice).<br>(3) **Does `migrarEsquema` still spread nulls?** `tests/keyboard-save.node.test.ts` already measures this; a green run means the engine fixed it and the `semNulos` workaround can retire. Each sub-item lands as its own commit if positive. | ⬜ |
| **H12** | **The stale-prose sweep.** All Bucket B lines Agent-2 catalogued: `README.md` (lines 20–26, 65, 76, 78–83), `app/index.html` block comments at 82–106, `src/standalone.ts` version-dated paragraphs, `app/js/visual.ts` header, `app/js/cartridge-types.ts`, the plan file's own Part 1.5. Each sentence either (a) stays as history with a dated appendix saying "and 11.0.0 did X", or (b) is rewritten when it governed BEHAVIOUR rather than history. The ADR README rule (ADR-0068 §5-trap) says: don't sweep lines that still govern; do extend lines whose version anchor is behind the current pin. | ⬜ |

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
