// SPDX-License-Identifier: AGPL-3.0-or-later
// ADR-0139's OWN CONFIRMATION GATES, written where the record says to write them.
//
// The record names four, "so they are not invented later". Two are source facts and live here; the two that
// need a document live in `tests/factory.browser.test.ts`.
//
// ⚠️ THE FIRST ONE IS THE CLAUSE THE WHOLE CONTRACT HANGS FROM. A cartridge that calls `createGame` mounts a
// second accessibility bar, a second TTS and a second keyboard runtime into one document — and ADR-0139 is
// explicit that this "appears as broken behaviour rather than as weight", which is the kind found late. No
// behaviour test of a STANDALONE build can catch it, because a standalone build has exactly one cartridge and
// works either way. Only reading the source can.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cartridge } from '../src/index.ts';
import pacote from '../package.json' with { type: 'json' };

const RAIZ = join(import.meta.dirname, '..');

/** Every `.ts` the cartridge is built from: its entry plus the game's own modules. The shell is NOT here. */
function fontesDoCartucho(): string[] {
  const out: string[] = [join(RAIZ, 'src', 'index.ts')];
  const andar = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) andar(caminho);
      else if (caminho.endsWith('.ts')) out.push(caminho);
    }
  };
  andar(join(RAIZ, 'app', 'js'));
  return out;
}

const arquivos = fontesDoCartucho().map((caminho) => ({
  nome: relative(RAIZ, caminho).replace(/\\/g, '/'),
  texto: readFileSync(caminho, 'utf8'),
}));

describe('the cartridge never calls createGame', () => {
  it('[Cross-check] the sweep looked at the entry and the game’s modules', () => {
    // A gate that matched zero files is the defect it exists to prevent, wearing a green tick.
    expect(arquivos.length).toBeGreaterThan(12);
    expect(arquivos.some((a) => a.nome === 'src/index.ts')).toBe(true);
    expect(arquivos.some((a) => a.nome === 'app/js/boot/main.ts')).toBe(true);
  });

  it('[Zero] 🔴 not one of them CALLS it — ADR-0139 §2', () => {
    // Mentions in prose are how this repository explains itself, so the gate looks for the CALL. `createGame(`
    // with a word character before it (`_createGame(`) is not it; a bare call is.
    const ofensas = arquivos
      .filter(({ texto }) => /(^|[^\w.`'"])createGame\s*\(/m.test(texto))
      .map((a) => a.nome);
    expect(ofensas, 'N accessibility bars, N TTS instances, N keyboard runtimes on one document').toEqual([]);
  });

  it('[Right] and the SHELL does call it — exactly once, which is the other half of the rule', () => {
    // A rule that only forbids is half a rule: if nobody called it, there would be no engine at all.
    const shell = readFileSync(join(RAIZ, 'src', 'standalone.ts'), 'utf8');
    const chamadas = [...shell.matchAll(/(^|[^\w.`'"])createGame\s*\(/gm)];
    expect(chamadas).toHaveLength(1);
  });
});

describe('the slug is one word in three places', () => {
  it('[Cross-check] ADR-0082 §1 — the cartridge, the package and the repository agree', () => {
    // The one that drifts is always the one nobody reads. `game-pinball` is the project's own example: its
    // folder and remote say one thing and `package.json` still says `@the-inclusionist/game-space-cadet`.
    expect(cartridge.slug).toBe('game-2048');
    expect(pacote.name).toBe(`@the-inclusionist/${cartridge.slug}`);
    expect(pacote.repository?.url ?? '', 'the remote carries the same word').toContain(cartridge.slug);
  });
});

describe('the package is installable — ADR-0140 §4', () => {
  it('[Zero] 🔴 `private` is gone, or nothing can ever be published', () => {
    expect((pacote as { private?: boolean }).private).toBeUndefined();
  });

  it('[Right] the engine and PixiJS are declared TWICE, and that is not redundancy', () => {
    // ADR-0140 §4: `peerDependencies` INSTALLS NOTHING — it is a requirement addressed to whoever consumes
    // the package, and it is what makes the platform install exactly one engine. Without a `devDependency`
    // beside it a clean clone has no engine and does not build, which is the other half of the same record.
    expect(pacote.peerDependencies?.['@the-inclusionist/engine']).toBeTruthy();
    expect(pacote.devDependencies?.['@the-inclusionist/engine']).toBeTruthy();
    expect(pacote.peerDependencies?.['pixi.js']).toBeTruthy();
    expect(pacote.devDependencies?.['pixi.js']).toBeTruthy();
  });

  it('[Zero] ⚠️ and NEITHER is a plain `dependency` — that is what quietly ships two engines', () => {
    // Under `dependencies`, npm is free to install a nested engine beneath each cartridge, and it will the
    // moment two cartridges ask for versions that do not unify. The duplication is silent.
    const deps = (pacote as { dependencies?: Record<string, string> }).dependencies ?? {};
    expect(Object.keys(deps)).toEqual([]);
  });

  it('[Interface] the peer is a RANGE and the dev pin is EXACT, which are different questions', () => {
    // The peer says what a consumer must supply — a range, so a patch release does not fail the platform's
    // install. The dev pin says what THIS repository is tested against, and it is exact for the reason the
    // 8.0.0 upgrade recorded: the `rc` dist-tag is still published, so a range would accept a candidate.
    expect(pacote.peerDependencies!['@the-inclusionist/engine']).toMatch(/^\^/);
    expect(pacote.devDependencies!['@the-inclusionist/engine']).toMatch(/^\d/);
  });

  it('[Cross-check] `exports` names files the lib build actually produces', () => {
    // A package whose `exports` points at nothing installs cleanly and fails on the first import.
    const exp = (pacote as { exports?: Record<string, { types?: string; default?: string }> }).exports ?? {};
    for (const alvo of [exp['.']?.types, exp['.']?.default]) {
      expect(alvo, 'declared in exports').toBeTruthy();
      expect(alvo!.startsWith('./dist-lib/'), `${alvo} comes from the lib build`).toBe(true);
    }
  });

  it('[Right] `files` carries the licence documents, because the licence travels with the code', () => {
    // AGPL-3.0-or-later, and `docs/LICENSES.md` is where the Município's ownership is stated. A package that
    // ships the code and not the statement is the one case where a missing file is a legal fact.
    const files = (pacote as { files?: string[] }).files ?? [];
    for (const obrigatorio of ['dist-lib', 'LICENSE', 'docs/LICENSES.md', 'docs/CREDITS.md']) {
      expect(files, obrigatorio).toContain(obrigatorio);
    }
  });
});

describe('CI builds BOTH targets — ADR-0140 calls this gate "not optional"', () => {
  const scripts = (pacote as { scripts?: Record<string, string> }).scripts ?? {};

  it('[Cross-check] 🔴 `npm run build` covers the cartridge target, which is how CI reaches it at all', () => {
    // ⚠️ SINCE ENGINE 11.0.0 (ADR-0253 §DV), the shared CI runs `vite build` AND
    //    `vite build --mode cartridge` as its own steps, plus `inclusionist-check-cartridge`
    //    after them. The old G9 asserted the chain inside `scripts.build` because the shared
    //    workflow only had one hook before. H8's wrapper (`defineGameBuild`) and the engine's
    //    own CI retire that reason. What stays is the LOCAL guarantee: a developer running
    //    `npm run build` must still produce both.
    expect(scripts.build, 'the app half').toMatch(/vite build/);
    expect(scripts.build, 'the cartridge half').toMatch(/--mode cartridge/);
  });

  it('[Right] and so does `npm run validate`, so the same is true on a developer’s machine', () => {
    expect(scripts.validate).toMatch(/npm run build/);
  });

  it('[Interface] each target is still reachable on its own, for a bisect', () => {
    // Chaining them is right for the gate and wrong for debugging: when the cartridge build breaks, running
    // the app build alone is how you find out whether the source or the target is at fault.
    expect(scripts['build:app']).toBeTruthy();
    expect(scripts['build:lib']).toBeTruthy();
  });

  it('[Zero] ⚠️ and `prepack` builds the cartridge, so publishing cannot ship a stale one', () => {
    // `dist-lib/` is gitignored: it exists only where somebody built it. Without this, `npm publish` from a
    // clean clone would pack an EMPTY `dist-lib` and the tarball's `exports` would point at nothing. H8
    // moved the command from `node scripts/build-lib.mjs` to `vite build --mode cartridge`, since the
    // engine's own wrapper handles both halves of the two-target split (ADR-0253).
    expect(scripts.prepack, 'npm runs this before packing').toMatch(/--mode cartridge/);
  });
});

describe('what the cartridge exports', () => {
  it('[Interface] the three languages, named for `CreateGameOptions.dictionaries`', () => {
    // Renamed from `dicts` to `dictionaries` in H2 (engine 11.0.0, note DN): the shell hands this straight to
    // `createGame({ dictionaries })` and the root's translator registers them before any text.
    expect(Object.keys(cartridge.dictionaries).sort()).toEqual(['en', 'es', 'pt']);
    for (const [codigo, dict] of Object.entries(cartridge.dictionaries)) {
      expect(Object.keys(dict).length, codigo).toBeGreaterThan(20);
    }
  });

  it('[Zero] ⚠️ and it does NOT call registerDict — the module-level door is gone in 11.0.0', () => {
    // `core/i18n.registerDict` was removed in 11.0.0 (note DN); a cartridge reaching for it would import
    // nothing. The dictionaries ride through the engine options instead, and `src/index.ts` must not reach
    // for the removed symbol.
    const entrada = arquivos.find((a) => a.nome === 'src/index.ts')!.texto;
    expect(entrada).not.toMatch(/registerDict\s*\(/);
  });

  it('[Right] `create` is a function, and it is the only thing that runs', () => {
    expect(typeof cartridge.create).toBe('function');
    expect(Object.isFrozen(cartridge), 'nothing may reshape it after import').toBe(true);
  });
});

describe('H9 — the default export has what `inclusionist-check-cartridge` reads', () => {
  // 🔴 ADR-0139 §2 plus ADR-0253 §DV: the checker imports the built entry, reads `{slug, declaration, hooks,
  //    create}` off its DEFAULT export, and hands `declaration` and `hooks` to the engine's own
  //    `cartridgeRefusals`. These assertions are the shape, not the semantics — the engine owns the latter.
  it('[Zero] 🔴 `declaration` is a well-formed `GameDeclaration` placeholder — ten functions, no undefined', () => {
    const d = cartridge.declaration as unknown as Record<string, unknown>;
    for (const k of ['topology', 'world', 'holdsAtOnce', 'holdsKeys',
      'roleAt', 'nameAt', 'focusOf', 'objectiveOf', 'targetsOf']) {
      expect(typeof d[k], `declaration.${k} is a function`).toBe('function');
    }
    expect(cartridge.declaration.tick, 'tick is a literal, not a function').toBe('player');
  });

  it('[Zero] 🔴 `hooks.preset` names every position the game actually reads — with KEYS', () => {
    // The engine's `cartridgeRefusals` does NOT look at preset entries; a null preset would pass it. This is
    // the gate for H9's second mutation.
    const preset = cartridge.hooks.preset ?? {};
    expect(preset.up?.labelKey, 'up').toBe('act.up');
    expect(preset.down?.labelKey, 'down').toBe('act.down');
    expect(preset.left?.labelKey, 'left').toBe('act.left');
    expect(preset.right?.labelKey, 'right').toBe('act.right');
    expect(preset.action1?.labelKey, 'the sonar').toBe('act.sonar');
    expect(preset.action1?.hintKey, 'and its hint').toBe('act.sonar.hint');
  });

  it('[Interface] `hooks` carries `accommodations` and `dictionaries` for the engine root to spread', () => {
    expect(typeof cartridge.hooks.accommodations).toBe('object');
    expect(cartridge.hooks.dictionaries).toBeDefined();
    // And the top-level `dictionaries` is the SAME object — the alias is not a copy that drifts.
    expect(cartridge.hooks.dictionaries).toBe(cartridge.dictionaries);
  });

  it('[Zero] ⚠️ `isNavigable` returns true — this game draws no menu of its own', () => {
    // `memory/isnavigable-entrega-o-teclado.md`: `isNavigable: false` would make the engine stop routing the
    // keyboard here. Measured against the specific defect that memory records.
    expect(cartridge.hooks.isNavigable?.()).toBe(true);
  });
});

describe('the package can actually be published — G10’s preconditions', () => {
  it('[Zero] 🔴 a SCOPED package says `access: public`, or npm publishes it to nobody', () => {
    // ⚠️ npm's default for a scoped name is `restricted`. On a free organisation `npm publish` then fails
    //    with `402 Payment Required`; on a paid one it SUCCEEDS and the package is private, so the platform's
    //    install 404s with nothing to read. The engine declares it — this is the one line that differs.
    expect(pacote.name.startsWith('@'), 'the name is scoped').toBe(true);
    const pub = (pacote as { publishConfig?: { access?: string } }).publishConfig;
    expect(pub?.access, 'AGPL code published privately is a contradiction in terms').toBe('public');
  });

  it('[Zero] ⚠️ and the version is not the scaffold placeholder, which cannot be taken back', () => {
    // `0.0.0` is what `npm init` leaves behind. Publishing it burns the number for ever: npm refuses to
    // republish a version, so the first release would permanently be the one that says «nothing here yet».
    expect(pacote.version).not.toBe('0.0.0');
    expect(pacote.version, 'semver').toMatch(/^\d+\.\d+\.\d+/);
  });

  it('[Cross-check] the licence the package DECLARES is the licence the repository CARRIES', () => {
    // The declared field is what appears on npm and in every consumer's audit; the file is what governs. A
    // package that says MIT over an AGPL file is a licence claim nobody made.
    expect(pacote.license).toBe('AGPL-3.0-or-later');
    const texto = readFileSync(join(RAIZ, 'LICENSE'), 'utf8');
    expect(texto, 'the file itself').toContain('GNU AFFERO GENERAL PUBLIC LICENSE');
  });
});
