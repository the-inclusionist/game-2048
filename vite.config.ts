import { defineConfig } from 'vitest/config'; // not 'vite': vitest/config is what types the `test` field
import { playwright } from '@vitest/browser-playwright';

// ============================ THE ENGINE IS A LINKED DEPENDENCY ============================
// `file:../SP-the-inclusionist-tracer` makes npm symlink the engine into node_modules, so this repository
// reads the engine folder LIVE. `optimizeDeps.exclude` states that rather than relying on Vite happening
// not to pre-bundle a linked package.
//
// ⚠️ AND THE REASON IS NOT THE ONE THE CHESS REPOSITORY GIVES ANY MORE. Its config says the exclusion is
// needed because "the engine's `exports` map points at raw `.ts`". That stopped being true on 2026-09-05
// (ADR-0072 §4): the exports now point at `dist-pkg/**`, real `.js` emitted by `tsc`, with `.d.ts` beside
// them. The exclusion stays for a different and smaller reason — the engine is a workspace-shaped
// dependency under active edit, and pre-bundling it would serve a stale copy after every engine change.
export default defineConfig({
  root: 'app',
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2022' },
  optimizeDeps: {
    exclude: ['@the-inclusionist/engine'],
    include: ['pixi.js'],
  },

  test: {
    projects: [
      {
        // PURE LOGIC, and the list is short on purpose: the board rules, the seven-field declaration and
        // the dictionaries. Everything here runs with no DOM — which is also the pressure that keeps the
        // rules of 2048 free of the renderer, and it is the half a school can audit without a browser.
        test: {
          name: 'node',
          root: import.meta.dirname,
          environment: 'node',
          include: ['tests/**/*.node.test.{js,ts}'],
        },
      },
      {
        // Anything needing a real focus ring or a real canvas: the accessible DOM grid, keyboard
        // navigation, the aria-live announcements, and the PixiJS surface underneath them.
        test: {
          name: 'browser',
          root: import.meta.dirname,
          include: ['tests/**/*.browser.test.{js,ts}'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
