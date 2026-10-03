// SPDX-License-Identifier: AGPL-3.0-or-later
//
// H3 FORWARD GATE — the «no neural voice» decision stays coherent across both halves.
//
// ========================= WHY THIS GATE IS SMALL AND IMPORTANT =========================
// The engine lets a game express the same decision from two sides. On one side it DECLINES through
// `declines.noNeuralVoice: true` — a loud refusal that reaches `engine.problems` if it drifts. On the other
// it SKIPS opt-in through `uses.neuralVoice` (optional; absent means the engine does not load Kokoro). Both
// halves exist for independent reasons, and the engine does not glue them together — a game could coherently
// opt in via `uses.neuralVoice: true` AND decline via `declines.noNeuralVoice: true`, and then the engine
// loads 371 MB of ONNX runtime that the game told it to never speak with.
//
// That is the kind of defect that costs disk and precache budget without changing any visible behaviour,
// which is to say: silently. The gate below asserts the two halves agree, by reading the shell's source.
//
// 📌 It would be nicer if the engine ran this check itself — if the pair «noNeuralVoice: true + uses.neuralVoice:
// true» produced a `problems` line. The engine does not, measured 2026-10-02. This is the game's gate until
// the engine grows one.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SHELL = readFileSync(join(import.meta.dirname, '..', 'src', 'standalone.ts'), 'utf8');

/**
 * Strip comments before measuring — the paragraphs around these fields talk about `uses.neuralVoice` and
 * `noNeuralVoice` at length, so a plain regex would catch the explanation. Same trick the H1 gate uses.
 */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((linha) => linha.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');
}
const CODIGO = semComentarios(SHELL);

describe('H3 — the «no neural voice» decision is said once, with no drift', () => {
  it('[Cross-check] the stripper left the code intact', () => {
    // A filter that ate everything would silence the two assertions below by giving them nothing to look at.
    expect(CODIGO, 'createGame still called').toMatch(/createGame\s*\(/);
    expect(CODIGO.length).toBeLessThan(SHELL.length * 0.6);
    expect(CODIGO, 'the explanatory paragraph is gone').not.toContain('27 MB of ONNX');
  });

  it('[Zero] 🔴 the shell declines neural voice through `declines.noNeuralVoice: true`', () => {
    // The decline MUST be positive (true), not false or absent. If somebody flips it to opt in without
    // moving the matching uses.neuralVoice, the engine still refuses to speak and the loaded runtime is
    // dead weight — the silent defect this gate exists to catch.
    expect(CODIGO).toMatch(/noNeuralVoice\s*:\s*true/);
  });

  it('[Zero] 🔴 and does NOT opt in through `uses.neuralVoice`', () => {
    // The opt-in's absence is the companion to the decline. The two halves describe one decision; a
    // divergence costs precache budget without changing behaviour.
    expect(CODIGO, 'the two halves describe one decision').not.toMatch(/uses\s*:[\s\S]{0,200}neuralVoice/);
  });

  it('[Interface] and the 10.0.0 PT-BR names are gone from the live `declines` block', () => {
    // Belt-and-braces against H3 being reverted by a copy-paste from a 9.x snippet. The H1 forward gate
    // already catches `baixarPesados` as a word; this one catches the shape of `declines`'s member names.
    const bloco = CODIGO.slice(CODIGO.indexOf('declines:'), CODIGO.indexOf('},', CODIGO.indexOf('declines:')));
    expect(bloco).not.toContain('semVozNeural');
    expect(bloco).not.toContain('semAtorDePausa');
    expect(bloco).not.toContain('semAssistenteDePad');
  });

  it('[Interface] and the heavy-downloads switch is spelled `downloadHeavy: false`', () => {
    // 📌 `baixarPesados` was the 10.0.0-era name (note CN). The current spelling IS the rename, and the
    // decision — no 27 MB of ONNX on a school tablet — is unchanged.
    expect(CODIGO).toMatch(/downloadHeavy\s*:\s*false/);
    expect(CODIGO).not.toContain('baixarPesados:');
  });
});

describe('D5 — the three `uses` ports stay closed, and the cartridge says so', () => {
  // 📌 D5 of Part Four: the `uses` opt-in (ADR-0255, note DW) has three ports — `neuralVoice`, `reading`,
  //    `fonts`. 2048 declares none of them. The neural one is already paired with its decline above; this
  //    block covers the other two AND asserts the cartridge records the whole decision in prose.

  const INDEX = readFileSync(join(import.meta.dirname, '..', 'src', 'index.ts'), 'utf8');

  it('[Zero] 🔴 the shell does not opt into `uses.reading` either', () => {
    // Opting in loads ~850 MiB of reading models for the active locale and every available locale
    // (`create-game.js:3419` per the pasted guide). 2048 has no reading flow — the board carries digits,
    // not text to read aloud — so this port stays closed. Noise `uses:` keys for other options are
    // irrelevant: this gate only forbids a `reading` key under `uses`.
    expect(CODIGO).not.toMatch(/uses\s*:[\s\S]{0,200}reading/);
  });

  it('[Zero] ⚠️ and does not declare `uses.fonts` — only engine-free faces are in play', () => {
    // Library fonts are declared via `uses: { fonts: ['Press Start 2P', ...] }` and delivered by
    // `inclusionist-heavy dist --fonts "..."` (note DW). 2048 uses only «Atkinson Hyperlegible», one of
    // the engine's 19 free faces (confirmed by H7's copy pipeline), so no library family is declared.
    expect(CODIGO).not.toMatch(/uses\s*:[\s\S]{0,200}fonts/);
  });

  it('[Interface] and `src/index.ts` records the decision as a typed export, not as absence', () => {
    // The pasted guide's own pattern: a cartridge DECLARES `uses` even when it opts into nothing, so a
    // reader finds the decision rather than an oversight. The declaration below carries the typed
    // nothing, with the three-way breakdown in prose beside it.
    expect(INDEX).toMatch(/export\s+const\s+uses\s*:\s*undefined\s*=\s*undefined/);
    // And the explanation names the three ports so a future opt-in finds the record it is replacing.
    expect(INDEX, 'the port names are catalogued').toMatch(/neuralVoice[\s\S]{0,500}reading[\s\S]{0,500}fonts/);
  });
});
