// SPDX-License-Identifier: AGPL-3.0-or-later
//
// ============================ TWO TARGETS FROM ONE SOURCE ============================
// ADR-0140's whole mechanism, wrapped since engine 11.0.0 (ADR-0253, note DV) by
// `defineGameBuild` — one declaration, two commands:
//
//   · `vite build` — the APP: entry `app/index.html` → `src/standalone.ts`. The engine
//     is BUNDLED, the PWA is on. This is the standalone build: a development, test,
//     audit and demonstration route, NEVER a delivery route to children (ADR-0140 §3).
//   · `vite build --mode cartridge` — the CARTRIDGE at `dist-lib/cartridge.js` + `.d.ts`.
//     The engine and shared render libraries are EXTERNAL (handled by the wrapper as
//     regex PREFIXES, so no subpath is accidentally inlined — a defect the chess
//     measured as 35 kB → 74.5 kB when an exact-string external was in place).
//
// 📌 THE SHARED CI RUNS BOTH COMMANDS, after `npm run build`, plus
// `npx inclusionist-check-cartridge` (ADR-0253 §DV). That retires G9's own gate on
// `scripts.build` chaining both targets — the chain is in the WORKFLOW now, not in
// `package.json`. The cartridge-exists assertion (`exports["."]` points at the lib's
// output) stays.
//
// ⚠️ `OPTIMIZEDEPS.EXCLUDE` IS GONE. It outlived its reason since 2026-09-06, kept only
// because the dev server was not under this repository's gates. H6 brought every
// engine import under the pane's own `preview_start` + `test:a11y` coverage, and the
// game-build wrapper now owns the dev-server shape too.
import { defineGameBuild } from '@the-inclusionist/engine/build';
import { playwright } from '@vitest/browser-playwright';
import { VitePWA } from 'vite-plugin-pwa';

export default defineGameBuild({
  cartridge: 'src/index.ts',
  config: {
    // The APP's root — the engine's wrapper flips it to `.` for the cartridge mode.
    root: 'app',
    build: { outDir: '../dist', emptyOutDir: true, target: 'es2022' },

    // ============================ THE PWA FOR THE APP BUILD ============================
    // 🔴 README line 5 has said "offline as a PWA" since the repository was scaffolded.
    // Pillar 8 is a school machine that is online on the first day and offline afterwards,
    // so the claim was not decoration — it described the delivery a school was told to
    // expect.
    //
    // 📌 THIS IS THE APP BUILD'S PWA AND NEVER A DELIVERY ROUTE (ADR-0140 §3). The wrapper
    //    drops this plugin from the cartridge build by itself (via `publicDir: false` and
    //    the plugin-mode gate) — a cartridge is not a unit of installation (ADR-0117).
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'vendor/fonts.css'],
        manifest: {
          name: '2048 · Potência de 2',
          short_name: '2048',
          description: 'Junte peças iguais e dobre até 2048.',
          // ⚠️ `lang` AND `scope` ARE BOTH CALLED OUT IN ADR-0140. A wrong `lang` is not
          //    cosmetic — it is what a screen reader reads the install prompt with.
          lang: 'pt-BR',
          scope: './',
          start_url: './',
          display: 'standalone',
          background_color: '#0d1018',
          theme_color: '#2b3145',
          icons: [
            { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          ],
        },
        workbox: {
          // The fonts are the heavy half and they are what makes the game readable offline.
          // See `scripts/copy-engine-assets.mjs`'s header for the pipeline, and H7's commit
          // for why the engine still asks a consumer to self-host its own faces.
          globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        },
      }),
    ],

    // ============================ VITEST ============================
    // Lives in the same file so one `vite.config.ts` serves build, dev, and test; the
    // engine's wrapper leaves it alone (it only reshapes `root`/`build`/`plugins` by
    // mode). Vitest's own `defineConfig` would widen the type; passing the field here
    // relies on `vite`'s UserConfig accepting the extension — Vitest's docs call this
    // path official.
    test: {
      projects: [
        {
          // PURE LOGIC, and the list is short on purpose: the board rules, the
          // seven-field declaration and the dictionaries. Everything here runs with no
          // DOM — the pressure that keeps the rules of 2048 free of the renderer, and
          // the half a school can audit without a browser.
          test: {
            name: 'node',
            root: import.meta.dirname,
            environment: 'node',
            include: ['tests/**/*.node.test.{js,ts}'],
          },
        },
        {
          // Anything needing a real focus ring or a real canvas: the accessible DOM
          // grid, keyboard navigation, aria-live announcements, and the PixiJS surface.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the engine's wrapper takes a Vite UserConfig; vitest's `test` key is a Vite extension and the two types do not meet without a cast.
  } as any,
});
