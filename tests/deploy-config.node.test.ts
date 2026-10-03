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
