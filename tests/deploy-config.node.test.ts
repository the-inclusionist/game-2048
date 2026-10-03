// SPDX-License-Identifier: AGPL-3.0-or-later
//
// D1 FORWARD GATE — `wrangler.toml` carries the four fields CF Pages reads.
//
// ========================= WHY THIS IS A SOURCE GATE =========================
// `wrangler.toml` is only read at deploy — a typo in it gives no error until CF Pages fails to build or,
// worse (the Dev named this one 2026-10-02), the R2 binding looks in the wrong jurisdiction and the Pages
// Function dies with «bucket not found» after a visible deploy. The dashboard is read-only for bindings once
// `wrangler.toml` is present, so the only place a mistake surfaces is in the deploy log.
//
// This gate reads the file at test time and refuses the shapes that produce silent failure. It is small
// because the file is small; what matters is that the four fields nobody can see from the dashboard are
// still what they must be.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(import.meta.dirname, '..');
const WRANGLER = readFileSync(join(RAIZ, 'wrangler.toml'), 'utf8');

describe('D1 — wrangler.toml', () => {
  it('[Cross-check] the slug matches the cartridge, the package and the repository', () => {
    // ADR-0082 §1: the four names agree. `tests/cartridge.node.test.ts` holds three of the four; this is
    // the fourth place. A slug mismatch here would make CF Pages route the wrong project.
    expect(WRANGLER).toMatch(/^name\s*=\s*"game-2048"/m);
  });

  it('[Zero] 🔴 the subpath variable the vite build reads at CF Pages', () => {
    // Vite reads `INCL_BASE` at build time (D2). A missing or misshaped value would make the deployed
    // app resolve its assets against the wrong origin path and 404 on every one of them.
    expect(WRANGLER).toMatch(/^\s*INCL_BASE\s*=\s*"\/game-2048\/"/m);
  });

  it('[Zero] 🔴 the R2 bucket binds under the European jurisdiction', () => {
    // The pitfall the Dev named: without `jurisdiction = "eu"` the binding looks in the global namespace
    // and the Pages Functions deploy fails with «bucket not found» even with the right name and open
    // permissions — measured 2026-10-02 at 19h53. The gate reads the bucket block as one chunk, so a
    // jurisdiction misplaced into a different block will not satisfy it.
    const blocoR2 = WRANGLER.slice(WRANGLER.indexOf('[[r2_buckets]]'));
    expect(blocoR2, 'the R2 block exists').toContain('[[r2_buckets]]');
    expect(blocoR2).toMatch(/binding\s*=\s*"LFS"/);
    expect(blocoR2).toMatch(/bucket_name\s*=\s*"the-inclusionist-lfs"/);
    expect(blocoR2, '📏 the pitfall').toMatch(/jurisdiction\s*=\s*"eu"/);
  });

  it('[Interface] `pages_build_output_dir` points at the APP build, not the cartridge build', () => {
    // ADR-0140 §3: the standalone PWA is the delivery route; the cartridge library is not. CF Pages ships
    // what lands in `dist/`, which is the app build (H8 made both targets land in different folders —
    // `dist/` for the PWA, `dist-lib/` for the cartridge).
    expect(WRANGLER).toMatch(/^pages_build_output_dir\s*=\s*"dist"/m);
  });
});

describe('D3 — <base href="/" /> in app/index.html', () => {
  // ⚠️ STRIP HTML COMMENTS BEFORE MEASURING, same trick H1 and G11 learned. The paragraph above the base
  //    element names it verbatim («`<base href="/" />` points every unqualified relative URL…»), so a plain
  //    regex that sees the raw text matches the comment and misses the tag's absence.
  const BRUTO = readFileSync(join(RAIZ, 'app', 'index.html'), 'utf8');
  const HTML = BRUTO.replace(/<!--[\s\S]*?-->/g, ' ');

  it('[Cross-check] stripping comments left the CODE, not an empty string', () => {
    // A filter that ate everything would make the two assertions below pass by having nothing to measure.
    expect(HTML, 'the <title> survives').toContain('<title>');
    expect(HTML, 'and the prose is gone').not.toContain('ADR-0117');
  });

  it('[Zero] 🔴 the base element points every unqualified URL at the origin root', () => {
    // Without this line, `/vendor/fonts.css` loaded by the engine resolves against the game's SUBPATH
    // (`.../game-2048/vendor/fonts.css`) instead of the shared ORIGIN root — defeating the shared
    // `incl-pesados-v2` cache the pasted guide (ADR-0117) exists for. The engine's `/heavy/<host><path>`
    // path resolves against `document.baseURI`, which this element decides.
    expect(HTML).toMatch(/<base\s+href="\/"\s*\/?>/);
  });

  it('[Interface] and the base appears BEFORE the first stylesheet link', () => {
    // Order matters: a `<link rel="stylesheet" href="/vendor/fonts.css">` written BEFORE `<base>` would
    // resolve against the document URL at parse time, not the base URL. The HTML parser reads elements
    // in document order; the first stylesheet reference must sit after the base to inherit from it.
    const baseAt = HTML.indexOf('<base');
    const linkAt = HTML.indexOf('<link rel="stylesheet"');
    expect(baseAt, 'the base is present').toBeGreaterThan(-1);
    expect(linkAt, 'the first stylesheet is present').toBeGreaterThan(-1);
    expect(baseAt, 'base before any stylesheet').toBeLessThan(linkAt);
  });
});

describe('D7 — functions/heavy/[[path]].ts mirrors the engine\'s current MIRROR_FOLDERS', async () => {
  // 📌 THE DRIFT RISK THE PASTED GUIDE NAMES BY ITS OWN NAME: Pages Functions `esbuild` under CF Pages
  //    treats `@the-inclusionist/engine/platform/heavy-mirror.js` as external, so the function copies the
  //    table verbatim. A silently drifted copy would 404 a whole class of files at run time; this gate
  //    catches it at test time by reading the engine's live table and comparing to the copy.

  const FUNCTION = readFileSync(join(RAIZ, 'functions', 'heavy', '[[path]].ts'), 'utf8');

  // Extract the function's own MIRROR_FOLDERS literal — a tuple-of-tuples. The regex scopes to the array
  // block that assigns the constant, so prose mentions of `MIRROR_FOLDERS` elsewhere do not match.
  const BLOCO = FUNCTION.slice(FUNCTION.indexOf('const MIRROR_FOLDERS'), FUNCTION.indexOf('];', FUNCTION.indexOf('const MIRROR_FOLDERS')));

  // The engine's current table, loaded from its runtime module — same source `require()` in the
  // keep-in-sync note of the function's own header.
  const engineModule = await import('@the-inclusionist/engine/platform/heavy-mirror.js');
  const ENGINE_FOLDERS = engineModule.MIRROR_FOLDERS as ReadonlyArray<readonly [string, string]>;

  it('[Cross-check] the function\'s table and the engine\'s are the same shape', () => {
    expect(ENGINE_FOLDERS.length, 'the engine has entries to compare against').toBeGreaterThan(0);
    expect(BLOCO.length, 'the function has a table literal').toBeGreaterThan(0);
  });

  it('[Zero] 🔴 every (prefix, folder) in the engine appears in the function', () => {
    const faltam: string[] = [];
    for (const [prefix, folder] of ENGINE_FOLDERS) {
      // The literal in the function is written as `['prefix', 'folder']`; match the pair under single OR
      // double quotes, since a future author may swap.
      const esperado = new RegExp(`\\[\\s*['"]${prefix.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}['"]\\s*,\\s*['"]${folder.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}['"]\\s*\\]`);
      if (!esperado.test(BLOCO)) faltam.push(`${prefix} → ${folder}`);
    }
    expect(faltam, 'the function\'s copy is behind the engine').toEqual([]);
  });

  it('[Zero] 🔴 and the function has no entries the engine does not', () => {
    // The reverse — a dead entry the function copies but the engine no longer serves. Measured by counting
    // the function's `[...]` tuples and comparing to the engine's length.
    const tuplasNoFn = [...BLOCO.matchAll(/\[\s*['"]/g)].length;
    expect(tuplasNoFn, 'extra tuples would route to R2 keys that no longer exist').toBe(ENGINE_FOLDERS.length);
  });
});

describe('D4 — no relative `fetch()` or `Texture.from()` paths', () => {
  // 📌 THE PASTED GUIDE'S OWN 🔴 RULE: a relative asset URL in runtime code resolves against the DOCUMENT
  //    URL, not the base URL, so `fetch('./assets/foo.map.txt')` under `/game-2048/` finds it there but
  //    `fetch('assets/foo.map.txt')` or `BaseTexture.from('assets/foo.map.txt')` from a loader at the
  //    origin root hits a 404. The reference implementation (`game-platformer`) measured three of these
  //    in one build; 2048 draws procedurally and should have zero. The gate reads source, not the built
  //    output, because catching a reintroduction is cheaper than catching a 404 in production.
  const SOURCE_FILES = [
    'src/standalone.ts', 'app/js/boot/main.ts',
    'app/js/render/board-canvas.ts', 'app/js/render/palette.ts',
    'app/js/ui/board-dom.ts', 'app/js/ui/tiles-layer.ts',
    'app/js/animation.ts', 'app/js/narration.ts',
  ];

  it('[Zero] 🔴 no runtime fetch of a relative asset URL survives in the shipped source', () => {
    const ofensas: string[] = [];
    for (const arquivo of SOURCE_FILES) {
      const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
      // Fetch of an asset path that is NEITHER absolute (`/x` or `https://x`) NOR built from
      // `import.meta.env.BASE_URL`. Scoped to .json/.txt/.woff2/.png/.svg assets — a `fetch` of a dynamic
      // JSON API is not what this gate exists for.
      const padrao = /fetch\(\s*['"`](?!(?:\/|https?:|\.{0,2}\/.*(?:\$\{import\.meta\.env\.BASE_URL\})))[^'"`]*\.(?:json|txt|png|jpg|svg|woff2|map)['"`]/;
      if (padrao.test(texto)) ofensas.push(arquivo);
    }
    expect(ofensas, 'use `${import.meta.env.BASE_URL}…` instead').toEqual([]);
  });

  it('[Zero] 🔴 no PixiJS `Texture.from` reads a relative URL either', () => {
    // The pasted guide pinned this specific symptom — `PIXI.BaseTexture.from(ATLAS_URL)` where ATLAS_URL
    // was a bare string. Same rule, different loader.
    const ofensas: string[] = [];
    for (const arquivo of SOURCE_FILES) {
      const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
      const padrao = /(?:Base)?Texture\.from\(\s*['"`](?!(?:\/|https?:|\$\{import\.meta\.env\.BASE_URL\}))/;
      if (padrao.test(texto)) ofensas.push(arquivo);
    }
    expect(ofensas, 'procedural rendering is the design — no texture loads').toEqual([]);
  });
});

describe('D2 — vite.config.ts honours INCL_BASE', () => {
  const VITE = readFileSync(join(RAIZ, 'vite.config.ts'), 'utf8');

  it('[Zero] 🔴 `base` is read from `process.env.INCL_BASE` with `/` as the dev-mode default', () => {
    // Without this read, every absolute reference the production build writes resolves against the
    // origin's root and 404s under the subpath — the same measurement game-platformer made before
    // adding this line.
    expect(VITE).toMatch(/base:\s*process\.env\.INCL_BASE\s*\|\|\s*['"]\/['"]/);
  });

  it('[Zero] 🔴 `outDir` mirrors the subpath, so CF Pages finds the files where the browser asks', () => {
    // The pasted guide's own measurement: without the subpath on `outDir`, the same origin served
    // `.../index.html` at the root AND `.../<slug>/assets/*` 404'd. The expression lands
    // `../dist/<subpath>/` for a prod build and `../dist/` for a dev build.
    expect(VITE).toMatch(/outDir:\s*['"]\.\.\/dist['"]\s*\+\s*\(process\.env\.INCL_BASE\s*\|\|\s*['"]['"]/);
  });
});
