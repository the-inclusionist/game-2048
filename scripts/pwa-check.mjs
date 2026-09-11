// SPDX-License-Identifier: AGPL-3.0-or-later
//
// THE DELIVERY GATE — does the built app actually install and run offline?
//
// ========================= WHY THIS EXISTS =========================
// README line 5 has said "offline as a PWA" since this repository was scaffolded, over a build with no
// service worker and no manifest. ADR-0140 names this game BY LINE for it, and pillar 8 is a school machine
// that is online on the first day and offline afterwards — so the sentence was not decoration, it described
// the delivery a school was told to expect.
//
// The claim is true as of 2026-09-11. This script is what stops it drifting back: a plugin removed, a config
// reshuffled, a build target changed, and the line would quietly become a lie again with every test green.
//
// ========================= ⚠️ WHY IT RIDES WITH THE a11y SCRIPT =========================
// It is not an accessibility check and it does not pretend to be. The shared workflow of ADR-0068 §4 gives a
// game exactly one hook that runs AFTER the build — `npm run test:a11y` — and its inputs are `node-version`,
// `a11y` and `preview-port`, so a caller cannot add a step. A gate that only ran on a developer's machine
// would be the kind that stops running the week somebody is in a hurry, so it rides with the one hook that
// CI reaches and says so here rather than looking like a naming accident.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist');
const falhas = [];

// 1 · THE SERVICE WORKER. Without it there is no offline, whatever the manifest says.
for (const f of ['sw.js', 'registerSW.js']) {
  if (!existsSync(join(DIST, f))) falhas.push(`missing ${f} — the build produced no service worker`);
}

// 2 · THE MANIFEST, and the two fields ADR-0140 calls out by name in the platformer's.
const manifestPath = join(DIST, 'manifest.webmanifest');
if (!existsSync(manifestPath)) {
  falhas.push('missing manifest.webmanifest — nothing to install');
} else {
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'));

  // ⚠️ `lang` IS NOT COSMETIC: it is what a screen reader announces the install prompt in. The platformer
  // ships `"lang": "en"` for a product delivered in pt-BR, and ADR-0140 says so in as many words.
  if (m.lang !== 'pt-BR') falhas.push(`manifest.lang is ${JSON.stringify(m.lang)}, expected "pt-BR"`);

  // ⚠️ `scope: "/"` would claim the WHOLE ORIGIN — the other half of the same note. A game that claims the
  // origin is a game that cannot sit beside another one, which is precisely where this is heading.
  if (m.scope === '/') falhas.push('manifest.scope is "/" — that claims the whole origin (ADR-0140)');
  if (!m.scope) falhas.push('manifest.scope is missing');

  if (!m.name || !m.short_name) falhas.push('manifest needs both name and short_name');

  // 3 · THE ICON, and that it stayed VECTOR. `docs/LICENSES.md` says there is no drawn asset in this
  //     repository; a raster icon would make that paragraph false, and the paragraph is a licence statement.
  const icons = Array.isArray(m.icons) ? m.icons : [];
  if (!icons.length) falhas.push('manifest declares no icon');
  for (const ic of icons) {
    if (ic.type !== 'image/svg+xml') {
      falhas.push(`icon ${ic.src} is ${ic.type} — LICENSES.md says this repository has no drawn asset`);
    }
    if (!existsSync(join(DIST, ic.src))) falhas.push(`icon ${ic.src} is declared and not in the build`);
  }
}

// 4 · AND THE PRECACHE HAS TO HOLD THE GAME, not just the shell. A service worker that caches `index.html`
//     and nothing else installs cleanly and then fails on the school's second day, offline, with no error.
const sw = existsSync(join(DIST, 'sw.js')) ? readFileSync(join(DIST, 'sw.js'), 'utf8') : '';
for (const [que, padrao] of [['the bundle', /\.js"/], ['the stylesheet', /\.css"/], ['a font', /\.woff2"/]]) {
  if (!padrao.test(sw)) falhas.push(`the precache manifest names no ${que} — offline would be a blank page`);
}

if (falhas.length) {
  for (const f of falhas) console.error(`  ✗ ${f}`);
  console.error(`\n✗ pwa: ${falhas.length} problem(s). README line 5 promises "offline as a PWA".`);
  process.exit(1);
}
console.log('✓ pwa: service worker, manifest (pt-BR, scoped), vector icon, and the game itself precached.');
