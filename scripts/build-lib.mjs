// SPDX-License-Identifier: AGPL-3.0-or-later
//
// THE CARTRIDGE BUILD — the published half of ADR-0140's two targets, and the checks that make it publishable.
//
// ========================= WHY A SCRIPT AND NOT TWO npm LINES =========================
// Because two of the four steps are ASSERTIONS, and they have to run every time rather than when somebody
// remembers. ADR-0140's confirmation is explicit that a gate building both targets is "not optional": a change
// tested only in the app build breaks the lib build, "and nothing notices until the platform installs it".
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(import.meta.dirname, '..');
const SAIDA = join(RAIZ, 'dist-lib');
// ⚠️ `shell: true` IS FOR WINDOWS, and it is not optional there: Node refuses to spawn a `.cmd` directly
//    since the 2024 argument-injection fix, and the failure is an opaque `spawn EINVAL` with no stdout. The
//    arguments below are literals in this file, so nothing from outside reaches the shell.
const correr = (args, env) =>
  execFileSync(args[0], args.slice(1), {
    cwd: RAIZ, stdio: 'inherit', shell: true, env: { ...process.env, ...env },
  });

// 1 · THE JAVASCRIPT, with the engine and PixiJS external.
correr(['npx', 'vite', 'build'], { BUILD_MODE: 'lib' });

// 2 · THE TYPES. `vite build --lib` emits none, and the only consumer this package has is a TypeScript
//     platform — without these it would get `any` for the whole contract.
correr(['npx', 'tsc', '-p', 'tsconfig.lib.json']);

/** Every emitted declaration. */
function declaracoes(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return declaracoes(caminho);
    return caminho.endsWith('.d.ts') ? [caminho] : [];
  });
}

// 3 · ⚠️ THE `.ts` SPECIFIERS HAVE TO BECOME `.js`, and this step exists because TypeScript would not do it.
//     This repository's source imports `./board.ts` WITH the extension — Vite resolves that, and
//     `allowImportingTsExtensions` is on for it. `tsconfig.lib.json` sets `rewriteRelativeImportExtensions`,
//     which handles the emitted JavaScript; measured on TypeScript 5.9.3, it does NOT rewrite a type-only
//     re-export inside a `.d.ts`. A consumer resolving `../app/js/cartridge-types.ts` finds nothing, because
//     no `.ts` is shipped — the failure is a package that installs cleanly and has no types.
let reescritos = 0;
for (const arquivo of declaracoes(SAIDA)) {
  const antes = readFileSync(arquivo, 'utf8');
  const depois = antes.replace(/(from\s*['"])(\.[^'"]*)\.ts(['"])/g, '$1$2.js$3');
  if (depois !== antes) { writeFileSync(arquivo, depois); reescritos++; }
}

// 4 · THE ASSERTIONS. Each one is a way this package can install and be useless.
const problemas = [];

for (const arquivo of declaracoes(SAIDA)) {
  if (/from\s*['"]\.[^'"]*\.ts['"]/.test(readFileSync(arquivo, 'utf8'))) {
    problemas.push(`${arquivo} still names a .ts specifier — a consumer cannot resolve it`);
  }
}

const js = readFileSync(join(SAIDA, 'index.js'), 'utf8');

// ⚠️ THE WHOLE POINT OF THE LIB TARGET. One installed engine still travels N times if N bundles inline it, so
// the output must carry a BARE specifier and none of the engine's contents (ADR-0140 confirmation §2).
if (!/from\s*["']@the-inclusionist\/engine/.test(js)) {
  problemas.push('the bundle imports no bare `@the-inclusionist/engine` specifier — is it inlined?');
}
if (/SPDX-License-Identifier: AGPL-3\.0-or-later[\s\S]{0,400}createGame/.test(js)) {
  problemas.push('the engine looks INLINED into the cartridge');
}

// 📌 A cartridge is not a unit of installation (ADR-0117): the platform owns the one service worker.
if (/serviceWorker|workbox/i.test(js)) problemas.push('the lib build contains a service worker');

if (problemas.length) {
  for (const p of problemas) console.error(`  ✗ ${p}`);
  console.error(`\n✗ lib: ${problemas.length} problem(s).`);
  process.exit(1);
}
console.log(`✓ lib: engine external, no service worker, ${reescritos} declaration(s) rewritten to .js`);
