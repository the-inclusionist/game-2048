// SPDX-License-Identifier: AGPL-3.0-or-later
//
// THE ENGINE'S FONTS, COPIED INTO THIS GAME'S `public/`.
//
// ⚠️ WHY THIS EXISTS, and why it is a copy rather than an import: `vendor/fonts.css` addresses its 36 faces by
// RELATIVE URL (`url('fonts/atkinson-400.woff2')`). A stylesheet resolves a relative URL against its own
// position, so the file and the `fonts/` folder travel TOGETHER or neither works. Importing it through the
// bundler would have Vite rewrite the URLs into hashed `assets/` — which works, and destroys the reason
// `_headers` and the service worker treat a font as immutable.
//
// ⚠️ RESOLVED THROUGH `package.json`, NOT `./assets` (CHANGED 2026-10-02 FOR H7). Before engine 11.0.0 the
// path `@the-inclusionist/engine/assets/vendor/fonts.css` was in the package's `exports` field; 11.0.0
// removed every path under `./assets` from exports (the vendor folder MOVED from `assets/` to
// `app/public/vendor/`, and no public specifier replaced it). The files still ride in the published tarball
// (`package.files` includes `app/public/vendor`), so we resolve the package's root through its
// `./package.json` entry — the one specifier Node always honours — and join the known internal path.
//
// 🔴 THIS IS A FINDING AGAINST THE ENGINE, reported but not patched. ADR-0255's note DW says the engine
// «mounts its own faces» at run time, and the typography panel does name them (`fontInstalled` reads the
// LIBRARY), but there is no `@font-face` rule for Atkinson Hyperlegible, Andika, Lexend or Atkinson
// Hyperlegible Mono in the engine's `dist-pkg` runtime — measured 2026-10-02 against 11.0.0. Each consumer
// still self-hosts them. Until the engine exposes `./app/public/vendor/*` through its `exports` field (or
// writes the four free-face rules itself), the game needs this copy.
import { cp, mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const packageJson = require.resolve('@the-inclusionist/engine/package.json');
const packageDir = dirname(packageJson);
const origem = join(packageDir, 'app', 'public', 'vendor');
const destino = join(import.meta.dirname, '..', 'app', 'public', 'vendor');

await rm(destino, { recursive: true, force: true });
await mkdir(destino, { recursive: true });
await cp(origem, destino, { recursive: true });
console.log(`engine fonts copied: ${origem} -> ${destino}`);
