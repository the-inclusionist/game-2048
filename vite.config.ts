import { defineConfig } from 'vitest/config'; // not 'vite': vitest/config is what types the `test` field
import { playwright } from '@vitest/browser-playwright';
import { VitePWA } from 'vite-plugin-pwa';

// ============================ THE ENGINE COMES FROM THE REGISTRY ============================
// ⚠️ THIS HEADER SAID THE OPPOSITE UNTIL 2026-09-11, and it had been false for five days: it described
// `file:../SP-the-inclusionist-tracer`, an npm symlink into a live folder. The engine has been installed from
// npmjs since 2026-09-06 (ADR-0072) and is pinned exactly — `9.0.0` today, no caret.
//
// The `optimizeDeps.exclude` below OUTLIVED ITS REASON, and it is kept deliberately rather than by
// inattention: the original justification (a linked package under active edit would be pre-bundled stale)
// no longer applies to a pinned tarball. Removing it only changes the DEV SERVER, which this repository's
// gates do not cover — the axe check and the browser suite both run against the built output. So it stays
// until somebody can watch `npm run dev` while deleting it, and this note is what stops the next reader
// believing the line still earns its place.
// ⚠️ TWO TARGETS FROM ONE SOURCE, switched by mode — ADR-0140's whole mechanism.
//
//   · APP (default)  — entry `app/index.html` → `src/standalone.ts`. The engine is BUNDLED, the PWA is on.
//                      This is the standalone build: a development, test, audit and demonstration route, and
//                      NEVER a delivery route to children (ADR-0140 §3).
//   · LIB (`--mode lib`) — entry `src/index.ts`, the `Cartridge`. The engine and the shared render libraries
//                      are EXTERNAL. No HTML, no service worker. This is what gets published.
//
// 🔴 AND CI HAS TO BUILD BOTH. ADR-0140 calls that gate "not optional" in as many words: "a change tested only
// in the app build can break the lib build, and nothing notices until the platform installs it". `npm run
// build` runs both, so the shared workflow's single build step covers them without the caller changing.
const ehLib = process.env.BUILD_MODE === 'lib';

export default defineConfig({
  root: ehLib ? '.' : 'app',
  build: ehLib
    ? {
      outDir: 'dist-lib',
      emptyOutDir: true,
      target: 'es2022',
      lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js' },
      rollupOptions: {
        // ⚠️ EXTERNAL IS THE POINT OF THIS TARGET. One installed engine still travels N times if N bundles
        //    inline it; the cartridge has to emit a bare `@the-inclusionist/engine` specifier and leave the
        //    resolution to whoever consumes it. `pixi.js` goes with it — it is a peer of the engine too, and
        //    a second PixiJS in one page is a bug rather than a fallback.
        external: [/^@the-inclusionist\/engine/, 'pixi.js'],
      },
    }
    : { outDir: '../dist', emptyOutDir: true, target: 'es2022' },
  optimizeDeps: {
    exclude: ['@the-inclusionist/engine'],
    include: ['pixi.js'],
  },

  // ============================ THE PWA, WHICH A LINE OF THE README HAD PROMISED ============================
  // 🔴 README line 5 has said "offline as a PWA" since the repository was scaffolded, over a build with no
  // service worker and no manifest. ADR-0140 names this game BY LINE for it. Pillar 8 is a school machine that
  // is online on the first day and offline afterwards, so the claim was not decoration — it described the
  // delivery a school was told to expect.
  //
  // 📌 THIS IS THE **APP** BUILD'S PWA AND NOT A DELIVERY ROUTE. ADR-0140 §3 draws that line itself: a
  // standalone build exists so this repository can be developed, tested, audited and demonstrated with no
  // platform in existence. Deployed to children it would be a second origin, and every word of ADR-0117 would
  // apply — the cache partitions, and the child's accessibility settings stop following her between games.
  // 📌 NO SERVICE WORKER IN THE LIB BUILD. A cartridge is not a unit of installation (ADR-0117); the platform
  //    owns the one service worker, and a second one inside a chunk would fight it for the same origin.
  plugins: ehLib ? [] : [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'vendor/fonts.css'],
      manifest: {
        name: '2048 · Potência de 2',
        short_name: '2048',
        description: 'Junte peças iguais e dobre até 2048.',
        // ⚠️ `lang` AND `scope` ARE BOTH CALLED OUT IN ADR-0140, because the platformer's manifest gets both
        //    wrong: `scope: "/"` claims the whole origin, and `lang: "en"` mislabels a product delivered in
        //    pt-BR. A wrong `lang` is not cosmetic — it is what a screen reader reads the install prompt with.
        lang: 'pt-BR',
        scope: './',
        start_url: './',
        display: 'standalone',
        background_color: '#0d1018',  // FUNDO_DA_TELA — so the splash is the screen the game opens onto
        theme_color: '#2b3145',       // MOLDURA
        icons: [
          // One vector, every size. `docs/LICENSES.md` says there is no drawn asset in this repository, and a
          // PNG would have made that false in the same commit that made line 5 true.
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The fonts are the heavy half and they are what makes the game readable offline; the engine ships
        // them and `scripts/copy-engine-assets.mjs` puts them in `public/vendor`.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],

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
