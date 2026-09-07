// SPDX-License-Identifier: AGPL-3.0-or-later
//
// THE ACCESSIBILITY GATE — axe-core against the RUNNING game, not against the source.
//
// ========================= WHY AGAINST THE RUNNING GAME =========================
// Half of what this game does for accessibility only exists at run time: the sixteen cells' `aria-label`s are
// assembled by `ui/board-dom` from the declaration, the `role="grid"` and the rows are created in JavaScript,
// and the real contrast depends on the resolved CSS. A source analyser would see none of it.
//
// ========================= ⚠️ AND IT WAITS FOR THE BOARD, NOT FOR THE PAGE =========================
// `networkidle` says the network went quiet; it does not say the game booted. The wait is for a labelled CELL
// — the last artifact of the whole chain (language registered → declaration answered → grid built → label
// translated). Waiting for `#sr-status`, which is static markup in the HTML, would let the gate analyse a page
// where the board does not exist yet and return a green that looked at nothing.
//
// ========================= WHAT IS NOT EXCLUDED, AND IT IS WORTH SAYING =========================
// Nothing. The engine excludes the VLibras widget because it does not control a third party's markup; this
// game does not load the widget, so there is not one exclusion here — and a gate with no exceptions is the
// only one that does not have to be read suspiciously.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const URL = process.env.AXE_URL || 'http://localhost:4173/';

const browser = await chromium.launch();
try {
  // Playwright's axe builder requires a page from an explicit context.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('[role="gridcell"][aria-label]', { timeout: 15_000 });

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  if (results.violations.length) {
    console.error(JSON.stringify(results.violations, null, 2));
    console.error(`\n✗ axe: ${results.violations.length} WCAG A/AA violation(s).`);
    process.exit(1);
  }
  console.log('✓ axe: 0 WCAG A/AA violations — and not one exclusion.');
} finally {
  await browser.close();
}
