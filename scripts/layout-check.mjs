// SPDX-License-Identifier: AGPL-3.0-or-later
//
// THE LAYOUT GATE — does the board actually FIT ON THE SCREEN.
//
// ========================= WHY THIS IS NOT COVERED BY ANYTHING ELSE =========================
// Every existing test asks whether a node EXISTS. `tests/factory.browser.test.ts` builds its own markup and
// asserts the canvas and the grid are in the region; they are. axe asserts the page has no WCAG A/AA
// violation; it has none. Existing and being visible are different questions, and nothing asked the second.
//
// ========================= THE DEFECT THIS WAS BORN ON =========================
// Measured 2026-09-12, on the shipped build. `<main>` is a flex column with `overflow: hidden`, and
// `#stage-wrap` is its ONLY flexible item — so it absorbs the whole excess of its siblings by itself. The
// always-open colour-correction panel asked for 311 px; at 570×415 the wrapper was squeezed to **zero**, the
// 360 px stage overflowed it and was CLIPPED, and half the board sat at y = -180 with no scrollbar to reach
// it. At 1024×768 — a school tablet in landscape — the wrapper was 301 px for a 360 px stage: still cut.
//
// ⚠️ A flex item that shrinks to zero says nothing, and `overflow: hidden` turns the overflow into silence
//    rather than a scrollbar. That pairing is why this went unnoticed: the failure has no symptom a test that
//    queries the DOM can see, and no error anywhere. Only geometry can catch it.
//
// 📌 THIS GATE OUTLIVES ITS DEFECT. It is not "the colour panel must be closed" — it is "whatever the page
//    grows next, the game still fits", which is the property that was actually broken.
import { chromium } from 'playwright';

const URL = process.env.AXE_URL || 'http://localhost:4173/';

// Real targets, not round numbers. Pillar 1 is a school tablet, so landscape 1024×768 is the one that
// matters most; 800×600 is the oldest lab monitor still in service; the portrait pair is the same tablet
// turned, which changes which axis is scarce.
const TELAS = [
  { nome: 'tablet landscape', width: 1024, height: 768 },
  { nome: 'tablet portrait', width: 768, height: 1024 },
  { nome: 'old lab monitor', width: 800, height: 600 },
  { nome: 'laptop', width: 1280, height: 800 },
];

// ⚠️ AND THE LIST STOPS AT 600 px OF HEIGHT FOR A REASON THAT IS NOT "it passes there".
//    📏 Measured 2026-09-12, sweeping heights at 1024 wide after the colour panel moved into an overlay: the
//    board fits down to a viewport of ~520 px and is clipped from ~480 px down (at 480 the stage sits at
//    y = -12; at 415, y = -44). The cause is DIFFERENT from the one this gate was born on and is not the
//    game's: `ui/layout` holds the stage at k = 2 (640×360) instead of stepping down to k = 1 (320×180),
//    which would fit. Nothing in this repository chooses k.
//    📌 So the four screens above are the ones a child actually meets — pillar 1 is a school tablet, and the
//    shortest machine still in service is the 600 px lab monitor. Adding a phone in landscape would make this
//    gate red about somebody else's defect, which is how a gate stops being believed. The measurement is
//    written down here instead, so that the boundary is a known fact rather than an untested edge.

const browser = await chromium.launch();
const problemas = [];
try {
  for (const tela of TELAS) {
    const context = await browser.newContext({ viewport: { width: tela.width, height: tela.height } });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });

    // The same address check the axe gate makes, and for the same reason: a sibling game answering on this
    // port would make every number below a measurement of the wrong application.
    const titulo = await page.title();
    if (!titulo.includes('2048')) {
      console.error(`✗ layout: ${URL} is serving "${titulo}", not this game.`);
      process.exit(2);
    }

    // Wait for the board, not for the page — a labelled cell is the last artifact of the boot chain, and
    // measuring before it exists would measure a layout that has not happened.
    await page.waitForSelector('[role="gridcell"][aria-label]', { timeout: 15_000 });

    const medida = await page.evaluate(() => {
      const caixa = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      };
      return {
        stage: caixa('#stage'),
        wrap: caixa('#stage-wrap'),
        vp: { w: window.innerWidth, h: window.innerHeight },
        // If the document scrolls, clipped content is at least REACHABLE. It does not here, which is what
        // makes the cut permanent — so the gate records which of the two failures it is looking at.
        rolavel: document.documentElement.scrollHeight > window.innerHeight + 1,
      };
    });

    const { stage, wrap, vp, rolavel } = medida;
    const onde = `${tela.nome} ${tela.width}×${tela.height}`;
    if (!stage || !wrap) {
      problemas.push(`${onde}: #stage or #stage-wrap is missing entirely`);
    } else {
      // ⚠️ THE ASSERTION IS THE CHILD'S, NOT THE CSS'S: the whole playing surface is on screen. Half a pixel
      //    of rounding is tolerated; thirty are not.
      const folga = 1;
      if (stage.y < -folga) {
        problemas.push(`${onde}: the board is cut off at the TOP by ${Math.round(-stage.y)} px` +
          `${rolavel ? '' : ' — and the page does not scroll, so it cannot be reached'}`);
      }
      if (stage.bottom > vp.h + folga) {
        problemas.push(`${onde}: the board runs ${Math.round(stage.bottom - vp.h)} px BELOW the viewport` +
          `${rolavel ? '' : ' — and the page does not scroll, so it cannot be reached'}`);
      }
      if (stage.x < -folga || stage.right > vp.w + folga) {
        problemas.push(`${onde}: the board is ${Math.round(Math.max(-stage.x, stage.right - vp.w))} px wider than the screen`);
      }
      // And the direct reading of the flex defect, which names the CAUSE rather than the symptom. It can
      // only fire together with one of the above, so it adds an explanation, never a failure of its own.
      if (wrap.h + folga < stage.h) {
        problemas.push(`${onde}: #stage-wrap collapsed to ${Math.round(wrap.h)} px around a ${Math.round(stage.h)} px stage` +
          ' — a sibling of the stage is taking the height the game needs');
      }
    }
    await context.close();
  }

  if (problemas.length) {
    for (const p of problemas) console.error(`  ✗ ${p}`);
    console.error(`\n✗ layout: the board does not fit on ${problemas.length} measurement(s).`);
    process.exit(1);
  }
  console.log(`✓ layout: the whole board is on screen at all ${TELAS.length} sizes, and nothing clips it.`);
} finally {
  await browser.close();
}
