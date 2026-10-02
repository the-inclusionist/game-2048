// SPDX-License-Identifier: AGPL-3.0-or-later
// THE SENTENCE REALLY REACHES THE LIVE REGION — the last accessibility claim left to close.
//
// ========================= WHY THIS TEST NEEDS A BROWSER =========================
// `tests/narration.node.test.ts` proves WHICH SENTENCE is assembled. This proves that it ARRIVES — and the
// path between the two is not trivial: the engine's `srSay` clears the element, waits for a
// `requestAnimationFrame` and only then writes, on purpose, because that is how a screen reader is forced to
// re-announce repeated text.
//
// ⚠️ And it was exactly that frame that blocked manual verification: in a HIDDEN browser pane
// `requestAnimationFrame` does not run, `#sr-status` stays blank, and the announcement looks broken when it is
// merely waiting. Here the page is alive, so the frame happens — and waiting for the frame is part of the test
// instead of a guessed `setTimeout`.
import { beforeEach, describe, expect, it } from 'vitest';
import { createAnnouncer } from '@the-inclusionist/engine/core/a11y-sr.js';
import { createTranslator } from '@the-inclusionist/engine/core/i18n.js';
import { narrarJogada, narrarSemMovimento } from '../app/js/narration.ts';
import pt from '../app/js/i18n/pt.ts';
import en from '../app/js/i18n/en.ts';
import es from '../app/js/i18n/es.ts';

/** Two frames: one for the `clear`, one for the write. A single one races `.say` itself. */
const doisQuadros = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

// 📏 ONE ROOT'S TRANSLATOR AND ONE ROOT'S ANNOUNCER, built from the engine's own factories (ADR-0232 D4,
// notes CY and CV). The old `srAlert`/`srSay` and the module-level `t`/`setLocale` are gone in 11.0.0: a
// game that writes its own words asks for its own translator (what the engine's root does, under
// `createGame`) and announces through its own announcer. Here, no root — this test proves the path for the
// game's narration without a full shell.
let translator: ReturnType<typeof createTranslator>;
let announcer: ReturnType<typeof createAnnouncer>;

beforeEach(async () => {
  document.body.replaceChildren(); // (not `innerHTML = ''`: same cost, and it does not teach the wrong pattern)
  const status = document.createElement('p');
  status.id = 'sr-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const alerta = document.createElement('p');
  alerta.id = 'sr-alert';
  alerta.setAttribute('role', 'alert');
  alerta.setAttribute('aria-live', 'assertive');
  document.body.append(status, alerta);
  translator = createTranslator();
  translator.registerDict('pt', pt);
  translator.registerDict('en', en);
  translator.registerDict('es', es);
  await translator.init(document);
  announcer = createAnnouncer({ doc: document, raf: window.requestAnimationFrame.bind(window) });
});

const srSay = (text: string) => announcer.say(text);
const srAlert = (text: string) => announcer.alert(text);
const t = (chave: string, params?: Record<string, string | number>) => translator.t(chave, params);
const setLocale = (code: string) => translator.setLocale(code);

const status = () => document.querySelector('#sr-status')!.textContent;
const alerta = () => document.querySelector('#sr-alert')!.textContent;

describe('what the blind child receives reaches the live region', () => {
  it('[Right] the sentence for a merge appears in `#sr-status`, TRANSLATED', async () => {
    srSay(narrarJogada({
      merges: [{ at: 0, exponent: 2 }],
      nascida: { board: [], at: 5, exponent: 1 },
      fim: null,
    }, t));
    await doisQuadros();
    const dito = status() ?? '';
    expect(dito, 'the raw key would leak if the translator did not have this dict').not.toContain('move.');
    expect(dito).toContain('2 e 2 viraram 4');
    expect(dito).toContain('linha 2, coluna 2');
  });

  it('[Boundary] the END of the round goes to the ASSERTIVE region, which interrupts', async () => {
    srAlert(narrarJogada({ merges: [], nascida: null, fim: { chave: 'end.win', maior: 11 } }, t));
    await doisQuadros();
    expect(alerta()).toContain('onze dobras');
    expect(status(), 'the ending must not arrive through the polite region').toBe('');
  });

  it('[Zero] the move that changes nothing is spoken too — silence would be the worst failure mode', async () => {
    srSay(narrarSemMovimento('left', t));
    await doisQuadros();
    expect(status()).toContain('esquerda');
  });

  it('[Cross-check] in SPANISH the same move arrives in Spanish — `setLocale` reaches the translator', async () => {
    await setLocale('es');
    srSay(narrarJogada({ merges: [{ at: 0, exponent: 2 }], nascida: null, fim: null }, t));
    await doisQuadros();
    const dito = status() ?? '';
    expect(dito).toContain('2 y 2 formaron 4');
    expect(dito, 'no Portuguese leaking through').not.toContain('viraram');
    await setLocale('pt');
  });
});
