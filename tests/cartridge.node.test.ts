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
