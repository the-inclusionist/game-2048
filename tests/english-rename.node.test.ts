// SPDX-License-Identifier: AGPL-3.0-or-later
//
// H1 FORWARD GATE — the old Portuguese names stay out.
//
// ========================= WHY A FORWARD GATE =========================
// H1 was a one-time rename. The risk the gate addresses is REINTRODUCTION: somebody porting a snippet from
// the engine's 9.0.0 era (there are months of them in `git log` of every sibling game), or lifting code from
// an old issue, or writing a type alias from memory — would reach for the Portuguese name because that's what
// the engine documented for two years. The compiler catches a dead IMPORT, but a local variable called
// `correcao` or a comment mentioning `linhasDoEixo` passes typecheck and lives.
//
// This gate reads the source and refuses the old spellings as identifiers, imports or backtick-quoted
// mentions. It is cheap to write and much cheaper than finding the regression a quarter later.
//
// ========================= WHAT IS NOT A HIT =========================
// ⚠️ `data-eixo` and `data-valor` STAY in the DOM — the engine's own `axisRows` writes them (measured
//    2026-10-02 at `render/viz-axes-labels.js:65`), and `buttonChoice(dataset)` reads from them. The sed sweep
//    over-renamed these during H1 and was reverted; this gate holds the revert.
// ⚠️ `nome`/`valor`/`eixo`/`acao`/`rotulo` as PT-BR WORDS inside i18n dictionaries (`app/js/i18n/*.ts`) are
//    not identifiers — they are the words a child reads. Excluded by path.
// ⚠️ Historical prose in README.md / docs / HTML block comments that says «replaced `linhasDoEixo`» or
//    «since 9.0.0 the engine named this `GanchosDoCartucho`» stays — governed by the ADR README's rename
//    trap. H12 handles the sweep decision; this gate only looks at `.ts`.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(import.meta.dirname, '..');

/** Every `.ts` the game is BUILT from, plus the tests. The i18n content files are deliberately out. */
function fontesParaMedir(): string[] {
  const saida: string[] = [];
  const andar = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) andar(caminho);
      else if (caminho.endsWith('.ts')) saida.push(caminho);
    }
  };
  for (const sub of ['src', 'app/js', 'tests']) andar(join(RAIZ, sub));
  // Exclude the i18n content files (PT-BR words, not identifiers) and this gate itself (its PAIRS data
  // table literally names every old spelling — it would flag itself as the regression it exists to catch).
  const i18n = ['app', 'js', 'i18n'];
  const naoEhI18n = (p: string) => !p.includes(i18n.join('\\')) && !p.includes(i18n.join('/'));
  const naoEhOGate = (p: string) => !p.endsWith(`english-rename.node.test.ts`);
  return saida.filter((p) => naoEhI18n(p) && naoEhOGate(p));
}

const arquivos = fontesParaMedir().map((caminho) => ({
  nome: relative(RAIZ, caminho).replace(/\\/g, '/'),
  texto: semComentarios(readFileSync(caminho, 'utf8')),
}));

/**
 * Strip `/* … *\/` block comments and `//` line comments. The ADR README's rename rule says historical
 * sentences — «before 10.0.0 the engine named this `GanchosDoCartucho`» — stay in the file as context. A
 * gate that reads those as regressions trains the reader to delete the history, which is the churn the rule
 * exists to prevent. The CODE answer: measure the code, not the prose that explains it. This is the same
 * trick `tests/visual.node.test.ts`'s Escape block learned the hard way in G11.
 */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    // 🔴 CRLF FIRST, AND IT IS NOT TIDINESS. Measured on 2026-10-03: in a file with CRLF line endings,
    // every assertion below went inert without a word. JavaScript's `.` does NOT match a carriage return — it
    // is a line terminator — so `(^|[^:])//.*$` finds no match on such a line, and NOTHING is stripped. The
    // gate then reads the comments as if they were code. It surfaced as a false positive (a comment naming the
    // forbidden token reddened the gate), which is the lucky direction; a checkout with `core.autocrlf=true`
    // would leave every «this source does not contain X» gate in this repository measuring prose.
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((linha) => linha.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');
}

/**
 * The forbidden identifiers, with the English name they were renamed to. Pairs come from the engine's own
 * `dist-pkg/**` d.ts, measured 2026-10-02 against 11.0.0.
 */
const RENOMEADOS: readonly { antigo: string; novo: string; nota: string }[] = [
  { antigo: 'Correcao', novo: 'Correction', nota: 'CL' },
  { antigo: 'Desenho', novo: 'Drawing', nota: 'CL' },
  { antigo: 'GanchosDoCartucho', novo: 'CartridgeHooks', nota: 'CN' },
  { antigo: 'ROTULO_DA_CORRECAO', novo: 'CORRECTION_LABEL', nota: 'CM' },
  { antigo: 'linhasDoEixo', novo: 'axisRows', nota: 'CM' },
  { antigo: 'escolhaDoBotao', novo: 'buttonChoice', nota: 'CM' },
  { antigo: 'lerCenaGuardada', novo: 'readStoredScene', nota: 'CS' },
  { antigo: 'fabricaComOJogo', novo: 'factoryWithGame', nota: 'DA' },
  { antigo: 'acoesDoJogo', novo: 'gameActions', nota: 'CK' },
  { antigo: 'kbPadraoFor', novo: 'defaultSchemeFor', nota: 'CO' },
  { antigo: 'seguraTeclas', novo: 'holdsKeys', nota: 'CI' },
  { antigo: 'SIMULACOES', novo: 'SIMULATIONS', nota: 'CL' },
  { antigo: 'CORRECOES', novo: 'CORRECTIONS', nota: 'CL' },
  { antigo: 'PADRAO', novo: 'DEFAULT_VISUAL', nota: 'CP' },
  { antigo: 'aplicacao', novo: 'howItApplies', nota: 'CL' },
  { antigo: 'aoFalhar', novo: 'onFailure', nota: 'CI' },
];

describe('H1 — the old Portuguese names never come back', () => {
  it('[Cross-check] the sweep looked at the files the game is built from', () => {
    // A gate that measured zero files is the regression it exists to catch, wearing green.
    expect(arquivos.length).toBeGreaterThan(15);
    expect(arquivos.some((a) => a.nome === 'src/standalone.ts')).toBe(true);
    expect(arquivos.some((a) => a.nome === 'app/js/visual.ts')).toBe(true);
    // And the exclusion of i18n content files actually took effect — those files MUST exist (the dict data)
    // but MUST NOT be in the measured set, because they carry PT-BR words that look like identifiers.
    expect(arquivos.some((a) => a.nome.startsWith('app/js/i18n/'))).toBe(false);
  });

  for (const { antigo, novo, nota } of RENOMEADOS) {
    it(`[Zero] 🔴 \`${antigo}\` → \`${novo}\` (engine note ${nota})`, () => {
      // Word-boundary match: `direct` must not fail on a comment containing `directly`, and `Scene` must
      // not fail on `SceneDescriptor`. The pattern is the identifier, surrounded by non-word on both sides.
      const padrao = new RegExp(`\\b${antigo}\\b`);
      const ofensas = arquivos
        .filter(({ texto }) => padrao.test(texto))
        .map((a) => a.nome);
      expect(ofensas, `${antigo} resurfaced — rename to ${novo}`).toEqual([]);
    });
  }

  // 📌 A SENTINEL STOOD HERE until 2026-10-03: it asserted `src/standalone.ts` read `[data-eixo][data-valor]`
  //    (the engine's own DOM contract for the colour-axis rows) and had not been swept into `[data-axis]`
  //    by H1's rename. E1 of Part Five deleted the shell's colour-vision panel — engine 11.0.0 mounts the
  //    🚥 icon itself — so the selector it guarded no longer exists. The DOM-contract LESSON survives in
  //    this file's header; the assertion had nothing left to read.
});
