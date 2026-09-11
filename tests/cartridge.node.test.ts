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

  it('[Cross-check] 🔴 `npm run build` covers the lib target, which is how CI reaches it at all', () => {
    // ⚠️ THE SHARED WORKFLOW GIVES A GAME ONE BUILD STEP and its inputs are `node-version`, `a11y` and
    //    `preview-port` — a caller cannot add another. So "CI builds both" is true ONLY while the `build`
    //    script chains both, and a well-meaning simplification back to `vite build` would silently undo the
    //    record's requirement while leaving CI green. Verified in the run for 99dfd98: the log carries
    //    `dist-lib/index.js 19.21 kB` and the lib gate's own line.
    expect(scripts.build, 'the app half').toMatch(/vite build/);
    expect(scripts.build, 'the lib half').toMatch(/build-lib\.mjs/);
  });

  it('[Right] and so does `npm run validate`, so the same is true on a developer’s machine', () => {
    expect(scripts.validate).toMatch(/npm run build/);
  });

  it('[Interface] each target is still reachable on its own, for a bisect', () => {
    // Chaining them is right for the gate and wrong for debugging: when the lib build breaks, running the app
    // build alone is how you find out whether the source or the target is at fault.
    expect(scripts['build:app']).toBeTruthy();
    expect(scripts['build:lib']).toBeTruthy();
  });

  it('[Zero] ⚠️ and `prepack` builds the cartridge, so publishing cannot ship a stale one', () => {
    // `dist-lib/` is gitignored: it exists only where somebody built it. Without this, `npm publish` from a
    // clean clone would pack an EMPTY `dist-lib` and the tarball's `exports` would point at nothing.
    expect(scripts.prepack, 'npm runs this before packing').toMatch(/build:lib|build-lib/);
  });
});

describe('what the cartridge exports', () => {
  it('[Interface] the three languages, ready for a shell to register', () => {
    expect(Object.keys(cartridge.dicts).sort()).toEqual(['en', 'es', 'pt']);
    for (const [codigo, dict] of Object.entries(cartridge.dicts)) {
      expect(Object.keys(dict).length, codigo).toBeGreaterThan(20);
    }
  });

  it('[Zero] ⚠️ and it does NOT register them — a cartridge never writes to the shared table', () => {
    // Two cartridges each registering would be two writes to one table in an order nobody controls, and the
    // loser's strings would simply be missing with nothing said.
    const entrada = arquivos.find((a) => a.nome === 'src/index.ts')!.texto;
    expect(entrada).not.toMatch(/registerDict\s*\(/);
  });

  it('[Right] `create` is a function, and it is the only thing that runs', () => {
    expect(typeof cartridge.create).toBe('function');
    expect(Object.isFrozen(cartridge), 'nothing may reshape it after import').toBe(true);
  });
});
