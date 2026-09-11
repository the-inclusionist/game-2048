// SPDX-License-Identifier: AGPL-3.0-or-later
// THIS GAME DOES NOT REACH THE SHARED RANDOM STREAM — ADR-0141, enforced by reading the source.
//
// ========================= WHY A SOURCE CHECK AND NOT A BEHAVIOUR TEST =========================
// ⚠️ THIS IS THE GATE ADR-0141 SAYS IS LOAD-BEARING, and the record explains why in as many words: "six
// repositories have an import to change, and their own tests will not notice if it comes back — the lint is
// load-bearing, not decorative".
//
// The defect is invisible where the tests run. `core/rng` exports `rnd`, `randInt`, `shuffle` and `reseed`,
// all bound to ONE module-level stream created at import. In a standalone build that is harmless: one game,
// one stream, nothing to collide with. Inside the platform of ADR-0117 two cartridges importing `rnd` draw
// from the same stream, so each one's draws depend on how much the other drew — and a `reseed(s)` in one
// repositions the other's underneath it. A seeded run stops being reproducible for a reason that is nowhere
// in its own code.
//
// So no assertion about THIS game's behaviour can fail when the import comes back. Only reading the source
// can, which is what this file does.
//
// ========================= AND THE RULE IS NEGATIVE ON PURPOSE =========================
// ADR-0141 §2: "saying «use ctx.rng» would not be enough … a cartridge that uses `ctx.rng` for most things
// and reaches for the imported `shuffle` once has the full defect". There is no partial version. The
// forbidden list IS the rule, so the list is what is asserted.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(import.meta.dirname, '..', 'app', 'js');

/** Every `.ts` under `app/js` — the whole of what becomes the cartridge. */
function fontes(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return fontes(caminho);
    return caminho.endsWith('.ts') ? [caminho] : [];
  });
}

/** The four exports bound to the shared module-level stream. `createRng` is NOT among them: it is the fix. */
const PROIBIDOS = ['rnd', 'randInt', 'shuffle', 'reseed'] as const;

const arquivos = fontes(RAIZ).map((caminho) => ({
  nome: relative(join(import.meta.dirname, '..'), caminho).replace(/\\/g, '/'),
  texto: readFileSync(caminho, 'utf8'),
}));

/** The named bindings of every `core/rng` import statement in one file. */
function importadosDeRng(texto: string): string[] {
  const nomes: string[] = [];
  const re = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*core\/rng(?:\.js)?['"]/g;
  for (const m of texto.matchAll(re)) {
    for (const bruto of m[1].split(',')) {
      const nome = bruto.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
      if (nome) nomes.push(nome);
    }
  }
  return nomes;
}

describe('the source never reaches the engine’s shared stream', () => {
  it('[Cross-check] the sweep actually looked at something', () => {
    // A gate that silently matched zero files is the defect it exists to prevent, wearing a green tick.
    expect(arquivos.length).toBeGreaterThan(10);
    expect(arquivos.some((a) => a.nome.endsWith('boot/main.ts'))).toBe(true);
  });

  it('[Zero] 🔴 not one file imports `rnd`, `randInt`, `shuffle` or `reseed` from `core/rng`', () => {
    const ofensas: string[] = [];
    for (const { nome, texto } of arquivos) {
      for (const importado of importadosDeRng(texto)) {
        if ((PROIBIDOS as readonly string[]).includes(importado)) ofensas.push(`${nome}: ${importado}`);
      }
    }
    expect(ofensas, 'two cartridges sharing one stream move each other’s draws').toEqual([]);
  });

  it('[Right] and `createRng` is allowed, because it is the fix rather than the defect', () => {
    // The engine solved this before anyone needed it: `createRng`'s own doc says of the stream it returns,
    // «Reposiciona ESTA corrente. Não alcança nenhuma outra.» The defect was never in the engine — it was in
    // the shortest import.
    const usa = arquivos.some(({ texto }) => importadosDeRng(texto).includes('createRng'));
    expect(usa, 'this game owns a stream of its own').toBe(true);
  });
});
