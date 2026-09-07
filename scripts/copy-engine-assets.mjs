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
// The engine exports `./assets/*`, so the source path is declared rather than guessed (`package.json`,
// `exports` field). If it ever moves, this breaks LOUDLY at build time instead of serving a silent 404.
import { cp, mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
// Resolved through the package's `exports`, not by hand through `node_modules/...`: the path is what the
// engine PROMISES.
const fontsCss = require.resolve('@the-inclusionist/engine/assets/vendor/fonts.css');
const origem = dirname(fontsCss);
const destino = join(import.meta.dirname, '..', 'app', 'public', 'vendor');

await rm(destino, { recursive: true, force: true });
await mkdir(destino, { recursive: true });
await cp(origem, destino, { recursive: true });
console.log(`engine fonts copied: ${origem} -> ${destino}`);
