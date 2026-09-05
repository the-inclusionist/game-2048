// SPDX-License-Identifier: AGPL-3.0-or-later
// O GATE DE ACESSIBILIDADE — axe-core contra o jogo RODANDO, não contra a fonte.
//
// ========================= POR QUE CONTRA O JOGO RODANDO =========================
// Metade do que este jogo faz de acessibilidade só existe em tempo de execução: os `aria-label` das dezesseis
// células são montados por `ui/board-dom` a partir da declaração, o `role="grid"` e as linhas são criadas em
// JavaScript, e o contraste real depende do CSS resolvido. Um analisador de fonte não veria nada disso.
//
// ========================= ⚠️ E ELE ESPERA O TABULEIRO, NÃO A PÁGINA =========================
// `networkidle` diz que a rede parou; não diz que o jogo bootou. A espera é por uma CÉLULA com rótulo — o
// último artefato da cadeia inteira (idioma registrado → declaração → grade montada → rótulo traduzido).
// Esperar por `#sr-status`, que é markup estático do HTML, deixaria o gate analisar uma página onde o
// tabuleiro ainda não existe e devolver um verde que não olhou para nada.
//
// ========================= O QUE NÃO É EXCLUÍDO, E VALE DIZER =========================
// Nada. A engine exclui o widget do VLibras porque não controla o markup de terceiro; este jogo não carrega
// o widget, então não há uma única exclusão aqui — e um gate sem exceções é o único que não precisa ser lido
// com desconfiança.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const URL = process.env.AXE_URL || 'http://localhost:4173/';

const browser = await chromium.launch();
try {
  // O axe do Playwright exige uma página vinda de um contexto explícito.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('[role="gridcell"][aria-label]', { timeout: 15_000 });

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  if (results.violations.length) {
    console.error(JSON.stringify(results.violations, null, 2));
    console.error(`\n✗ axe: ${results.violations.length} violação(ões) WCAG A/AA.`);
    process.exit(1);
  }
  console.log('✓ axe: 0 violações WCAG A/AA — e sem uma única exclusão.');
} finally {
  await browser.close();
}
